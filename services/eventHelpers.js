const { DateTime } = require('luxon');
const config = require('../config.json');
const { events } = require('./eventStore');

const TIMEZONE = 'America/New_York';

const roleConfig = {
  '1️⃣': 'Active Manager',
  '2️⃣': 'Backup Manager',
  '3️⃣': 'Bouncer',
  '4️⃣': 'Bartender',
  '5️⃣': 'Dancer',
  '6️⃣': 'DJ'
};

function formatEST(ms) {
  return DateTime.fromMillis(ms).setZone(TIMEZONE).toFormat('dd-MM-yyyy hh:mm a');
}

function buildSignupList(signups = {}) {
  return Object.entries(roleConfig).map(([emoji, role]) => {
    const users = signups[role] || [];
    return `**${emoji} ${role}:**\n${
      users.length ? users.map(id => `• <@${id}>`).join('\n') : '*No signups yet*'
    }`;
  }).join('\n\n');
}

function getSortedEvents(upcomingOnly = false) {
  const now = Date.now();
  return Object.entries(events)
    .map(([id, ev]) => ({ id, ...ev }))
    .filter(ev => !upcomingOnly || (!ev.cancelled && ev.datetime > now))
    .sort((a, b) => a.datetime - b.datetime);
}

function getEarliestUpcomingEvent() {
  return getSortedEvents(true)[0] || null;
}

module.exports = {
  roleConfig,
  formatEST,
  buildSignupList,
  getSortedEvents,
  getEarliestUpcomingEvent
};
