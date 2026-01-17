const { events } = require('../utils/storage');
const { formatTime } = require('../utils/helpers');

async function mySignupsHandler(i) {
  const userId = i.user.id;
  const results = [];

  for (const ev of Object.values(events)) {
    if (ev.cancelled || ev.datetime < Date.now()) continue;
    for (const [role, users] of Object.entries(ev.signups)) {
      if (users.includes(userId))
        results.push(`• **${ev.title}** – ${role}\n  🕒 ${formatTime(ev.datetime)}`);
    }
  }

  return await i.reply({
    content: results.length
      ? `📋 **Your Signups:**\n\n${results.join('\n')}`
      : '🔭 You are not signed up for any upcoming shifts.',
    ephemeral: true
  });
}

module.exports = mySignupsHandler;