const { getEvents } = require('../utils/storage');
const { formatTime } = require('../utils/helpers');

async function mySignupsHandler(i) {
  const events = getEvents(); // ✅ Get live reference
  const userId = i.user.id;
  const now = Date.now();

  // Find all upcoming events where user has signed up
  const userSignups = [];
  
  Object.entries(events).forEach(([eventId, event]) => {
    if (event.cancelled || event.datetime < now) return;
    
    // Check if user is signed up for any role in this event
    if (event.signups) {
      for (const [role, users] of Object.entries(event.signups)) {
        if (users.includes(userId)) {
          userSignups.push({
            event,
            role,
            eventId
          });
          break; // User can only have one role per event
        }
      }
    }
  });

  if (!userSignups.length) {
    return await i.reply({
      content: '📋 You have no upcoming shift signups.',
      ephemeral: true
    });
  }

  // Sort by datetime
  userSignups.sort((a, b) => a.event.datetime - b.event.datetime);

  // Build response
  const signupList = userSignups.map(({ event, role }) => {
    return `**${event.title}**\n🎭 Role: ${role}\n🕒 ${formatTime(event.datetime)}`;
  }).join('\n\n');

  return await i.reply({
    content: `📋 **Your Upcoming Signups (${userSignups.length}):**\n\n${signupList}`,
    ephemeral: true
  });
}

module.exports = mySignupsHandler;