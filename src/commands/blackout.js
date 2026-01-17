const { DateTime } = require('luxon');
const { TIMEZONE } = require('../utils/constants');
const { hasEventPermission } = require('../utils/helpers');
const { blackoutDates, saveBlackoutDates } = require('../utils/storage');

async function add(i) {
  if (!hasEventPermission(i.member))
    return await i.reply({ content: '❌ No permission.', ephemeral: true });

  const dateStr = i.options.getString('date');
  const dt = DateTime.fromISO(dateStr, { zone: TIMEZONE });

  if (!dt.isValid)
    return await i.reply({ content: '❌ Invalid date format. Use YYYY-MM-DD', ephemeral: true });

  if (blackoutDates.includes(dateStr))
    return await i.reply({ content: '⚠️ Date already in blackout list.', ephemeral: true });

  blackoutDates.push(dateStr);
  saveBlackoutDates();

  return await i.reply({ content: `✅ Added blackout date: ${dateStr}`, ephemeral: true });
}

async function remove(i) {
  if (!hasEventPermission(i.member))
    return await i.reply({ content: '❌ No permission.', ephemeral: true });

  const dateStr = i.options.getString('date');
  const idx = blackoutDates.indexOf(dateStr);

  if (idx === -1)
    return await i.reply({ content: '⚠️ Date not found in blackout list.', ephemeral: true });

  blackoutDates.splice(idx, 1);
  saveBlackoutDates();

  return await i.reply({ content: `✅ Removed blackout date: ${dateStr}`, ephemeral: true });
}

async function list(i) {
  if (!blackoutDates.length)
    return await i.reply({ content: '📅 No blackout dates set.', ephemeral: true });

  const sorted = blackoutDates.sort();
  return await i.reply({
    content: `📅 **Blackout Dates:**\n${sorted.map(d => `• ${d}`).join('\n')}`,
    ephemeral: true
  });
}

module.exports = { add, remove, list };