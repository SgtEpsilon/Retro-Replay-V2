const { events } = require('../utils/storage');
const { formatTime } = require('../utils/helpers');

async function nextShiftHandler(i) {
  const upcoming = Object.values(events)
    .filter(ev => !ev.cancelled && ev.datetime > Date.now())
    .sort((a, b) => a.datetime - b.datetime);

  if (!upcoming.length) {
    return await i.reply({
      content: '📅 No upcoming shifts scheduled.',
      ephemeral: true
    });
  }

  const next = upcoming[0];
  return await i.reply({
    content: `🔜 **Next Shift:**\n${next.title}\n🕒 ${formatTime(next.datetime)}`,
    ephemeral: true
  });
}

module.exports = nextShiftHandler;