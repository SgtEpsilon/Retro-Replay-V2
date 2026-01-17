const { DateTime } = require('luxon');
const { hasEventPermission, formatTime, createEventEmbed } = require('../utils/helpers');
const { getEvents, saveEvents, clearEventTimers, scheduleReminder, scheduleBackupAlert } = require('../utils/storage');
const { TIMEZONE } = require('../utils/constants');

async function editEventTimeHandler(i) {
  if (!hasEventPermission(i.member))
    return await i.reply({ content: '❌ No permission.', ephemeral: true });

  const messageId = i.options.getString('messageid');
  const datetimeStr = i.options.getString('datetime');

  const events = getEvents(); // ✅ Get live reference
  const ev = events[messageId];
  
  if (!ev)
    return await i.reply({ content: '⚠️ Event not found.', ephemeral: true });

  if (ev.cancelled)
    return await i.reply({ content: '⚠️ Cannot edit cancelled event.', ephemeral: true });

  // Parse the new datetime
  const dt = DateTime.fromFormat(datetimeStr, 'dd-MM-yyyy h:mm a', { zone: TIMEZONE });

  if (!dt.isValid) {
    return await i.reply({
      content: '❌ Invalid format. Use: DD-MM-YYYY h:mm AM/PM (e.g., 25-01-2026 9:00 PM)',
      ephemeral: true
    });
  }

  if (dt.toMillis() < Date.now()) {
    return await i.reply({
      content: '❌ Cannot set time in the past.',
      ephemeral: true
    });
  }

  // Store old time for logging
  const oldTime = ev.datetime;
  
  // Clear existing timers before updating
  clearEventTimers(messageId);
  
  // Update the event datetime
  ev.datetime = dt.toMillis();
  
  // ✅ CRITICAL: Save immediately after modification
  const saved = saveEvents();
  if (!saved) {
    // Rollback if save failed
    ev.datetime = oldTime;
    console.error('❌ CRITICAL: Failed to save event time change!');
    return await i.reply({
      content: '⚠️ Error saving time change. Please try again or contact an admin.',
      ephemeral: true
    });
  }

  // Reschedule all timers with new time
  scheduleReminder(messageId, i.client);
  scheduleBackupAlert(messageId, i.client);

  console.log(`✅ Event time updated: ${ev.title} (ID: ${messageId})`);
  console.log(`   Old: ${formatTime(oldTime)}`);
  console.log(`   New: ${formatTime(ev.datetime)}`);

  // Update the Discord message
  try {
    const channel = await i.client.channels.fetch(ev.channelId);
    const message = await channel.messages.fetch(messageId);
    const embed = createEventEmbed(ev.title, ev.datetime, ev.signups);
    await message.edit({ embeds: [embed] });
  } catch (err) {
    console.error('⚠️ Error updating event message:', err.message);
    // Don't fail the command - data is already saved
  }

  return await i.reply({
    content: `✅ Event time updated!\n**${ev.title}**\n🕒 ${formatTime(ev.datetime)}`,
    ephemeral: true
  });
}

module.exports = editEventTimeHandler;