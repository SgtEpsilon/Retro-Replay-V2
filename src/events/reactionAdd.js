const { client } = require('../client');
const { getEvents, getDisabledRoles, saveEvents } = require('../utils/storage');
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

  const events = getEvents(); // ✅ Get live reference
  const disabledRoles = getDisabledRoles(); // ✅ Get live reference
  
  const messageId = reaction.message.id;
  const ev = events[messageId];
  
  if (!ev || ev.cancelled) return;

  const emoji = reaction.emoji.name;
  const role = roleConfig[emoji];

  if (!role) return;

  // Check if role is disabled
  if (disabledRoles.includes(role)) {
    try {
      await reaction.users.remove(user.id);
      await user.send(`⚠️ Sorry, the **${role}** role is currently disabled for signups.`);
    } catch (err) {
      console.error('⚠️ Error handling disabled role reaction:', err.message);
    }
    return;
  }

  // Remove user from any previous role signups
  let previousEmoji = null;
  for (const [r, users] of Object.entries(ev.signups)) {
    const idx = users.indexOf(user.id);
    if (idx > -1) {
      users.splice(idx, 1);
      previousEmoji = Object.keys(roleConfig).find(e => roleConfig[e] === r);
    }
  }

  // Remove the previous reaction emoji if user switched roles
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

  // Add user to the new role
  if (!ev.signups[role]) ev.signups[role] = [];
  if (!ev.signups[role].includes(user.id)) {
    ev.signups[role].push(user.id);
  }

  // ✅ CRITICAL: Save immediately after signup modification
  const saved = saveEvents();
  if (!saved) {
    console.error('❌ CRITICAL: Failed to save signup change!');
    console.error(`   User: ${user.id}, Role: ${role}, Event: ${messageId}`);
    
    // Try to notify user of the failure
    try {
      await user.send(`⚠️ There was an error saving your signup for **${ev.title}**. Please contact a manager.`);
    } catch (dmErr) {
      // Can't send DM, just log it
      console.error('⚠️ Could not notify user of save failure');
    }
  }

  // Update the embed to reflect the new signups
  try {
    const embed = createEventEmbed(ev.title, ev.datetime, ev.signups);
    await reaction.message.edit({ embeds: [embed] });
  } catch (err) {
    console.error('⚠️ Error updating embed on reaction add:', err.message);
    // Don't fail the operation - data is saved
  }
});