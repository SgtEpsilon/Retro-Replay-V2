const { client } = require('../client');
const { getEvents, saveEvents } = require('../utils/storage');
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

  const events = getEvents(); // ✅ Get live reference
  const messageId = reaction.message.id;
  const ev = events[messageId];
  
  if (!ev || ev.cancelled) return;

  const emoji = reaction.emoji.name;
  const role = roleConfig[emoji];

  if (!role) return;

  // Remove user from signup
  const users = ev.signups[role] || [];
  const idx = users.indexOf(user.id);
  if (idx > -1) {
    users.splice(idx, 1);
  }

  // ✅ CRITICAL: Save immediately after signup modification
  const saved = saveEvents();
  if (!saved) {
    console.error('❌ CRITICAL: Failed to save signup removal!');
    console.error(`   User: ${user.id}, Role: ${role}, Event: ${messageId}`);
    
    // Try to notify user of the failure
    try {
      await user.send(`⚠️ There was an error removing your signup from **${ev.title}**. Please contact a manager.`);
    } catch (dmErr) {
      // Can't send DM, just log it
      console.error('⚠️ Could not notify user of save failure');
    }
  }

  // Update the embed to reflect the removed signup
  try {
    const embed = createEventEmbed(ev.title, ev.datetime, ev.signups);
    await reaction.message.edit({ embeds: [embed] });
  } catch (err) {
    console.error('⚠️ Error updating embed on reaction remove:', err.message);
    // Don't fail the operation - data is saved
  }
});