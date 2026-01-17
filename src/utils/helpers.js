const { DateTime } = require('luxon');
const { EmbedBuilder, ActivityType } = require('discord.js');
const config = require('../../config.json');
const { getBlackoutDates, getEvents } = require('./storage');
const { roleConfig, TIMEZONE } = require('./constants');

// Check if user has permission to create/manage events
function hasEventPermission(member) {
  if (!member || !member.roles) return false;
  return config.eventCreatorRoles.some(roleName => 
    member.roles.cache.some(role => role.name === roleName)
  );
}

// Format timestamp for display
function formatTime(timestamp) {
  const dt = DateTime.fromMillis(timestamp).setZone(TIMEZONE);
  return dt.toFormat('EEEE, MMMM d, yyyy \'at\' h:mm a ZZZZ');
}

// Check if a date is a blackout date
function isBlackoutDate(timestamp) {
  const blackoutDates = getBlackoutDates(); // ✅ Get live reference
  
  if (!blackoutDates || !Array.isArray(blackoutDates)) {
    return false;
  }
  
  const dt = DateTime.fromMillis(timestamp).setZone(TIMEZONE);
  const dateStr = dt.toFormat('dd-MM-yyyy');
  return blackoutDates.some(d => d === dateStr);
}

// Create event embed
function createEventEmbed(title, datetime, signups) {
  const embed = new EmbedBuilder()
    .setColor('#00B0F4')
    .setTitle(title)
    .setDescription(`🕒 <t:${Math.floor(datetime / 1000)}:F> (<t:${Math.floor(datetime / 1000)}:R>)`)
    .setTimestamp();

  // Build signup fields
  const signupFields = [];
  
  for (const [emoji, role] of Object.entries(roleConfig)) {
    const users = signups[role] || [];
    const userList = users.length > 0
      ? users.map(id => `<@${id}>`).join('\n')
      : 'None';
    
    signupFields.push({
      name: `${emoji} ${role} (${users.length})`,
      value: userList,
      inline: true
    });
  }

  embed.addFields(signupFields);

  return embed;
}

// Set default bot status
function setDefaultStatus(client) {
  client.user.setPresence({
    activities: [{ 
      name: '🍸 Shifts at the Retro Bar', 
      type: ActivityType.Watching 
    }],
    status: 'online'
  });
}

// Set custom bot status
function setCustomStatus(client, statusText, activityType = ActivityType.Playing) {
  client.user.setPresence({
    activities: [{ 
      name: statusText, 
      type: activityType 
    }],
    status: 'online'
  });
}

module.exports = {
  hasEventPermission,
  formatTime,
  isBlackoutDate,
  createEventEmbed,
  setDefaultStatus,
  setCustomStatus
};