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
    if (!preset || !client.user) return;

    client.user.setActivity({
        name: preset.text,
        type: activityMap[preset.type]
    });
}

/* ─────────────────────────────────────────────── */
/* Cycle Control                                   */
/* ─────────────────────────────────────────────── */

function stopStatusCycle() {
    if (interval) {
        clearInterval(interval);
        interval = null;
    }
}

function startStatusCycle(client) {
    if (!cyclingEnabled) return;

    stopStatusCycle();

    if (!presets.length) {
        console.warn("⚠️ No status presets found");
        return;
    }

    index = 0;
    setStatus(client, presets[index]);

    interval = setInterval(() => {
        index = (index + 1) % presets.length;
        setStatus(client, presets[index]);
    }, 30_000);
}

function pauseCycle() {
    cyclingEnabled = false;
    stopStatusCycle();
}

/* ─────────────────────────────────────────────── */
/* 🔄 HARD RELOAD (used by /statusreload)          */
/* ─────────────────────────────────────────────── */

function resumeCycle(client) {
    cyclingEnabled = true;

    // Fully reload presets
    delete require.cache[require.resolve("./statusPresets")];
    presets = require("./statusPresets");

    index = 0;
    stopStatusCycle();
    startStatusCycle(client);

    console.log("🔄 Status presets reloaded and cycle restarted");
}

/* ─────────────────────────────────────────────── */
/* Init on startup                                 */
/* ─────────────────────────────────────────────── */

function initStatus(client) {
    const saved = getCustomStatus();

    stopStatusCycle();

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
