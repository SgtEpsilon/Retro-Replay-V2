const { events, saveEvents } = require('../services/eventStore');
const { roleConfig } = require('../services/eventHelpers');
const { updateEmbed } = require('../services/updateEmbed');

module.exports = {
  add: async (reaction, user) => {
    if (user.bot) return;
    const ev = events[reaction.message.id];
    const role = roleConfig[reaction.emoji.name];
    if (!ev || !role || ev.cancelled) return;

    ev.signups[role] ??= [];
    if (!ev.signups[role].includes(user.id))
      ev.signups[role].push(user.id);

    saveEvents();
    updateEmbed(reaction.message.id);
  },

  remove: async (reaction, user) => {
    if (user.bot) return;
    const ev = events[reaction.message.id];
    const role = roleConfig[reaction.emoji.name];
    if (!ev || !role || ev.cancelled) return;

    ev.signups[role] =
      (ev.signups[role] || []).filter(id => id !== user.id);

    saveEvents();
    updateEmbed(reaction.message.id);
  }
};
