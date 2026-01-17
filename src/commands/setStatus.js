const { ActivityType } = require('discord.js');
const { hasEventPermission } = require('../utils/helpers');
const { setCustomStatus } = require('../utils/storage');

async function setStatusHandler(i) {
  if (!hasEventPermission(i.member))
    return await i.reply({ content: '❌ No permission.', ephemeral: true });

  const status = i.options.getString('status');
  const typeStr = i.options.getString('type') || 'Playing';

  const typeMap = {
    'Playing': ActivityType.Playing,
    'Watching': ActivityType.Watching,
    'Listening': ActivityType.Listening,
    'Competing': ActivityType.Competing
  };

  try {
    await i.client.user.setPresence({
      activities: [{
        name: status,
        type: typeMap[typeStr]
      }],
      status: 'online'
    });

    setCustomStatus({ status, type: typeStr });

    return await i.reply({
      content: `✅ Bot status set to: **${typeStr} ${status}**`,
      ephemeral: true
    });
  } catch (err) {
    console.error('⚠️ Error setting status:', err.message);
    return await i.reply({
      content: '❌ Failed to set status.',
      ephemeral: true
    });
  }
}

module.exports = setStatusHandler;