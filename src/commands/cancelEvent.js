const { hasEventPermission } = require('../utils/helpers');
const { events, saveEvents, clearEventTimers } = require('../utils/storage');

async function cancelEventHandler(i) {
  if (!hasEventPermission(i.member))
    return await i.reply({ content: '❌ No permission.', ephemeral: true });

  const messageId = i.options.getString('messageid');
  const ev = events[messageId];

  if (!ev)
    return await i.reply({ content: '⚠️ Event not found.', ephemeral: true });

  if (ev.cancelled)
    return await i.reply({ content: '⚠️ Event already cancelled.', ephemeral: true });

  ev.cancelled = true;
  clearEventTimers(messageId);
  saveEvents();

  try {
    const channel = await i.client.channels.fetch(ev.channelId);
    const message = await channel.messages.fetch(messageId);
    await message.edit({ content: '❌ **This shift has been cancelled.**', embeds: [] });
  } catch (err) {
    console.error('⚠️ Error updating cancelled event message:', err.message);
  }

  return await i.reply({
    content: `✅ Event cancelled: ${ev.title}`,
    ephemeral: true
  });
}

module.exports = cancelEventHandler;