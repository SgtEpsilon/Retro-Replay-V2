const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder
} = require('discord.js');

const { DateTime } = require('luxon');
const config = require('../config.json');
const { roleConfig, buildSignupList } = require('../services/eventHelpers');
const { events, saveEvents } = require('../services/eventStore');

const TIMEZONE = 'America/New_York';

/* ───────── HELPERS ───────── */

function getNextOpenDay() {
  const openDays = config.openDays || [];
  let date = DateTime.now().setZone(TIMEZONE).startOf('day');

  for (let i = 0; i < 7; i++) {
    const dayName = date.toFormat('cccc');
    if (openDays.includes(dayName)) return date;
    date = date.plus({ days: 1 });
  }

  return DateTime.now().setZone(TIMEZONE);
}

/* ───────── COMMAND ───────── */

module.exports = {
  data: new SlashCommandBuilder()
    .setName('createevent')
    .setDescription('Create a new event'),

  async execute(interaction) {
    const nextDay = getNextOpenDay();

    const modal = new ModalBuilder()
      .setCustomId('createevent-modal')
      .setTitle('Create Event');

    const titleInput = new TextInputBuilder()
      .setCustomId('title')
      .setLabel('Event Title')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const dateInput = new TextInputBuilder()
      .setCustomId('datetime')
      .setLabel('Date & Time (YYYY-MM-DD HH:mm)')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setValue(nextDay.toFormat('yyyy-MM-dd 21:00'));

    modal.addComponents(
      new ActionRowBuilder().addComponents(titleInput),
      new ActionRowBuilder().addComponents(dateInput)
    );

    await interaction.showModal(modal);

    // ⏳ Wait for modal submit
    const submitted = await interaction.awaitModalSubmit({
      time: 5 * 60 * 1000,
      filter: i =>
        i.customId === 'createevent-modal' &&
        i.user.id === interaction.user.id
    });

    // ✅ CRITICAL: acknowledge immediately
    await submitted.deferReply({ ephemeral: true });

    const title = submitted.fields.getTextInputValue('title');
    const datetimeStr = submitted.fields.getTextInputValue('datetime');

    const dt = DateTime.fromFormat(
      datetimeStr,
      'yyyy-MM-dd HH:mm',
      { zone: TIMEZONE }
    );

    if (!dt.isValid) {
      return submitted.editReply('❌ Invalid date format.');
    }

    const embed = new EmbedBuilder()
      .setColor(0x00b0f4)
      .setTitle(title)
      .setDescription(
        `🕒 **When:** ${dt.toFormat('dd-MM-yyyy hh:mm a')} (EST)\n\n` +
        buildSignupList({})
      )
      .setTimestamp();

    const channel = await interaction.client.channels.fetch(
      config.signupChannelId
    );

    const message = await channel.send({ embeds: [embed] });

    events[message.id] = {
      title,
      datetime: dt.toMillis(),
      channelId: channel.id,
      signups: {},
      cancelled: false
    };

    saveEvents();

    // 🔑 Add signup emojis
    for (const emoji of Object.keys(roleConfig)) {
      try {
        await message.react(emoji);
      } catch (err) {
        console.error(`❌ Failed to add reaction ${emoji}:`, err.message);
      }
    }

    await submitted.editReply(`✅ Event **${title}** created successfully.`);
  }
};
