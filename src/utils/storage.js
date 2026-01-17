const fs = require('fs');
const {
  DATA_FILE,
  AUTO_POST_FILE,
  BLACKOUT_FILE,
  SHIFT_LOG_FILE,
  DISABLED_ROLES_FILE
} = require('./constants');

// Storage objects
let events = {};
let reminderTimers = {};
let backupAlertTimers = {};
let backupAlert5MinTimers = {};
let backupAlertStartTimers = {};
let autoPosted = {};
let blackoutDates = [];
let shiftLogs = [];
let disabledRoles = [];
let customStatus = null;

// Load data from file
function load(file, fallback) {
  try {
    return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : fallback;
  } catch (err) {
    console.error(`⚠️ Error loading ${file}:`, err.message);
    return fallback;
  }
}

// Save data to file
const save = (file, data) => {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(`⚠️ Error saving ${file}:`, err.message);
  }
};

// Initialize data
function loadData() {
  events = load(DATA_FILE, {});
  autoPosted = load(AUTO_POST_FILE, {});
  blackoutDates = load(BLACKOUT_FILE, []);
  shiftLogs = load(SHIFT_LOG_FILE, []);
  disabledRoles = load(DISABLED_ROLES_FILE, []);
  
  return { events, autoPosted, blackoutDates, shiftLogs, disabledRoles };
}

// Save events
function saveEvents() {
  save(DATA_FILE, events);
}

// Save auto-posted dates
function saveAutoPosted() {
  save(AUTO_POST_FILE, autoPosted);
}

// Save blackout dates
function saveBlackoutDates() {
  save(BLACKOUT_FILE, blackoutDates);
}

// Save shift logs
function saveShiftLogs() {
  save(SHIFT_LOG_FILE, shiftLogs);
}

// Save disabled roles
function saveDisabledRoles() {
  save(DISABLED_ROLES_FILE, disabledRoles);
}

// Schedule reminder
function scheduleReminder(id, client) {
  const ev = events[id];
  if (!ev || ev.cancelled) return;

  const delay = ev.datetime - Date.now();
  if (delay <= 0) return;

  reminderTimers[id] = setTimeout(async () => {
    try {
      const channel = await client.channels.fetch(ev.channelId);
      shiftLogs.push({ ...ev, timestamp: Date.now() });
      saveShiftLogs();
    } catch (err) {
      console.error('⚠️ Reminder error:', err.message);
    }
  }, delay);
}

// Schedule backup alerts
function scheduleBackupAlert(id, client) {
  const { sendBackupAlert } = require('../services/backupAlert');
  const ev = events[id];
  if (!ev || ev.cancelled) return;

  // Alert 2 hours before
  const alertTime2Hours = ev.datetime - 2 * 60 * 60 * 1000;
  const delay2Hours = alertTime2Hours - Date.now();
  
  if (delay2Hours > 0) {
    backupAlertTimers[id] = setTimeout(async () => {
      await sendBackupAlert(ev, '2 hours', client);
    }, delay2Hours);
  }

  // Alert 5 minutes before
  const alertTime5Min = ev.datetime - 5 * 60 * 1000;
  const delay5Min = alertTime5Min - Date.now();
  
  if (delay5Min > 0) {
    backupAlert5MinTimers[id] = setTimeout(async () => {
      await sendBackupAlert(ev, '5 minutes', client);
    }, delay5Min);
  }

  // Alert at start time
  const delayStart = ev.datetime - Date.now();
  
  if (delayStart > 0) {
    backupAlertStartTimers[id] = setTimeout(async () => {
      await sendBackupAlert(ev, 'now (shift starting)', client);
    }, delayStart);
  }
}

// Clear all timers for an event
function clearEventTimers(id) {
  clearTimeout(reminderTimers[id]);
  clearTimeout(backupAlertTimers[id]);
  clearTimeout(backupAlert5MinTimers[id]);
  clearTimeout(backupAlertStartTimers[id]);
}

module.exports = {
  events,
  autoPosted,
  blackoutDates,
  shiftLogs,
  disabledRoles,
  customStatus,
  loadData,
  saveEvents,
  saveAutoPosted,
  saveBlackoutDates,
  saveShiftLogs,
  saveDisabledRoles,
  scheduleReminder,
  scheduleBackupAlert,
  clearEventTimers,
  getCustomStatus: () => customStatus,
  setCustomStatus: (status) => { customStatus = status; }
};