const { hasEventPermission } = require('../utils/helpers');
const { getEvents, saveEvents, clearEventTimers } = require('../utils/storage');

async function cancelEventHandler(i) {
  if (!hasEventPermission(i.member))
    return await i.reply({ content: '❌ No permission.', ephemeral: true });

  const messageId = i.options.getString('messageid');
  const events = getEvents(); // ✅ Get live reference
  const ev = events[messageId];

  if (!ev)
    return await i.reply({ content: '⚠️ Event not found.', ephemeral: true });

  if (ev.cancelled)
    return await i.reply({ content: '⚠️ Event already cancelled.', ephemeral: true });

  // Mark as cancelled
  ev.cancelled = true;
  
  // Clear all scheduled timers
  clearEventTimers(messageId);
  
  // ✅ CRITICAL: Save immediately after modification
  const saved = saveEvents();
  if (!saved) {
    console.error('❌ CRITICAL: Failed to save event cancellation!');
    return await i.reply({
      content: '⚠️ Error saving cancellation. Please try again or contact an admin.',
      ephemeral: true
    });
  }

  // Update the message in Discord
  try {
    const channel = await i.client.channels.fetch(ev.channelId);
    const message = await channel.messages.fetch(messageId);
    await message.edit({ 
      content: '❌ **This shift has been cancelled.**', 
      embeds: [],
      components: [] // Also clear any buttons/components
    });
    
    console.log(`✅ Event cancelled: ${ev.title} (ID: ${messageId})`);
  } catch (err) {
    console.error('⚠️ Error updating cancelled event message:', err.message);
    // Still return success since the data was saved
  }

  return await i.reply({
    content: `✅ Event cancelled: **${ev.title}**`,
    ephemeral: true
  });
}

module.exports = cancelEventHandler;