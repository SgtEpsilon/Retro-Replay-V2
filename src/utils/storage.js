const fs = require('fs');
const path = require('path');
const {
  DATA_FILE,
  AUTO_POST_FILE,
  BLACKOUT_FILE,
  SHIFT_LOG_FILE,
  DISABLED_ROLES_FILE
} = require('./constants');

// Storage objects - these are the ACTUAL data stores
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

// Atomic save with backup
function saveAtomic(file, data) {
  try {
    const dir = path.dirname(file);
    const backupPath = `${file}.backup`;
    const tempPath = `${file}.tmp`;
    
    // Write to temporary file first
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2));
    
    // Create backup of current file if it exists
    if (fs.existsSync(file)) {
      try {
        fs.copyFileSync(file, backupPath);
      } catch (backupErr) {
        console.error(`⚠️ Warning: Could not create backup for ${file}`);
      }
    }
    
    // Atomically replace the original file
    fs.renameSync(tempPath, file);
    
    return true;
  } catch (err) {
    console.error(`❌ CRITICAL: Failed to save ${file}:`, err.message);
    
    // Try to clean up temp file
    try {
      const tempPath = `${file}.tmp`;
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    } catch (cleanupErr) {
      // Silent cleanup failure
    }
    
    return false;
  }
}

// Load with automatic backup recovery
function load(file, fallback) {
  try {
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      return data;
    }
    return fallback;
  } catch (err) {
    console.error(`⚠️ Error loading ${file}:`, err.message);
    
    // Try backup
    const backupPath = `${file}.backup`;
    if (fs.existsSync(backupPath)) {
      try {
        console.log(`🔄 Attempting to restore from backup: ${backupPath}`);
        const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
        console.log(`✅ Successfully restored from backup!`);
        
        // Restore the main file
        saveAtomic(file, backupData);
        
        return backupData;
      } catch (backupErr) {
        console.error(`❌ Backup restoration failed:`, backupErr.message);
      }
    }
    
    console.log(`⚠️ Using fallback data for ${file}`);
    return fallback;
  }
}

// Initialize data
function loadData() {
  console.log('📂 Loading data files...');
  
  events = load(DATA_FILE, {});
  autoPosted = load(AUTO_POST_FILE, {});
  blackoutDates = load(BLACKOUT_FILE, []);
  shiftLogs = load(SHIFT_LOG_FILE, []);
  disabledRoles = load(DISABLED_ROLES_FILE, []);
  
  console.log(`   ✅ Loaded ${Object.keys(events).length} events`);
  console.log(`   ✅ Loaded ${Object.keys(autoPosted).length} auto-post records`);
  console.log(`   ✅ Loaded ${blackoutDates.length} blackout dates`);
  console.log(`   ✅ Loaded ${shiftLogs.length} shift logs`);
  
  return { events, autoPosted, blackoutDates, shiftLogs, disabledRoles };
}

// Save events with validation
function saveEvents() {
  if (typeof events !== 'object' || events === null) {
    console.error('❌ CRITICAL: Invalid events data, skipping save');
    return false;
  }
  
  const success = saveAtomic(DATA_FILE, events);
  if (success) {
    console.log(`💾 Saved ${Object.keys(events).length} events`);
  }
  return success;
}

// Save auto-posted dates
function saveAutoPosted() {
  return saveAtomic(AUTO_POST_FILE, autoPosted);
}

// Save blackout dates
function saveBlackoutDates() {
  return saveAtomic(BLACKOUT_FILE, blackoutDates);
}

// Save shift logs
function saveShiftLogs() {
  return saveAtomic(SHIFT_LOG_FILE, shiftLogs);
}

// Save disabled roles
function saveDisabledRoles() {
  return saveAtomic(DISABLED_ROLES_FILE, disabledRoles);
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
  
  delete reminderTimers[id];
  delete backupAlertTimers[id];
  delete backupAlert5MinTimers[id];
  delete backupAlertStartTimers[id];
}

// Get live reference to events (CRITICAL FIX)
function getEvents() {
  return events;
}

function getAutoPosted() {
  return autoPosted;
}

function getBlackoutDates() {
  return blackoutDates;
}

function getShiftLogs() {
  return shiftLogs;
}

function getDisabledRoles() {
  return disabledRoles;
}

// CRITICAL: Export getter functions instead of static references
module.exports = {
  // Getter functions - these return live references
  getEvents,
  getAutoPosted,
  getBlackoutDates,
  getShiftLogs,
  getDisabledRoles,
  
  // Functions
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
  setCustomStatus: (status) => { customStatus = status; },
  
  // Emergency save all
  saveAll: () => {
    const results = {
      events: saveEvents(),
      autoPosted: saveAutoPosted(),
      blackoutDates: saveBlackoutDates(),
      shiftLogs: saveShiftLogs(),
      disabledRoles: saveDisabledRoles()
    };
    
    const allSuccess = Object.values(results).every(r => r !== false);
    console.log(allSuccess ? '✅ All data saved successfully' : '⚠️ Some saves failed');
    return allSuccess;
  }
};