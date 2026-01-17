const { hasEventPermission, createEventEmbed } = require('../utils/helpers');
const { events, saveEvents, clearEventTimers, scheduleReminder, scheduleBackupAlert } = require('../utils/storage');
const { SIGNUP_CHANNEL, BAR_STAFF_ROLE_ID, roleConfig } = require('../utils/constants');

async function repostHandler(i) {
  if (!hasEventPermission(i.member))
    return await i.reply({ content: '❌ No permission.', ephemeral: true });

  const upcoming = Object.values(events)
    .filter(ev => !ev.cancelled && ev.datetime > Date.now())
    .sort((a, b) => a.datetime - b.datetime);

  if (!upcoming.length)
    return await i.reply({ content: '⚠️ No upcoming shifts to repost.', ephemeral: true });

  const ev = upcoming[0];

  await i.deferReply({ ephemeral: true });

  try {
    const channel = await i.client.channels.fetch(SIGNUP_CHANNEL);
    const oldMessage = await channel.messages.fetch(ev.id).catch(() => null);

    if (oldMessage) {
      await oldMessage.delete();
    }

    clearEventTimers(ev.id);
    delete events[ev.id];

    const embed = createEventEmbed(ev.title, ev.datetime, ev.signups);
    const newMsg = await channel.send({
      content: `<@&${BAR_STAFF_ROLE_ID}> Shift reposted!`,
      embeds: [embed]
    });

    for (const emoji of Object.keys(roleConfig)) {
      await newMsg.react(emoji);
    }

    events[newMsg.id] = {
      ...ev,
      id: newMsg.id,
      channelId: channel.id
    };

    scheduleReminder(newMsg.id, i.client);
    scheduleBackupAlert(newMsg.id, i.client);
    saveEvents();

    await i.editReply({
      content: `✅ Shift reposted!\n**${ev.title}**\n📍 New Message ID: ${newMsg.id}`
    });
  } catch (err) {
    console.error('⚠️ Error reposting event:', err.message);
    await i.editReply({
      content: '❌ Failed to repost shift.'
    });
  }
}

module.exports = repostHandler;