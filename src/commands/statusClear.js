const { hasEventPermission, setDefaultStatus } = require('../utils/helpers');
const { setCustomStatus } = require('../utils/storage');

async function statusClearHandler(i) {
  if (!hasEventPermission(i.member))
    return await i.reply({ content: '❌ No permission.', ephemeral: true });

  setCustomStatus(null);
  setDefaultStatus(i.client);

  return await i.reply({
    content: '✅ Custom status cleared, reverted to default.',
    ephemeral: true
  });
}

module.exports = statusClearHandler;