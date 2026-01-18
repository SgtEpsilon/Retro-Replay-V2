const { DateTime } = require('luxon');
const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} = require('discord.js');

const { hasEventPermission, formatTime } = require('../utils/helpers');
const {
  getEvents,
  saveEvents,
  scheduleReminder,
  scheduleBackupAlert
} = require('../utils/storage');

const { TIMEZONE } = require('../utils/constants');

async function showModal(i) {
  if (!hasEventPermission(i.member))
    return i.reply({ content: '❌ No permission.', ephemeral: true });

  const modal = new ModalBuilder()
    .setCustomId('createEventModal')
    .setTitle('Create New Shift Event');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('eventTitle')
        .setLabel('Event Title')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(100)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('eventDate')
        .setLabel('Date (DD-MM-YYYY)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(10)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('eventTime')
        .setLabel('Time (h:mm AM/PM)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(10)
    )
  );

  await i.showModal(modal);
}

async function handleSubmit(i) {
  const title = i.fields.getTextInputValue('eventTitle');
  const dateStr = i.fields.getTextInputValue('eventDate');
  const timeStr = i.fields.getTextInputValue('eventTime');

  const dt = DateTime.fromFormat(
    `${dateStr} ${timeStr}`,
    'dd-MM-yyyy h:mm a',
    { zone: TIMEZONE }
  );

  if (!dt.isValid)
    return i.reply({
      content: '❌ Invalid date or time format.',
      ephemeral: true
    });

  if (dt.toMillis() < Date.now())
    return i.reply({
      content: '❌ Cannot create an event in the past.',
      ephemeral: true
    });

  await i.deferReply({ ephemeral: true });

  const events = getEvents();
  const eventId = `scheduled_manual_${Date.now()}`;

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
    manuallyCreated: true
  };

  if (!saveEvents()) {
    delete events[eventId];
    return i.editReply('❌ Failed to save event.');
  }

  // ✅ Schedule alerts immediately
  scheduleReminder(eventId, i.client);
  scheduleBackupAlert(eventId, i.client);

  await i.editReply(
    `✅ **Event Scheduled**\n${title}\n🕒 ${formatTime(dt.toMillis())}`
  );
}

module.exports = { showModal, handleSubmit };
