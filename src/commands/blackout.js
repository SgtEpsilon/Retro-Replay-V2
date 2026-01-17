const { DateTime } = require('luxon');
const { TIMEZONE } = require('../utils/constants');
const { hasEventPermission } = require('../utils/helpers');
const { blackoutDates, saveBlackoutDates } = require('../utils/storage');

async function add(i) {
  if (!hasEventPermission(i.member))
    return await i.reply({ content: '❌ No permission.', ephemeral: true });

  const dateStr = i.options.getString('date');
  const dt = DateTime.fromFormat(dateStr, 'dd-mm-yyyy', { zone: TIMEZONE });

  if (!dt.isValid)
    return await i.reply({ content: '❌ Invalid date format. Use DD-MM-YYYY', ephemeral: true });

  // Store in ISO format for consistency
  const isoDate = dt.toISODate();

  if (blackoutDates.includes(isoDate))
    return await i.reply({ content: '⚠️ Date already in blackout list.', ephemeral: true });

  blackoutDates.push(isoDate);
  saveBlackoutDates();

  return await i.reply({ content: `✅ Added blackout date: ${dateStr} (${isoDate})`, ephemeral: true });
}

async function remove(i) {
  if (!hasEventPermission(i.member))
    return await i.reply({ content: '❌ No permission.', ephemeral: true });

  const dateStr = i.options.getString('date');
  const dt = DateTime.fromFormat(dateStr, 'DD-mm-yyyy', { zone: TIMEZONE });

  if (!dt.isValid)
    return await i.reply({ content: '❌ Invalid date format. Use DD-MM-YYYY', ephemeral: true });

  // Convert to ISO format to match stored format
  const isoDate = dt.toISODate();
  const idx = blackoutDates.indexOf(isoDate);

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
  
  // Convert ISO dates to DD-MM-YYYY for display
  const formatted = sorted.map(d => {
    const dt = DateTime.fromISO(d, { zone: TIMEZONE });
    return `• ${dt.toFormat('dd-mm-yyyy')} (${d})`;
  });
  
  return await i.reply({
    content: `📅 **Blackout Dates:**\n${formatted.join('\n')}`,
    ephemeral: true
  });
}

module.exports = { add, remove, list };