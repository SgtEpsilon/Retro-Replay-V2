const { getEvents } = require('../utils/storage');
const { createEventEmbed } = require('../utils/helpers');

async function refreshHandler(i) {
  const events = getEvents(); // ✅ Get live reference
  const messageId = i.options.getString('messageid');
  const ev = events[messageId];

  if (!ev)
    return await i.reply({ content: '⚠️ Event not found.', ephemeral: true });

  try {
    const channel = await i.client.channels.fetch(ev.channelId);
    const message = await channel.messages.fetch(messageId);
    const embed = createEventEmbed(ev.title, ev.datetime, ev.signups);
    await message.edit({ embeds: [embed] });

    return await i.reply({
      content: '✅ Event embed refreshed!',
      ephemeral: true
    });
  } catch (err) {
    console.error('⚠️ Error refreshing event:', err.message);
    return await i.reply({
      content: '❌ Failed to refresh event. Check message ID.',
      ephemeral: true
    });
  }
}

module.exports = refreshHandler;