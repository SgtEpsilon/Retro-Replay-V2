const { getEvents } = require('../utils/storage');
const { formatTime } = require('../utils/helpers');

async function nextShiftHandler(i) {
  const events = getEvents(); // ✅ Get live reference
  
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
  const unixTimestamp = Math.floor(next.datetime / 1000);
  
  return await i.reply({
    content: `🔜 **Next Shift:**\n${next.title}\n🕒 ${formatTime(next.datetime)}\n⏰ <t:${unixTimestamp}:F> (<t:${unixTimestamp}:R>)`,
    ephemeral: true
  });
}

module.exports = nextShiftHandler;