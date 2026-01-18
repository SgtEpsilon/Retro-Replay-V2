const { DateTime } = require('luxon');
const { config, TIMEZONE } = require('../utils/constants');

async function areWeOpenHandler(i) {
  const now = DateTime.now().setZone(TIMEZONE);
  const today = now.toFormat('EEEE');
  const currentHour = now.hour;
  
  // Check if today is an open day
  const isTodayOpenDay = config.openDays.includes(today);
  
  // Check if we're currently during shift hours (after shift start)
  const isCurrentlyOpen = isTodayOpenDay && currentHour >= config.shiftStartHour;

  let content;
  
  if (isCurrentlyOpen) {
    content = `✅ Yes! The bar is open right now (${today}).`;
  } else {
    content = `❌ No, the bar is closed right now.\n📅 Open days: ${config.openDays.join(', ')}`;
  }

  // Add countdown to next shift start
  const nextShiftStart = findNextShiftStart(now, config.openDays, config.shiftStartHour);
  if (nextShiftStart) {
    const unixTimestamp = Math.floor(nextShiftStart.toSeconds());
    content += `\n\n⏰ Next shift starts: <t:${unixTimestamp}:F> (<t:${unixTimestamp}:R>)`;
  }

  return await i.reply({
    content: content,
    ephemeral: true
  });
}

function findNextShiftStart(currentTime, openDays, shiftStartHour) {
  const currentDayName = currentTime.toFormat('EEEE');
  const currentHour = currentTime.hour;
  
  // Check if there's a shift later today
  if (openDays.includes(currentDayName) && currentHour < shiftStartHour) {
    return currentTime.set({ 
      hour: shiftStartHour, 
      minute: 0, 
      second: 0, 
      millisecond: 0 
    });
  }
  
  // Check each of the next 7 days
  for (let daysAhead = 1; daysAhead <= 7; daysAhead++) {
    const futureDate = currentTime.plus({ days: daysAhead });
    const futureDayName = futureDate.toFormat('EEEE');
    
    if (openDays.includes(futureDayName)) {
      return futureDate.set({ 
        hour: shiftStartHour, 
        minute: 0, 
        second: 0, 
        millisecond: 0 
      });
    }
  }
  
  return null;
}

module.exports = areWeOpenHandler;