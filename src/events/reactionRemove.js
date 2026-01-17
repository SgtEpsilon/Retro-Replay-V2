const { client } = require('../client');
const { events, saveEvents } = require('../utils/storage');
const { roleConfig } = require('../utils/constants');
const { createEventEmbed } = require('../utils/helpers');

client.on('messageReactionRemove', async (reaction, user) => {
  if (user.bot) return;

  try {
    if (reaction.partial) {
      await reaction.fetch();
    }
  } catch (err) {
    console.error('⚠️ Error fetching reaction:', err.message);
    return;
  }

  const messageId = reaction.message.id;
  const ev = events[messageId];
  
  if (!ev || ev.cancelled) return;

  const emoji = reaction.emoji.name;
  const role = roleConfig[emoji];

  if (!role) return;

  const users = ev.signups[role] || [];
  const idx = users.indexOf(user.id);
  if (idx > -1) {
    users.splice(idx, 1);
  }

  saveEvents();

  try {
    const embed = createEventEmbed(ev.title, ev.datetime, ev.signups);
    await reaction.message.edit({ embeds: [embed] });
  } catch (err) {
    console.error('⚠️ Error updating embed on reaction remove:', err.message);
  }
});