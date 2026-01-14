const { EmbedBuilder } = require('discord.js');
const { events } = require('./eventStore');
const { formatEST, buildSignupList } = require('./eventHelpers');

async function updateEmbed(messageId, client) {
  const ev = events[messageId];
  if (!ev) return;

  try {
    const channel = await client.channels.fetch(ev.channelId);
    if (!channel) return;

    const message = await channel.messages.fetch(messageId);

    const embed = new EmbedBuilder()
      .setColor(ev.cancelled ? 0xff0000 : 0x00b0f4)
      .setTitle(ev.title)
      .setDescription(
        ev.cancelled
          ? '❌ **EVENT CANCELLED**'
          : `🕒 **When:** ${formatEST(ev.datetime)} (EST)\n\n${buildSignupList(ev.signups)}`
      )
      .setTimestamp();

    await message.edit({ embeds: [embed] });
  } catch (err) {
    console.error('❌ Failed to update embed:', err.message);
  }
}

module.exports = { updateEmbed };
