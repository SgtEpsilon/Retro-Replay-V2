const { ActivityType } = require('discord.js');
const { hasEventPermission } = require('../utils/helpers');
const { setCustomStatus } = require('../utils/storage');
const { pauseCycle } = require('../utils/statusManager');

async function setStatusHandler(i) {
  if (!hasEventPermission(i.member))
    return await i.reply({ content: '❌ No permission.', ephemeral: true });

  const status = i.options.getString('status');
  const typeStr = i.options.getString('type') || 'Playing';

  const typeMap = {
    Playing: ActivityType.Playing,
    Watching: ActivityType.Watching,
    Listening: ActivityType.Listening,
    Competing: ActivityType.Competing
  };

  try {
    // ⏸️ Stop automatic cycling
    pauseCycle();

    await i.client.user.setPresence({
      activities: [{
        name: status,
        type: typeMap[typeStr]
      }],
      status: 'online'
    });

    // Persist manual override (your existing behavior)
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
