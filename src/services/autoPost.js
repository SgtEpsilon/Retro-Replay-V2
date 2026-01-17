const { DateTime } = require('luxon');
const config = require('../../config.json');
const { 
  TIMEZONE, 
  SIGNUP_CHANNEL, 
  BAR_STAFF_ROLE_ID,
  roleConfig
} = require('../utils/constants');
const { 
  getEvents,
  getAutoPosted,
  saveEvents, 
  saveAutoPosted,
  scheduleReminder,
  scheduleBackupAlert
} = require('../utils/storage');
const { isBlackoutDate, createEventEmbed } = require('../utils/helpers');

// Get the start of the current week (Monday 00:00)
function getWeekStart(now) {
  const dayOfWeek = now.weekday; // 1 = Monday, 7 = Sunday
  const daysToSubtract = dayOfWeek - 1; // Days since Monday
  return now.minus({ days: daysToSubtract }).startOf('day');
}

// Check if we have a schedule for the current week
function hasScheduleForCurrentWeek() {
  const events = getEvents(); // ✅ Get live reference
  const now = DateTime.now().setZone(TIMEZONE);
  const weekStart = getWeekStart(now);
  const weekEnd = weekStart.plus({ days: 7 });

  // Check if we have any events scheduled for this week
  const weekEvents = Object.values(events).filter(event => {
    if (event.cancelled) return false;
    const eventTime = DateTime.fromMillis(event.datetime).setZone(TIMEZONE);
    return eventTime >= weekStart && eventTime < weekEnd;
  });

  return weekEvents.length > 0;
}

// Post scheduled events to Discord
async function postScheduledEvents(client) {
  const events = getEvents(); // ✅ Get live reference
  
  try {
    if (!SIGNUP_CHANNEL) {
      console.error('❌ SIGNUP_CHANNEL_ID not configured in .env');
      return;
    }

    const channel = await client.channels.fetch(SIGNUP_CHANNEL).catch(err => {
      console.error('❌ Cannot access signup channel. Check bot permissions and channel ID.');
      console.error('   Channel ID:', SIGNUP_CHANNEL);
      console.error('   Error:', err.message);
      return null;
    });
    
    if (!channel) return;

    if (!channel.permissionsFor(client.user).has(['SendMessages', 'AddReactions', 'ViewChannel'])) {
      console.error('❌ Bot missing required permissions in signup channel');
      console.error('   Required: View Channel, Send Messages, Add Reactions');
      return;
    }

    const now = DateTime.now().setZone(TIMEZONE);
    let eventsPosted = 0;

    console.log(`📤 Checking for scheduled events to post...`);

    // Find all scheduled events that haven't been posted yet
    const scheduledEvents = Object.entries(events).filter(([id, event]) => {
      return event.scheduled === true && !event.messageId && !event.cancelled;
    });

    if (scheduledEvents.length === 0) {
      console.log(`   No scheduled events to post.`);
      return;
    }

    console.log(`   Found ${scheduledEvents.length} scheduled event(s) to post`);

    for (const [eventId, event] of scheduledEvents) {
      try {
        const eventDate = DateTime.fromMillis(event.datetime).setZone(TIMEZONE);
        console.log(`   Posting: ${event.title} for ${eventDate.toFormat('EEEE, MMM d')}`);

        // Initialize signups if not present
        if (!event.signups || Object.keys(event.signups).length === 0) {
          event.signups = Object.fromEntries(
            Object.values(roleConfig).map(role => [role, []])
          );
        }

        const embed = createEventEmbed(event.title, event.datetime, event.signups);

        const msg = await channel.send({ 
          content: `<@&${BAR_STAFF_ROLE_ID}> New shift posted!`,
          embeds: [embed] 
        });

        for (const emoji of Object.keys(roleConfig)) {
          await msg.react(emoji);
        }

        // Update the event with Discord message info
        delete events[eventId]; // Remove old entry with scheduled ID
        
        events[msg.id] = {
          ...event,
          id: msg.id,
          messageId: msg.id,
          channelId: channel.id,
          scheduled: false // No longer just scheduled
        };

        scheduleReminder(msg.id, client);
        scheduleBackupAlert(msg.id, client);

        eventsPosted++;
        console.log(`   ✅ Posted successfully (Message ID: ${msg.id})`);

        // Add a small delay between posts to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (err) {
        console.error(`   ❌ Error posting event ${eventId}:`, err.message);
      }
    }

    if (eventsPosted > 0) {
      // ✅ CRITICAL: Save immediately after posting
      const saved = saveEvents();
      if (!saved) {
        console.error('❌ CRITICAL: Failed to save posted events!');
      } else {
        console.log(`✅ Posted ${eventsPosted} scheduled event(s) to Discord and saved`);
      }
    }

  } catch (err) {
    console.error('❌ Error posting scheduled events:', err);
  }
}

// Check and post scheduled events (runs at 4 PM EST)
async function checkAndPostScheduledEvents(client) {
  const now = DateTime.now().setZone(TIMEZONE);
  const isPostTime = now.hour === 16; // 4 PM (16:00)
  
  if (isPostTime && now.minute < 10) {
    console.log(`🕓 4 PM posting time reached - checking for scheduled events`);
    await postScheduledEvents(client);
  }
}

