const { DateTime } = require('luxon');
const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} = require('discord.js');
const { hasEventPermission, formatTime } = require('../utils/helpers');
const { getEvents, saveEvents } = require('../utils/storage');
const { TIMEZONE } = require('../utils/constants');

async function showModal(i) {
  if (!hasEventPermission(i.member))
    return await i.reply({ content: '❌ No permission.', ephemeral: true });

  const modal = new ModalBuilder()
    .setCustomId('createEventModal')
    .setTitle('Create New Shift Event');

  const titleInput = new TextInputBuilder()
    .setCustomId('eventTitle')
    .setLabel('Event Title')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('e.g., Friday Night Shift')
    .setRequired(true)
    .setMaxLength(100);

  const dateInput = new TextInputBuilder()
    .setCustomId('eventDate')
    .setLabel('Date (DD-MM-YYYY)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('e.g., 25-01-2026')
    .setRequired(true)
    .setMaxLength(10);

  const timeInput = new TextInputBuilder()
    .setCustomId('eventTime')
    .setLabel('Time (h:mm AM/PM)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('e.g., 9:00 PM')
    .setRequired(true)
    .setMaxLength(10);

  const firstRow = new ActionRowBuilder().addComponents(titleInput);
  const secondRow = new ActionRowBuilder().addComponents(dateInput);
  const thirdRow = new ActionRowBuilder().addComponents(timeInput);

  modal.addComponents(firstRow, secondRow, thirdRow);

  await i.showModal(modal);
}

async function handleSubmit(i) {
  const title = i.fields.getTextInputValue('eventTitle');
  const dateStr = i.fields.getTextInputValue('eventDate');
  const timeStr = i.fields.getTextInputValue('eventTime');

  const datetimeStr = `${dateStr} ${timeStr}`;
  const dt = DateTime.fromFormat(datetimeStr, 'dd-MM-yyyy h:mm a', { zone: TIMEZONE });

  if (!dt.isValid) {
    return await i.reply({
      content: '❌ Invalid date/time format. Please use:\n• Date: DD-MM-YYYY (e.g., 25-01-2026)\n• Time: h:mm AM/PM (e.g., 9:00 PM)',
      ephemeral: true
    });
  }

  if (dt.toMillis() < Date.now()) {
    return await i.reply({
      content: '❌ Cannot create an event in the past.',
      ephemeral: true
    });
  }

  await i.deferReply({ ephemeral: true });

  try {
    const events = getEvents(); // ✅ Get live reference
    
    // Create unique ID for the scheduled event
    const eventId = `scheduled_manual_${Date.now()}`;
    
    // Create the event data (scheduled, not posted to Discord)
    events[eventId] = {
      id: eventId,
      title,
      shift: title,
      datetime: dt.toMillis(),
      channelId: null,
      messageId: null,
      signups: {},
      cancelled: false,
      scheduled: true,
      manuallyCreated: true // Flag to indicate this was manually created
    };

    // ✅ CRITICAL: Save immediately after creating event
    const saved = saveEvents();
    
    if (!saved) {
      console.error('❌ CRITICAL: Failed to save newly created event!');
      console.error(`   Event ID: ${eventId}`);
      console.error(`   Title: ${title}`);
      console.error(`   DateTime: ${dt.toISO()}`);
      
      // Remove the event from memory since it wasn't saved
      delete events[eventId];
      
      return await i.editReply({
        content: '❌ Failed to save the event. Please try again or contact an admin if the problem persists.'
      });
    }

    console.log(`✅ Created scheduled event: ${title} (ID: ${eventId})`);
    console.log(`   DateTime: ${dt.toFormat('EEEE, MMMM d, yyyy \'at\' h:mm a')}`);
    console.log(`   Scheduled: true, ManuallyCreated: true`);

    await i.editReply({
      content: `✅ Event scheduled successfully!\n**${title}**\n🕒 ${formatTime(dt.toMillis())}\n\n📝 **Note:** This event is saved to \`scheduled_events.json\` and will appear in \`/weeklyschedule\`.\n\nIt will be automatically posted to Discord at **4 PM EST** on the day before the event, or you can use the \`/post\` command to post it immediately.`
    });
  } catch (err) {
    console.error('❌ Error creating scheduled event:', err);
    console.error('Error stack:', err.stack);
    
    await i.editReply({
      content: `❌ Failed to create scheduled event.\n\`\`\`${err.message}\`\`\``
    });
  }
}

module.exports = { showModal, handleSubmit };