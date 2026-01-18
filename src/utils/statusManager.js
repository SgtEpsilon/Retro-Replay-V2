const { ActivityType } = require("discord.js");
const { getCustomStatus } = require("./storage");

let presets = require("./statusPresets");

let interval = null;
let index = 0;
let cyclingEnabled = true;

const activityMap = {
    Playing: ActivityType.Playing,
    Watching: ActivityType.Watching,
    Listening: ActivityType.Listening,
    Competing: ActivityType.Competing
};

function setStatus(client, preset) {
    if (!preset) return;

    client.user.setActivity({
        name: preset.text,
        type: activityMap[preset.type]
    });
}

function startStatusCycle(client) {
    if (!cyclingEnabled || presets.length === 0) return;

    stopStatusCycle();

    index = 0;
    setStatus(client, presets[index]);

    interval = setInterval(() => {
        index = (index + 1) % presets.length;
        setStatus(client, presets[index]);
    }, 30_000);
}

function stopStatusCycle() {
    if (interval) {
        clearInterval(interval);
        interval = null;
    }
}

function pauseCycle() {
    cyclingEnabled = false;
    stopStatusCycle();
}

function resumeCycle(client) {
    cyclingEnabled = true;

    // Reload presets in case they changed
    delete require.cache[require.resolve("./statusPresets")];
    presets = require("./statusPresets");

    startStatusCycle(client);
}

function initStatus(client) {
    const saved = getCustomStatus();

    if (saved) {
        cyclingEnabled = false;

        client.user.setActivity({
            name: saved.status,
            type: activityMap[saved.type]
        });

        console.log("ℹ️ Restored custom status, cycling paused");
    } else {
        cyclingEnabled = true;
        startStatusCycle(client);
        console.log("ℹ️ No custom status found, cycling enabled");
    }
}

module.exports = {
    startStatusCycle,
    stopStatusCycle,
    pauseCycle,
    resumeCycle,
    initStatus
};
