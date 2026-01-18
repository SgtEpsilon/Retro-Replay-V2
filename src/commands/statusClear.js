const { hasEventPermission } = require('../utils/helpers');
const { setCustomStatus } = require('../utils/storage');
const { resumeCycle } = require('../utils/statusManager');

async function statusClearHandler(i) {
  if (!hasEventPermission(i.member))
    return await i.reply({ content: '❌ No permission.', ephemeral: true });

  // Clear stored custom status
  setCustomStatus(null);

  // 🔄 Resume automatic preset cycling
  resumeCycle(i.client);

  return await i.reply({
    content: '✅ Custom status cleared, resumed automatic status cycle.',
    ephemeral: true
  });
}

module.exports = statusClearHandler;
