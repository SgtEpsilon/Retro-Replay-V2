const { DateTime } = require('luxon');
const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType } = require('discord.js');
const config = require('../../config.json');
const { hasEventPermission } = require('../utils/helpers');
const { generateWeeklySchedule } = require('../services/autoPost');
const { getEvents } = require('../utils/storage');

// Get the start of the current week (Monday 00:00)
function getWeekStart(now) {
  const dayOfWeek = now.weekday; // 1 = Monday, 7 = Sunday
  const daysToSubtract = dayOfWeek - 1; // Days since Monday
  return now.minus({ days: daysToSubtract }).startOf('day');
}

// Get all events for the current week
function getWeekEvents() {
  const events = getEvents(); // ✅ Get live reference
  const now = DateTime.now().setZone(config.timezone);
  const weekStart = getWeekStart(now);
  const weekEnd = weekStart.plus({ days: 7 });

  return Object.values(events).filter(event => {
    if (event.cancelled) return false;
    const eventTime = DateTime.fromMillis(event.datetime).setZone(config.timezone);
    return eventTime >= weekStart && eventTime < weekEnd;
  });
}

// Get scheduled events (not yet posted to Discord)
function getScheduledEvents() {
  const events = getEvents(); // ✅ Get live reference
  const now = DateTime.now().setZone(config.timezone);
  const weekStart = getWeekStart(now);
  const weekEnd = weekStart.plus({ days: 7 });

  return Object.values(events).filter(event => {
    if (event.cancelled) return false;
    if (!event.scheduled || event.messageId) return false; // Must be scheduled and not posted
    const eventTime = DateTime.fromMillis(event.datetime).setZone(config.timezone);
    return eventTime >= weekStart && eventTime < weekEnd;
  });
}

