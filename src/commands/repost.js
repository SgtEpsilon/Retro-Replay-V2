const { hasEventPermission, createEventEmbed } = require('../utils/helpers');
const { getEvents, saveEvents, clearEventTimers, scheduleReminder, scheduleBackupAlert } = require('../utils/storage');
const { SIGNUP_CHANNEL, BAR_STAFF_ROLE_ID, roleConfig } = require('../utils/constants');

async function repostHandler(i) {
  if (!hasEventPermission(i.member))
    return await i.reply({ content: '❌ No permission.', ephemeral: true });

  const events = getEvents(); // ✅ Get live reference

  // Only get events that have been posted to Discord (have a messageId)
  const upcoming = Object.values(events)
    .filter(ev => !ev.cancelled && ev.datetime > Date.now() && ev.messageId)
    .sort((a, b) => a.datetime - b.datetime);

  if (!upcoming.length) {
    return await i.reply({ 
      content: '⚠️ No upcoming posted shifts to repost.\n\n**Note:** Scheduled events that haven\'t been posted to Discord yet cannot be reposted. Use `/post` to post scheduled events first.', 
      ephemeral: true 
    });
  }

  const ev = upcoming[0];

  await i.deferReply({ ephemeral: true });

  try {
    const channel = await i.client.channels.fetch(SIGNUP_CHANNEL);
    
    // Try to fetch and delete the old message
    const oldMessage = await channel.messages.fetch(ev.messageId).catch(() => null);

    if (oldMessage) {
      await oldMessage.delete();
    }

    // Clear timers for the old event
    clearEventTimers(ev.id);
    
    // Store the old event ID for cleanup
    const oldEventId = ev.id;
    
    // Create the new embed
    const embed = createEventEmbed(ev.title, ev.datetime, ev.signups);
    
    const newMsg = await channel.send({
      content: `<@&${BAR_STAFF_ROLE_ID}> Shift reposted!`,
      embeds: [embed]
    });

    // Add reactions
    for (const emoji of Object.keys(roleConfig)) {
      await newMsg.react(emoji);
    }

    // Remove the old event entry
    delete events[oldEventId];

    // Create new event entry with the new message ID
    events[newMsg.id] = {
      ...ev,
      id: newMsg.id,
      messageId: newMsg.id,
      channelId: channel.id,
      scheduled: false // Mark as posted, not scheduled
    };

    // Schedule reminders and alerts for the new message
    scheduleReminder(newMsg.id, i.client);
    scheduleBackupAlert(newMsg.id, i.client);
    
    // ✅ CRITICAL: Save immediately after reposting
    const saved = saveEvents();
    if (!saved) {
      console.error('❌ CRITICAL: Failed to save reposted event!');
      return await i.editReply({
        content: '⚠️ Shift was reposted but there was an error saving the data. Please contact an admin and note the new message ID: ' + newMsg.id
      });
    }

    console.log(`✅ Reposted event: ${ev.title}`);
    console.log(`   Old Message ID: ${oldEventId}`);
    console.log(`   New Message ID: ${newMsg.id}`);

    await i.editReply({
      content: `✅ Shift reposted!\n**${ev.title}**\n🆔 New Message ID: ${newMsg.id}`
    });
  } catch (err) {
    console.error('⚠️ Error reposting event:', err.message);
    console.error('Error stack:', err.stack);
    await i.editReply({
      content: `❌ Failed to repost shift.\n\`\`\`${err.message}\`\`\``
    });
  }
}

module.exports = repostHandler;