// Generate weekly schedule data (creates event entries, doesn't post to Discord)
async function generateWeeklySchedule() {
  const events = getEvents(); // ✅ Get live reference
  const autoPosted = getAutoPosted(); // ✅ Get live reference
  
  const now = DateTime.now().setZone(TIMEZONE);
  const weekStart = getWeekStart(now);

  console.log(`📋 Generating weekly schedule data:`);
  console.log(`   Week starting: ${weekStart.toFormat('yyyy-MM-dd')}`);
  console.log(`   Open days: ${config.openDays.join(', ')}`);

  let eventsCreated = 0;

  // Create event data for the next 7 days
  for (let i = 0; i < 7; i++) {
    const shiftDate = weekStart.plus({ days: i });
    const shiftDay = shiftDate.toFormat('EEEE');
    
    // Skip if not an open day
    if (!config.openDays.includes(shiftDay)) {
      console.log(`⏭️ Skipping ${shiftDay} (not an open day)`);
      continue;
    }

    const shiftTime = shiftDate.set({ 
      hour: config.shiftStartHour, 
      minute: 0, 
      second: 0,
      millisecond: 0
    });

    const dateKey = shiftTime.toISODate();

    // Check if it's a blackout date
    if (isBlackoutDate(shiftTime.toMillis())) {
      console.log(`🚫 Skipping ${dateKey} (blackout date)`);
      continue;
    }

    // Check if event already exists for this day
    const existingEvent = Object.values(events).find(event => {
      const eventDate = DateTime.fromMillis(event.datetime).setZone(TIMEZONE);
      return eventDate.toISODate() === dateKey && !event.cancelled;
    });

    if (existingEvent) {
      console.log(`⏭️ Event already exists for ${shiftDay}, ${dateKey}`);
      continue;
    }

    // Create unique ID for the event
    const eventId = `scheduled_${Date.now()}_${i}`;
    
    events[eventId] = {
      id: eventId,
      title: `🍸 ${shiftDay} Night Shift`,
      shift: `${shiftDay} Night Shift`,
      datetime: shiftTime.toMillis(),
      channelId: null,
      messageId: null,
      signups: {},
      cancelled: false,
      scheduled: true
    };

    eventsCreated++;
    console.log(`✅ Scheduled: ${shiftDay}, ${dateKey} at ${shiftTime.toFormat('h:mm a')}`);
  }

  if (eventsCreated > 0) {
    // ✅ CRITICAL: Save immediately after creating events
    const savedEvents = saveEvents();
    if (!savedEvents) {
      console.error('❌ CRITICAL: Failed to save generated events!');
      return 0;
    }
    
    // Mark this week as having schedule data created
    const weekKey = weekStart.toISODate();
    autoPosted[weekKey] = Date.now();
    const savedAutoPosted = saveAutoPosted();
    
    if (!savedAutoPosted) {
      console.error('⚠️ Warning: Failed to save auto-posted tracking');
    }
    
    console.log(`💾 Saved ${eventsCreated} scheduled event(s) to scheduled_events.json`);
    console.log(`   Week starting: ${weekKey}`);
  }

  return eventsCreated;
}

// Check if schedule needs to be generated
async function checkAndGenerateSchedule(client) {
  const now = DateTime.now().setZone(TIMEZONE);
  const isMonday = now.weekday === 1; // 1 = Monday
  const isMidnight = now.hour === 0;
  
  // Check if we already have a schedule for this week
  if (hasScheduleForCurrentWeek()) {
    if (isMonday && isMidnight && now.minute < 10) {
      console.log(`✅ Schedule already exists for this week, skipping generation.`);
    }
    return;
  }

  // Generate schedule if:
  // 1. It's Monday at midnight (preferred time)
  // 2. OR no schedule exists for the current week (catch-up)
  if ((isMonday && isMidnight && now.minute < 10) || !hasScheduleForCurrentWeek()) {
    console.log(`📄 Generating weekly schedule...`);
    console.log(`   Reason: ${isMonday && isMidnight ? 'Monday midnight scheduled generation' : 'No schedule exists for current week'}`);
    await generateWeeklySchedule();
  }
}

// Schedule hourly checks
function scheduleAutoPost(client) {
  console.log(`⏰ Auto-post scheduler started`);
  console.log(`   Timezone: ${TIMEZONE}`);
  console.log(`   Schedule generation: Monday 00:00 (midnight)`);
  console.log(`   Event posting: Daily 16:00 (4 PM EST)`);
  console.log(`   Shift start hour: ${config.shiftStartHour}`);
  console.log(`   Open days: ${config.openDays.join(', ')}`);
  console.log(`   Current time: ${DateTime.now().setZone(TIMEZONE).toFormat('yyyy-MM-dd HH:mm:ss z')}`);
  
  // Check every 10 minutes
  setInterval(async () => {
    const now = DateTime.now().setZone(TIMEZONE);
    
    // Log hourly checks
    if (now.minute === 0) {
      console.log(`🕐 Hourly check - ${now.toFormat('EEEE HH:mm z')}`);
    }
    
    // Check if schedule needs to be generated (Monday midnight)
    await checkAndGenerateSchedule(client);
    
    // Check if scheduled events need to be posted (4 PM daily)
    await checkAndPostScheduledEvents(client);
    
  }, 10 * 60 * 1000); // Check every 10 minutes
}

module.exports = {
  generateWeeklySchedule,
  scheduleAutoPost,
  checkAndGenerateSchedule,
  checkAndPostScheduledEvents,
  postScheduledEvents
};