const { DateTime } = require('luxon');
const { config, TIMEZONE } = require('../utils/constants');

async function areWeOpenHandler(i) {
  const today = DateTime.now().setZone(TIMEZONE).toFormat('EEEE');
  const isOpen = config.openDays.includes(today);

  return await i.reply({
    content: isOpen
      ? `✅ Yes! The bar is open today (${today}).`
      : `❌ No, the bar is closed today (${today}).\n📅 Open days: ${config.openDays.join(', ')}`,
    ephemeral: true
  });
}

module.exports = areWeOpenHandler;