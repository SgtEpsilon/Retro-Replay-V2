const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} = require('discord.js');

const { DateTime } = require('luxon');
const { hasEventPermission } = require('../util/permissions');
const config = require('../config.json');

const TIMEZONE = 'America/New_York';

function getNextOpenDay() {
  const now = DateTime.now().setZone(TIMEZONE);

  for (let i = 0; i < 14; i++) {
    const day = now.plus({ days: i });
    if (config.openDays.includes(day.toFormat('EEEE'))) {
      return day.set({ hour: 22, minute: 0, second: 0 });
    }
  }
  return now.plus({ days: 1 }).set({ hour: 22, minute: 0 });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('createevent')
    .setDescription('Create a new event (form-based)'),

  async execute(interaction) {
    if (!hasEventPermission(interaction.member)) {
      return interaction.reply({
        content: '❌ No permission.',
        ephemeral: true
      });
    }

    const defaultDate = getNextOpenDay().toFormat('yyyy-MM-dd HH:mm');

    const modal = new ModalBuilder()
      .setCustomId('createevent_modal')
      .setTitle('Create Event');

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('title')
          .setLabel('Event Title (optional)')
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('datetime')
          .setLabel('Date & Time (EST)')
          .setValue(defaultDate)
          .setPlaceholder('YYYY-MM-DD HH:mm')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('description')
          .setLabel('Event Description (optional)')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(false)
      )
    );

    await interaction.showModal(modal);
  }
};
