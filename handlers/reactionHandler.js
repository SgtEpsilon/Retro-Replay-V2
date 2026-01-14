const { events, saveEvents } = require('../services/eventStore');
const { roleConfig } = require('../services/eventHelpers');
const { updateEmbed } = require('../services/updateEmbed');
const { canSignup } = require('../services/signupRules');

module.exports = {
  add: async (reaction, user) => {
    if (user.bot) return;

    try {
      // 🔑 Required for older / uncached messages
      if (reaction.partial) {
        await reaction.fetch();
      }

      const ev = events[reaction.message.id];
      const signupRole = roleConfig[reaction.emoji.name];

      if (!ev || !signupRole || ev.cancelled) return;

      const member = await reaction.message.guild.members.fetch(user.id);

      // Permission check (dynamic signup rules)
      if (!canSignup(member, signupRole)) {
        try {
          await reaction.users.remove(user.id);
        } catch {}
        return;
      }

      ev.signups[signupRole] ??= [];

      if (!ev.signups[signupRole].includes(user.id)) {
        ev.signups[signupRole].push(user.id);
        saveEvents();
        await updateEmbed(reaction.message.id, reaction.client);
      }

    } catch (err) {
      console.error('❌ Reaction add failed:', err.message);
    }
  },

  remove: async (reaction, user) => {
    if (user.bot) return;

    try {
      // 🔑 Required for uncached reactions
      if (reaction.partial) {
        await reaction.fetch();
      }

      const ev = events[reaction.message.id];
      const signupRole = roleConfig[reaction.emoji.name];

      if (!ev || !signupRole) return;

      // Removal is unconditional
      ev.signups[signupRole] =
        (ev.signups[signupRole] || []).filter(id => id !== user.id);

      saveEvents();
      await updateEmbed(reaction.message.id, reaction.client);

    } catch (err) {
      console.error('❌ Reaction remove failed:', err.message);
    }
  }
};
