const { DateTime } = require('luxon');
const { ActivityType, EmbedBuilder } = require('discord.js');
const { TIMEZONE, roleConfig, config } = require('./constants');
const { disabledRoles, getCustomStatus } = require('./storage');
const { blackoutDates } = require('./storage');

// Check if user has event creation permission
function hasEventPermission(member) {
  if (!member || !member.roles) return false;
  return member.roles.cache.some(r =>
    config.eventCreatorRoles.includes(r.name)
  );
}

// Format timestamp
function formatTime(ms) {
  return DateTime.fromMillis(ms)
    .setZone(TIMEZONE)
    .toFormat('dd-MM-yyyy h:mm a');
}

// Check if date is a blackout date
function isBlackoutDate(date) {
  const checkDate = DateTime.fromMillis(date).setZone(TIMEZONE).toISODate();
  return blackoutDates.some(bd => {
    const blackout = DateTime.fromISO(bd, { zone: TIMEZONE }).toISODate();
    return blackout === checkDate;
  });
}

// Set default bot status
function setDefaultStatus(client) {
  if (getCustomStatus()) return;
  
  try {
    client.user.setPresence({
      activities: [{
        name: '🍸 Shifts at the Retro Bar',
        type: ActivityType.Watching
      }],
      status: 'online'
    });
  } catch (err) {
    console.error('⚠️ Error setting status:', err.message);
  }
}

// Build signup list for embed
function buildSignupList(signups) {
  return Object.entries(roleConfig).map(([emoji, role]) => {
    if (disabledRoles.includes(role))
      return `**${emoji} ${role}:** ~~Disabled~~`;

    const users = signups[role] || [];
    return `**${emoji} ${role}:**\n${
      users.length
        ? users.map(u => `• <@${u}>`).join('\n')
        : '*No signups yet*'
    }`;
  }).join('\n\n');
}

// Create event embed
function createEventEmbed(title, datetime, signups) {
  const unixTimestamp = Math.floor(datetime / 1000);
  
  return new EmbedBuilder()
    .setColor(0x00b0f4)
    .setTitle(title)
    .setDescription(
      `🕒 **When:** ${formatTime(datetime)}\n<t:${unixTimestamp}:F>\n<t:${unixTimestamp}:R>\n\n${buildSignupList(signups)}`
    )
    .setFooter({ text: 'React to sign up!' });
}

module.exports = {
  hasEventPermission,
  formatTime,
  isBlackoutDate,
  setDefaultStatus,
  buildSignupList,
  createEventEmbed
};