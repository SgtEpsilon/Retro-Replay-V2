const { client } = require('../client');
const { events, disabledRoles, saveEvents } = require('../utils/storage');
const { roleConfig } = require('../utils/constants');
const { createEventEmbed } = require('../utils/helpers');

client.on('messageReactionAdd', async (reaction, user) => {
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

  if (disabledRoles.includes(role)) {
    try {
      await reaction.users.remove(user.id);
      await user.send(`⚠️ Sorry, the **${role}** role is currently disabled for signups.`);
    } catch (err) {
      console.error('⚠️ Error handling disabled role reaction:', err.message);
    }
    return;
  }

  let previousEmoji = null;
  for (const [r, users] of Object.entries(ev.signups)) {
    const idx = users.indexOf(user.id);
    if (idx > -1) {
      users.splice(idx, 1);
      previousEmoji = Object.keys(roleConfig).find(e => roleConfig[e] === r);
    }
  }

  if (previousEmoji && previousEmoji !== emoji) {
    try {
      const previousReaction = reaction.message.reactions.cache.get(previousEmoji);
      if (previousReaction) {
        await previousReaction.users.remove(user.id);
      }
    } catch (err) {
      console.error('⚠️ Error removing previous reaction:', err.message);
    }
  }

  if (!ev.signups[role]) ev.signups[role] = [];
  if (!ev.signups[role].includes(user.id)) {
    ev.signups[role].push(user.id);
  }

  saveEvents();

  try {
    const embed = createEventEmbed(ev.title, ev.datetime, ev.signups);
    await reaction.message.edit({ embeds: [embed] });
  } catch (err) {
    console.error('⚠️ Error updating embed on reaction add:', err.message);
  }
});