const { DateTime } = require('luxon');
const { 
  TIMEZONE, 
  AUTO_POST_HOUR, 
  SHIFT_START_HOUR, 
  SIGNUP_CHANNEL, 
  BAR_STAFF_ROLE_ID,
  roleConfig,
  config
} = require('../utils/constants');
const { 
  events, 
  autoPosted, 
  saveEvents, 
  saveAutoPosted,
  scheduleReminder,
  scheduleBackupAlert
} = require('../utils/storage');
const { isBlackoutDate, createEventEmbed } = require('../utils/helpers');

// Check for duplicate shift
async function checkForDuplicateShift(channel, shiftDate, client) {
  try {
    const messages = await channel.messages.fetch({ limit: 100 });
    const shiftDay = DateTime.fromMillis(shiftDate).setZone(TIMEZONE).toFormat('EEEE');
    const expectedTitle = `🍸 ${shiftDay} Night Shift`;
    
    for (const [id, message] of messages) {
      if (message.author.id === client.user.id && message.embeds.length > 0) {
        const embed = message.embeds[0];
        
        if (embed.title === expectedTitle) {
          const existingEvent = events[id];
          if (existingEvent && !existingEvent.cancelled) {
            const existingDate = DateTime.fromMillis(existingEvent.datetime).setZone(TIMEZONE).toISODate();
            const newDate = DateTime.fromMillis(shiftDate).setZone(TIMEZONE).toISODate();
            
            if (existingDate === newDate) {
              console.log(`✅ Shift for ${shiftDay} (${newDate}) already exists (Message ID: ${id})`);
              return true;
            }
          }
        }
      }
    }
    
    return false;
  } catch (err) {
    console.error('⚠️ Error checking for duplicate shift:', err.message);
    return false;
  }
}

// Auto-post weekly shifts
async function autoPostWeeklyShifts(client) {
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
    const today = now.toFormat('EEEE');
    const dateKey = now.toISODate();

    if (!config.openDays.includes(today)) {
      console.log(`⏭️ Today (${today}) is not an open day, skipping auto-post.`);
      return;
    }

    if (autoPosted[dateKey]) {
      console.log(`✅ Already auto-posted for ${dateKey}`);
      return;
    }

    if (isBlackoutDate(now.toMillis())) {
      console.log(`🚫 Today (${dateKey}) is a blackout date, skipping auto-post.`);
      return;
    }

    const shiftTime = now.set({ 
      hour: SHIFT_START_HOUR, 
      minute: 0, 
      second: 0,
      millisecond: 0
    });

    console.log(`📋 Creating shift for ${today}:`);
    console.log(`   Current time: ${now.toFormat('yyyy-MM-dd HH:mm:ss z')}`);
    console.log(`   Shift time: ${shiftTime.toFormat('yyyy-MM-dd HH:mm:ss z')}`);
    console.log(`   Shift start hour from config: ${SHIFT_START_HOUR}`);

    const isDuplicate = await checkForDuplicateShift(channel, shiftTime.toMillis(), client);
    if (isDuplicate) {
      console.log(`⏭️ Shift for ${today} (${dateKey}) already posted, skipping duplicate.`);
      autoPosted[dateKey] = Date.now();
      saveAutoPosted();
      return;
    }

    const title = `🍸 ${today} Night Shift`;
    const signups = Object.fromEntries(
      Object.values(roleConfig).map(role => [role, []])
    );

    const embed = createEventEmbed(title, shiftTime.toMillis(), signups);

    const msg = await channel.send({ 
      content: `<@&${BAR_STAFF_ROLE_ID}> New shift posted!`,
      embeds: [embed] 
    });

    for (const emoji of Object.keys(roleConfig)) {
      await msg.react(emoji);
    }

    events[msg.id] = {
      id: msg.id,
      title,
      datetime: shiftTime.toMillis(),
      channelId: channel.id,
      signups,
      cancelled: false
    };

    scheduleReminder(msg.id, client);
    scheduleBackupAlert(msg.id, client);

    saveEvents();
    
    autoPosted[dateKey] = Date.now();
    saveAutoPosted();

    console.log(`✅ Auto-posted shift for ${today}, ${dateKey}`);
  } catch (err) {
    console.error('❌ Auto-post error:', err);
  }
}

// Schedule auto-post
function scheduleAutoPost(client) {
  console.log(`⏰ Auto-post scheduler started`);
  console.log(`   Timezone: ${TIMEZONE}`);
  console.log(`   Auto-post hour: ${AUTO_POST_HOUR}`);
  console.log(`   Shift start hour: ${SHIFT_START_HOUR}`);
  console.log(`   Current time: ${DateTime.now().setZone(TIMEZONE).toFormat('yyyy-MM-dd HH:mm:ss z')}`);
  
  setInterval(async () => {
    const now = DateTime.now().setZone(TIMEZONE);
    
    if (now.minute === 0) {
      console.log(`🕐 Hourly check - Current time: ${now.toFormat('HH:mm z')} | Looking for hour: ${AUTO_POST_HOUR}`);
    }
    
    if (now.hour === AUTO_POST_HOUR && now.minute < 10) {
      console.log(`✅ Auto-post hour reached! Running auto-post at ${now.toFormat('yyyy-MM-dd HH:mm:ss z')}`);
      await autoPostWeeklyShifts(client);
    }
  }, 10 * 60 * 1000);
}

module.exports = {
  autoPostWeeklyShifts,
  scheduleAutoPost
};