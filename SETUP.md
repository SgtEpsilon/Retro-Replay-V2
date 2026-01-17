const { hasEventPermission } = require('../utils/helpers');
const { disabledRoles, saveDisabledRoles } = require('../utils/storage');

async function enable(i) {
  if (!hasEventPermission(i.member))
    return await i.reply({ content: '❌ No permission.', ephemeral: true });

  const role = i.options.getString('role');
  const idx = disabledRoles.indexOf(role);

  if (idx === -1)
    return await i.reply({ content: `⚠️ **${role}** is already enabled.`, ephemeral: true });

  disabledRoles.splice(idx, 1);
  saveDisabledRoles();

  return await i.reply({ content: `✅ **${role}** role has been enabled for signups.`, ephemeral: true });
}

async function disable(i) {
  if (!hasEventPermission(i.member))
    return await i.reply({ content: '❌ No permission.', ephemeral: true });

  const role = i.options.getString('role');

  if (disabledRoles.includes(role))
    return await i.reply({ content: `⚠️ **${role}** is already disabled.`, ephemeral: true });

  disabledRoles.push(role);
  saveDisabledRoles();

  return await i.reply({ content: `✅ **${role}** role has been disabled for signups.`, ephemeral: true });
}

module.exports = { enable, disable };