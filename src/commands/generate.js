// src/commands/generate.js
const { EmbedBuilder } = require('discord.js');
const { DateTime } = require('luxon');
const config = require('../../config.json');
const { hasEventPermission } = require('../utils/helpers');
const { events, saveEvents } = require('../utils/storage');
const { isBlackoutDate } = require('../utils/helpers');

/**
 * Get the start of the current week (Monday 00:00)
 */
function getWeekStart(now) {
  const dayOfWeek = now.weekday; // 1 = Monday, 7 = Sunday
  const daysToSubtract = dayOfWeek - 1; // Days since Monday
  return now.minus({ days: daysToSubtract }).startOf('day');
}

/**
 * Check what events exist for the current week
 */
function getWeekEvents() {
  const now = DateTime.now().setZone(config.timezone);
  const weekStart = getWeekStart(now);
  const weekEnd = weekStart.plus({ days: 7 });

  const weekEvents = Object.values(events).filter(event => {
    if (event.cancelled) return false;
    const eventTime = DateTime.fromMillis(event.datetime).setZone(config.timezone);
    return eventTime >= weekStart && eventTime < weekEnd;
  });

  // Categorize events
  const scheduled = [];
  const posted = [];

  weekEvents.forEach(event => {
    if (event.messageId) {
      posted.push(event);
    } else {
      scheduled.push(event);
    }
  });

  return { scheduled, posted, total: weekEvents };
}

/**
 * Generate weekly schedule (creates event data only, doesn't post to Discord)
 */
async function generateWeeklySchedule() {
  const now = DateTime.now().setZone(config.timezone);
  const weekStart = getWeekStart(now);

  console.log(`📋 Generating weekly schedule data:`);
  console.log(`   Week starting: ${weekStart.toFormat('yyyy-MM-dd')}`);
  console.log(`   Open days: ${config.openDays.join(', ')}`);

  let eventsCreated = 0;
  const createdEvents = [];

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
      const eventDate = DateTime.fromMillis(event.datetime).setZone(config.timezone);
      return eventDate.toISODate() === dateKey && !event.cancelled;
    });

    if (existingEvent) {
      console.log(`⏭️ Event already exists for ${shiftDay}, ${dateKey}`);
      continue;
    }

    // Create unique ID for the event (will be replaced with messageId when posted)
    const eventId = `scheduled_${Date.now()}_${i}`;
    
    const newEvent = {
      id: eventId,
      title: `🍸 ${shiftDay} Night Shift`,
      shift: `${shiftDay} Night Shift`,
      datetime: shiftTime.toMillis(),
      channelId: null, // Will be set when posted
      messageId: null, // Will be set when posted to Discord
      signups: {},
      cancelled: false,
      scheduled: true // Flag to indicate this is scheduled but not yet posted
    };

    events[eventId] = newEvent;
    createdEvents.push(newEvent);
    eventsCreated++;
    console.log(`✅ Scheduled: ${shiftDay}, ${dateKey} at ${shiftTime.toFormat('h:mm a')}`);
  }

  if (eventsCreated > 0) {
    saveEvents();
    console.log(`💾 Saved ${eventsCreated} scheduled event(s) to scheduled_events.json`);
  }

  return { eventsCreated, createdEvents };
}

/**
 * Handle the /generate command
 */
