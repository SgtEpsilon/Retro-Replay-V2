const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'scheduled_events.json');
let events = {};

function loadEvents() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, '{}');
    events = {};
    return;
  }

  try {
    events = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    console.error('❌ Corrupt scheduled_events.json — resetting.');
    events = {};
    saveEvents();
  }
}


function saveEvents() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(events, null, 2));
}

module.exports = {
  events,
  loadEvents,
  saveEvents
};
