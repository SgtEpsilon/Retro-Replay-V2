const { DateTime } = require('luxon');
const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} = require('discord.js');
const { hasEventPermission, formatTime, createEventEmbed } = require('../utils/helpers');
const { events, saveEvents, scheduleReminder, scheduleBackupAlert } = require('../utils/storage');
const { TIMEZONE, SIGNUP_CHANNEL, BAR_STAFF_ROLE_ID, roleConfig } = require('../utils/constants');
const { client } = require('../client');

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
    const channel = await client.channels.fetch(SIGNUP_CHANNEL);
    
    const signups = Object.fromEntries(
      Object.values(roleConfig).map(role => [role, []])
    );

    const embed = createEventEmbed(title, dt.toMillis(), signups);

    const msg = await channel.send({
      content: `<@&${BAR_STAFF_ROLE_ID}> New shift posted!`,
      embeds: [embed]
    });

    for (const emoji of Object.keys(roleConfig)) {
      await msg.react(emoji);
    }

    events[msg.id] = {
      id: msg.id,
      title,
      datetime: dt.toMillis(),
      channelId: channel.id,
      signups,
      cancelled: false
    };

    scheduleReminder(msg.id, client);
    scheduleBackupAlert(msg.id, client);
    saveEvents();

    await i.editReply({
      content: `✅ Event created successfully!\n**${title}**\n🕒 ${formatTime(dt.toMillis())}\n📍 Message ID: ${msg.id}`
    });
  } catch (err) {
    console.error('❌ Error creating event:', err);
    await i.editReply({
      content: '❌ Failed to create event. Check bot permissions in the signup channel.'
    });
  }
}

module.exports = { showModal, handleSubmit };