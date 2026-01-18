const { hasEventPermission } = require('../utils/helpers');
const { resumeCycle } = require('../utils/statusManager');

async function statusReloadHandler(i) {
    if (!hasEventPermission(i.member))
        return await i.reply({ content: '❌ No permission.', ephemeral: true });

    try {
        // Clear require cache so file reloads
        delete require.cache[require.resolve('../utils/statusPresets')];

        // Resume cycle with fresh presets
        resumeCycle(i.client);

        return await i.reply({
            content: '🔄 Status presets reloaded and cycle restarted.',
            ephemeral: true
        });
    } catch (err) {
        console.error('⚠️ Status reload failed:', err.message);
        return await i.reply({
            content: '❌ Failed to reload status presets.',
            ephemeral: true
        });
    }
}

module.exports = statusReloadHandler;