// Get posted events (already in Discord)
function getPostedEvents() {
  const events = getEvents(); // ✅ Get live reference
  const now = DateTime.now().setZone(config.timezone);
  const weekStart = getWeekStart(now);
  const weekEnd = weekStart.plus({ days: 7 });

  return Object.values(events).filter(event => {
    if (event.cancelled) return false;
    if (!event.messageId) return false; // Must have been posted to Discord
    const eventTime = DateTime.fromMillis(event.datetime).setZone(config.timezone);
    return eventTime >= weekStart && eventTime < weekEnd;
  });
}

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
    const weekEnd = weekStart.plus({ days: 7 });

    // Get current week's events
    const weekEvents = getWeekEvents();
    const scheduledEvents = getScheduledEvents();
    const postedEvents = getPostedEvents();

    // Build status embed
    const statusEmbed = new EmbedBuilder()
      .setColor('#FFA500')
      .setTitle('📋 Weekly Schedule Status')
      .setDescription(`Current week: **${weekStart.toFormat('MMM d')}** - **${weekEnd.minus({ days: 1 }).toFormat('MMM d, yyyy')}**`)
      .addFields(
        {
          name: '📊 Current Status',
          value: `Total Events: **${weekEvents.length}**\nScheduled (not posted): **${scheduledEvents.length}**\nPosted (in Discord): **${postedEvents.length}**`,
          inline: false
        },
        {
          name: '🗓️ Open Days',
          value: config.openDays.join(', '),
          inline: true
        },
        {
          name: '🕒 Shift Start Time',
          value: `${config.shiftStartHour}:00 (${config.shiftStartHour > 12 ? config.shiftStartHour - 12 : config.shiftStartHour} ${config.shiftStartHour >= 12 ? 'PM' : 'AM'})`,
          inline: true
        }
      )
      .setTimestamp();

    // Show scheduled events if any exist
    if (scheduledEvents.length > 0) {
      const scheduledList = scheduledEvents
        .sort((a, b) => a.datetime - b.datetime)
        .map(event => {
          const dt = DateTime.fromMillis(event.datetime).setZone(config.timezone);
          const eventType = event.manuallyCreated ? '✏️ Manual' : '🤖 Auto';
          return `${eventType} • ${event.title} - ${dt.toFormat('EEE, MMM d')}`;
        })
        .join('\n');

      statusEmbed.addFields({
        name: '📅 Scheduled Events (Not Yet Posted)',
        value: scheduledList.length > 1024 ? scheduledList.substring(0, 1020) + '...' : scheduledList,
        inline: false
      });
    }

    // Show posted events if any exist
    if (postedEvents.length > 0) {
      const postedList = postedEvents
        .sort((a, b) => a.datetime - b.datetime)
        .map(event => {
          const dt = DateTime.fromMillis(event.datetime).setZone(config.timezone);
          return `✅ ${event.title} - ${dt.toFormat('EEE, MMM d')}`;
        })
        .join('\n');

      statusEmbed.addFields({
        name: '✅ Posted Events (In Discord)',
        value: postedList.length > 1024 ? postedList.substring(0, 1020) + '...' : postedList,
        inline: false
      });
    }

    // Check if schedule already exists
    if (weekEvents.length > 0) {
      statusEmbed.addFields({
        name: '⚠️ Warning',
        value: `A schedule already exists for this week with **${weekEvents.length}** event(s).\n\nGenerating again will create **duplicate** events. Are you sure you want to continue?`,
        inline: false
      });
    } else {
      statusEmbed.addFields({
        name: '✅ Ready',
        value: 'No schedule exists for this week. Ready to generate!',
        inline: false
      });
    }

    // Create confirmation buttons
    const confirmButton = new ButtonBuilder()
      .setCustomId('confirm_generate')
      .setLabel('✅ Generate Schedule')
      .setStyle(ButtonStyle.Success);

    const cancelButton = new ButtonBuilder()
      .setCustomId('cancel_generate')
      .setLabel('❌ Cancel')
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

    const response = await interaction.editReply({
      embeds: [statusEmbed],
      components: [row]
    });

    // Wait for button click
    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60000
    });

    collector.on('collect', async (buttonInteraction) => {
      if (buttonInteraction.user.id !== interaction.user.id) {
        return await buttonInteraction.reply({
          content: '❌ This button is not for you.',
          ephemeral: true
        });
      }

      await buttonInteraction.deferUpdate();

      if (buttonInteraction.customId === 'cancel_generate') {
        // Disable buttons
        confirmButton.setDisabled(true);
        cancelButton.setDisabled(true);

        await interaction.editReply({
          content: '❌ Schedule generation cancelled.',
          embeds: [],
          components: [row]
        });

        collector.stop();
        return;
      }

      if (buttonInteraction.customId === 'confirm_generate') {
        // Disable buttons
        confirmButton.setDisabled(true);
        cancelButton.setDisabled(true);

        await interaction.editReply({
          content: '⏳ Generating weekly schedule...',
          embeds: [],
          components: [row]
        });

        // Generate schedule
        const eventsCreated = await generateWeeklySchedule();

        const resultEmbed = new EmbedBuilder()
          .setColor(eventsCreated > 0 ? '#00FF00' : '#FFA500')
          .setTitle(eventsCreated > 0 ? '✅ Schedule Generated' : 'ℹ️ Generation Complete')
          .setDescription(
            eventsCreated > 0
              ? `Successfully created **${eventsCreated}** scheduled event(s) for the week of **${weekStart.toFormat('MMM d, yyyy')}**.`
              : 'No new events were created. This may be because:\n• Events already exist for all open days\n• All open days are blackout dates\n• The week has already passed'
          )
          .setTimestamp();

        if (eventsCreated > 0) {
          resultEmbed.addFields(
            {
              name: '📝 Next Steps',
              value: '• Events are saved to `scheduled_events.json` 🛡️\n• View them with `/weeklyschedule`\n• They will auto-post at **4 PM EST** daily\n• Or use `/post` to post them immediately',
              inline: false
            }
          );
        }

        await interaction.editReply({
          content: null,
          embeds: [resultEmbed],
          components: []
        });

        collector.stop();
      }
    });

    collector.on('end', (collected, reason) => {
      if (reason === 'time') {
        confirmButton.setDisabled(true);
        cancelButton.setDisabled(true);

        interaction.editReply({
          content: '⏱️ Command timed out. Please run `/generate` again if you want to generate the schedule.',
          components: [row]
        });
      }
    });

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