const { STAFF_CHAT_CHANNEL, roleConfig } = require('../utils/constants');
const { getDisabledRoles } = require('../utils/storage');

async function sendBackupAlert(ev, timeframe, client) {
  const disabledRoles = getDisabledRoles();

  const missingRoles = Object.values(roleConfig).filter(
    role =>
      !disabledRoles.includes(role) &&
      !(ev.signups?.[role]?.length)
  );

  if (!missingRoles.length) return;

  if (!STAFF_CHAT_CHANNEL) {
    console.error('⚠️ STAFF_CHAT_CHANNEL_ID not set');
    return;
  }

  const staffChannel = await client.channels.fetch(STAFF_CHAT_CHANNEL).catch(() => null);
  if (!staffChannel) return;

  const signupChannel = await client.channels.fetch(ev.channelId).catch(() => null);
  if (!signupChannel) return;

  const guild = signupChannel.guild;
  const mentions = [];

  for (const roleName of missingRoles) {
    if (['Active Manager', 'Backup Manager'].includes(roleName)) {
      ['head manager', 'manager'].forEach(name => {
        const role = guild.roles.cache.find(r => r.name.toLowerCase() === name);
        if (role) mentions.push(`<@&${role.id}>`);
      });
    } else {
      const role = guild.roles.cache.find(
        r => r.name.toLowerCase() === roleName.toLowerCase()
      );
      mentions.push(role ? `<@&${role.id}>` : `**${roleName}**`);
    }
  }

  await staffChannel.send(
    `⚠️ **BACKUP NEEDED (${timeframe})**\n**${ev.title}**\n${mentions.join('\n')}`
  );
}

module.exports = { sendBackupAlert };
