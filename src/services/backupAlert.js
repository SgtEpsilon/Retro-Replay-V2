const { STAFF_CHAT_CHANNEL, roleConfig } = require('../utils/constants');
const { disabledRoles } = require('../utils/storage');

async function sendBackupAlert(ev, timeframe, client) {
  const missing = Object.values(roleConfig).filter(
    r => !disabledRoles.includes(r) && !(ev.signups[r]?.length)
  );
  
  if (!missing.length) return;

  try {
    if (!STAFF_CHAT_CHANNEL) {
      console.error('⚠️ STAFF_CHAT_CHANNEL_ID not configured in .env - backup alert not sent');
      return;
    }

    const staffChannel = await client.channels.fetch(STAFF_CHAT_CHANNEL).catch(err => {
      console.error('⚠️ Cannot access staff chat channel for backup alert');
      console.error('   Channel ID:', STAFF_CHAT_CHANNEL);
      console.error('   Error:', err.message);
      return null;
    });

    if (!staffChannel) {
      console.error('❌ Staff chat channel not found, backup alert not sent');
      return;
    }

    const signupChannel = await client.channels.fetch(ev.channelId);
    const guild = signupChannel.guild;
    
    const roleMentions = [];
    for (const missingRole of missing) {
      if (missingRole === 'Active Manager' || missingRole === 'Backup Manager') {
        // Managers ping Head Manager + Manager
        const headManager = guild.roles.cache.find(
          r => r.name.toLowerCase() === 'head manager'
        );
        const manager = guild.roles.cache.find(
          r => r.name.toLowerCase() === 'manager'
        );

        if (headManager) roleMentions.push(`<@&${headManager.id}>`);
        if (manager) roleMentions.push(`<@&${manager.id}>`);

      } else {
        // All other roles ping themselves
        const role = guild.roles.cache.find(
          r => r.name.toLowerCase() === missingRole.toLowerCase()
        );

        if (role) {
          roleMentions.push(`<@&${role.id}>`);
        } else {
          roleMentions.push(`**${missingRole}**`);
        }
      }
    }
    
    await staffChannel.send(
      `⚠️ **BACKUP NEEDED** (${timeframe}) for ${ev.title}\nMissing positions:\n${roleMentions.join('\n')}`
    );
  } catch (err) {
    console.error('⚠️ Backup alert error:', err.message);
  }
}

module.exports = { sendBackupAlert };