async function handleGenerate(interaction) {
  try {
    // Check permissions
    if (!hasEventPermission(interaction.member)) {
      return await interaction.reply({
        content: '❌ You do not have permission to use this command. Required roles: ' + config.eventCreatorRoles.join(', '),
        ephemeral: true
      });
    }

    await interaction.deferReply();

    const now = DateTime.now().setZone(config.timezone);
    const weekStart = getWeekStart(now);
    
    // Check existing events
    const { scheduled, posted, total } = getWeekEvents();

    // Build status embed
    const statusEmbed = new EmbedBuilder()
      .setColor('#FFA500')
      .setTitle('📊 Current Week Schedule Status')
      .setDescription(`Week starting: **${weekStart.toFormat('MMMM d, yyyy')}** (${weekStart.toFormat('EEEE')})`)
      .addFields(
        { 
          name: '📅 Scheduled (Not Yet Posted)', 
          value: scheduled.length > 0 
            ? scheduled.map(e => {
                const dt = DateTime.fromMillis(e.datetime).setZone(config.timezone);
                return `• ${dt.toFormat('EEEE, MMM d')} at ${dt.toFormat('h:mm a')}`;
              }).join('\n')
            : 'None',
          inline: false 
        },
        { 
          name: '✅ Posted to Discord', 
          value: posted.length > 0 
            ? posted.map(e => {
                const dt = DateTime.fromMillis(e.datetime).setZone(config.timezone);
                return `• ${e.title || 'Event'} - ${dt.toFormat('EEEE, MMM d')} at ${dt.toFormat('h:mm a')}`;
              }).join('\n')
            : 'None',
          inline: false 
        },
        { 
          name: '📊 Total Events This Week', 
          value: `${total.length} event(s)`,
          inline: false 
        },
        {
          name: '⚙️ Configuration',
          value: `Open Days: ${config.openDays.join(', ')}\nShift Start Time: ${config.shiftStartHour}:00`,
          inline: false
        }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [statusEmbed] });

    // Ask for confirmation
    await interaction.followUp({
      content: `Would you like to generate the weekly schedule now? This will create event data for all **open days** (${config.openDays.join(', ')}) that don't already exist.\n\n**Note:** Events will be saved to scheduled_events.json but NOT posted to Discord yet.\n\n**Type \`yes\` to confirm or \`no\` to cancel.**`,
      ephemeral: true
    });

    // Wait for confirmation
    const filter = m => m.author.id === interaction.user.id && ['yes', 'no'].includes(m.content.toLowerCase());
    
    try {
      const collected = await interaction.channel.awaitMessages({ 
        filter, 
        max: 1, 
        time: 30000, 
        errors: ['time'] 
      });

      const response = collected.first().content.toLowerCase();

      if (response === 'no') {
        return await interaction.followUp({
          content: '❌ Schedule generation cancelled.',
          ephemeral: true
        });
      }

      // Generate schedule
      await interaction.followUp({
        content: '🔄 Generating weekly schedule data...',
        ephemeral: true
      });

      const { eventsCreated, createdEvents } = await generateWeeklySchedule();

      // Get updated count
      const afterGeneration = getWeekEvents();

      const successEmbed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✅ Weekly Schedule Generated')
        .setDescription(`Schedule data created for week starting **${weekStart.toFormat('MMMM d, yyyy')}**\n\n**Note:** Events are saved to \`scheduled_events.json\` and will appear in \`/weeklyschedule\`. They will be posted to Discord automatically at their scheduled times.`)
        .addFields(
          { 
            name: '📈 Before', 
            value: `${total.length} total event(s)`, 
            inline: true 
          },
          { 
            name: '📊 After', 
            value: `${afterGeneration.total.length} total event(s)`, 
            inline: true 
          },
          { 
            name: '➕ New Events', 
            value: `${eventsCreated} event(s) created`, 
            inline: true 
          }
        );

      if (createdEvents.length > 0) {
        successEmbed.addFields({
          name: '📋 Created Events',
          value: createdEvents.map(e => {
            const dt = DateTime.fromMillis(e.datetime).setZone(config.timezone);
            return `• ${dt.toFormat('EEEE, MMM d')} at ${dt.toFormat('h:mm a')}`;
          }).join('\n'),
          inline: false
        });
      }

      successEmbed.setTimestamp();

      await interaction.followUp({ embeds: [successEmbed] });

    } catch (err) {
      await interaction.followUp({
        content: '⏱️ Confirmation timed out. Schedule generation cancelled.',
        ephemeral: true
      });
    }

  } catch (error) {
    console.error('Error in generate command:', error);
    console.error('Error stack:', error.stack);
    
    const errorMessage = { 
      content: `❌ An error occurred while generating the schedule.\n\`\`\`${error.message}\`\`\``, 
      ephemeral: true 
    };
    
    if (interaction.deferred) {
      await interaction.editReply(errorMessage);
    } else {
      await interaction.reply(errorMessage);
    }
  }
}

module.exports = handleGenerate;