// src/commands/post.js
const { EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, ComponentType } = require('discord.js');
const { DateTime } = require('luxon');
const config = require('../../config.json');
const { hasEventPermission, createEventEmbed } = require('../utils/helpers');
const { 
  getEvents,
  saveEvents, 
  scheduleReminder, 
  scheduleBackupAlert 
} = require('../utils/storage');
const { 
  SIGNUP_CHANNEL, 
  BAR_STAFF_ROLE_ID, 
  roleConfig 
} = require('../utils/constants');

/**
 * Get all upcoming scheduled events that haven't been posted yet
 */
function getUpcomingScheduledEvents() {
  const events = getEvents(); // ✅ Get live reference
  const now = Date.now();
  
  return Object.entries(events)
    .filter(([id, event]) => {
      return event.scheduled === true && 
             !event.messageId && 
             !event.cancelled && 
             event.datetime > now; // Only upcoming events
    })
    .sort((a, b) => a[1].datetime - b[1].datetime); // Sort by datetime
}

/**
 * Post a single scheduled event to Discord
 */
async function postEventToDiscord(client, eventId, event) {
  const events = getEvents(); // ✅ Get live reference
  
  try {
    const channel = await client.channels.fetch(SIGNUP_CHANNEL);
    
    if (!channel) {
      throw new Error('Could not fetch signup channel');
    }

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

    console.log(`✅ Posted event: ${event.title} (Message ID: ${msg.id})`);

    return { success: true, messageId: msg.id, event: events[msg.id] };
  } catch (error) {
    console.error(`❌ Error posting event ${eventId}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Handle the /post command
 */
async function handlePost(interaction) {
  try {
    // Check permissions
    if (!hasEventPermission(interaction.member)) {
      return await interaction.reply({
        content: '❌ You do not have permission to use this command. Required roles: ' + config.eventCreatorRoles.join(', '),
        ephemeral: true
      });
    }

    await interaction.deferReply();

    // Get all upcoming scheduled events
    const scheduledEvents = getUpcomingScheduledEvents();

    if (scheduledEvents.length === 0) {
      const noEventsEmbed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('🔭 No Upcoming Scheduled Events')
        .setDescription('There are no upcoming scheduled events waiting to be posted to Discord.')
        .addFields({
          name: 'ℹ️ Info',
          value: 'Use `/createevent` or `/generate` to create scheduled events first.',
          inline: false
        })
        .setTimestamp();

      return await interaction.editReply({ embeds: [noEventsEmbed] });
    }

    // Build list of scheduled events
    const eventList = scheduledEvents.map(([id, event], index) => {
      const dt = DateTime.fromMillis(event.datetime).setZone(config.timezone);
      const eventType = event.manuallyCreated ? '✏️ Manual' : '🤖 Auto';
      const timeUntil = dt.diffNow(['days', 'hours']).toObject();
      const daysText = timeUntil.days >= 1 ? `${Math.floor(timeUntil.days)}d ` : '';
      const hoursText = `${Math.floor(timeUntil.hours % 24)}h`;
      
      return `**${index + 1}.** ${eventType} • ${event.title}\n    📅 ${dt.toFormat('EEEE, MMMM d, yyyy')} at ${dt.toFormat('h:mm a')}\n    ⏰ In ${daysText}${hoursText}`;
    }).join('\n\n');

    const listEmbed = new EmbedBuilder()
      .setColor('#00B0F4')
      .setTitle('📋 Upcoming Scheduled Events')
      .setDescription(`Found **${scheduledEvents.length}** upcoming event(s) ready to post:\n\n${eventList}`)
      .setFooter({ text: 'Select an event below to post it to Discord' })
      .setTimestamp();

    // Create select menu options (max 25)
    const options = scheduledEvents.slice(0, 25).map(([id, event], index) => {
      const dt = DateTime.fromMillis(event.datetime).setZone(config.timezone);
      const eventType = event.manuallyCreated ? '✏️' : '🤖';
      
      return new StringSelectMenuOptionBuilder()
        .setLabel(`${index + 1}. ${event.title}`)
        .setDescription(`${dt.toFormat('EEE, MMM d')} at ${dt.toFormat('h:mm a')} ${eventType}`)
        .setValue(id);
    });

    // Add "Post All" option
    options.push(
      new StringSelectMenuOptionBuilder()
        .setLabel('📤 Post ALL Events')
        .setDescription(`Post all ${scheduledEvents.length} scheduled event(s) to Discord`)
        .setValue('post_all')
    );

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('select_event_to_post')
      .setPlaceholder('Choose an event to post')
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const response = await interaction.editReply({ 
      embeds: [listEmbed],
      components: [row]
    });

    // Wait for selection
    const collector = response.createMessageComponentCollector({ 
      componentType: ComponentType.StringSelect, 
      time: 60000 
    });

    collector.on('collect', async (selectInteraction) => {
      if (selectInteraction.user.id !== interaction.user.id) {
        return await selectInteraction.reply({ 
          content: '❌ This menu is not for you.', 
          ephemeral: true 
        });
      }

      await selectInteraction.deferUpdate();

      const selectedValue = selectInteraction.values[0];

      // Disable the select menu
      selectMenu.setDisabled(true);
      await interaction.editReply({ components: [row] });

      if (selectedValue === 'post_all') {
        // Post all events
        await interaction.followUp({
          content: '📄 Posting all events to Discord...',
          ephemeral: true
        });

        const results = {
          success: [],
          failed: []
        };

        for (const [eventId, event] of scheduledEvents) {
          const result = await postEventToDiscord(interaction.client, eventId, event);
          
          if (result.success) {
            results.success.push({ event, messageId: result.messageId });
          } else {
            results.failed.push({ event, error: result.error });
          }

          // Add delay between posts to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // ✅ CRITICAL: Save all changes at once
        if (results.success.length > 0) {
          const saved = saveEvents();
          if (!saved) {
            console.error('❌ CRITICAL: Failed to save posted events!');
            await interaction.followUp({
              content: '⚠️ Events were posted but there was an error saving the data. Please contact an admin.',
              ephemeral: true
            });
          }
        }

        // Build results embed
        const resultsEmbed = new EmbedBuilder()
          .setColor(results.failed.length > 0 ? '#FFA500' : '#00FF00')
          .setTitle('📤 Posting Complete')
          .setDescription(`Posted ${results.success.length} of ${scheduledEvents.length} event(s) to Discord`)
          .setTimestamp();

        if (results.success.length > 0) {
          const successList = results.success.map(({ event, messageId }) => {
            const dt = DateTime.fromMillis(event.datetime).setZone(config.timezone);
            return `✅ ${event.title}\n   └ ${dt.toFormat('EEE, MMM d')} • Message ID: ${messageId}`;
          }).join('\n\n');

          resultsEmbed.addFields({
            name: `✅ Successfully Posted (${results.success.length})`,
            value: successList.length > 1024 ? successList.substring(0, 1020) + '...' : successList,
            inline: false
          });
        }

        if (results.failed.length > 0) {
          const failedList = results.failed.map(({ event, error }) => {
            const dt = DateTime.fromMillis(event.datetime).setZone(config.timezone);
            return `❌ ${event.title}\n   └ ${dt.toFormat('EEE, MMM d')} • Error: ${error}`;
          }).join('\n\n');

          resultsEmbed.addFields({
            name: `❌ Failed (${results.failed.length})`,
            value: failedList.length > 1024 ? failedList.substring(0, 1020) + '...' : failedList,
            inline: false
          });
        }

        await interaction.followUp({ embeds: [resultsEmbed] });

      } else {
        // Post single event
        const [eventId, event] = scheduledEvents.find(([id]) => id === selectedValue);

        await interaction.followUp({
          content: `📄 Posting **${event.title}** to Discord...`,
          ephemeral: true
        });

        const result = await postEventToDiscord(interaction.client, eventId, event);

        if (result.success) {
          // ✅ CRITICAL: Save immediately after posting
          const saved = saveEvents();
          if (!saved) {
            console.error('❌ CRITICAL: Failed to save posted event!');
            return await interaction.followUp({
              content: '⚠️ Event was posted but there was an error saving the data. Please contact an admin.',
              ephemeral: true
            });
          }

          const dt = DateTime.fromMillis(event.datetime).setZone(config.timezone);
          const successEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('✅ Event Posted Successfully')
            .setDescription(`**${event.title}** has been posted to Discord!`)
            .addFields(
              { name: '📅 Date & Time', value: dt.toFormat('EEEE, MMMM d, yyyy \'at\' h:mm a'), inline: false },
              { name: '🆔 Message ID', value: result.messageId, inline: false },
              { name: '🔗 Channel', value: `<#${SIGNUP_CHANNEL}>`, inline: false }
            )
            .setTimestamp();

          await interaction.followUp({ embeds: [successEmbed] });
        } else {
          const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Failed to Post Event')
            .setDescription(`Could not post **${event.title}** to Discord.`)
            .addFields({
              name: 'Error',
              value: `\`\`\`${result.error}\`\`\``,
              inline: false
            })
            .setTimestamp();

          await interaction.followUp({ embeds: [errorEmbed] });
        }
      }

      collector.stop();
    });

    collector.on('end', (collected, reason) => {
      if (reason === 'time') {
        selectMenu.setDisabled(true);
        interaction.editReply({ 
          components: [row],
          content: '⏱️ Selection timed out. Please run the command again if you want to post events.'
        });
      }
    });

  } catch (error) {
    console.error('Error in post command:', error);
    console.error('Error stack:', error.stack);
    
    const errorMessage = { 
      content: `❌ An error occurred while posting events.\n\`\`\`${error.message}\`\`\``, 
      ephemeral: true 
    };
    
    if (interaction.deferred) {
      await interaction.editReply(errorMessage);
    } else {
      await interaction.reply(errorMessage);
    }
  }
}

module.exports = handlePost;