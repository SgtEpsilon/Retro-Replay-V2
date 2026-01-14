const { SlashCommandBuilder } = require('discord.js');
const { hasEventPermission } = require('../util/permissions');
const { events, saveEvents } = require('../services/eventStore');
const { updateEmbed } = require('../services/updateEmbed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cancelevent')
    .setDescription('Cancel an existing event')
    .addStringOption(option =>
      option
        .setName('messageid')
        .setDescription('Event message ID')
        .setRequired(true)
    ),

  async execute(interaction) {
    if (!hasEventPermission(interaction.member)) {
      return interaction.reply({
        content: '❌ You do not have permission to cancel events.',
        ephemeral: true
      });
    }

    const messageId = interaction.options.getString('messageid');
    const ev = events[messageId];

    if (!ev) {
      return interaction.reply({
        content: '❌ Event not found.',
        ephemeral: true
      });
    }

    if (ev.cancelled) {
      return interaction.reply({
        content: '⚠️ This event is already cancelled.',
        ephemeral: true
      });
    }

    ev.cancelled = true;
    saveEvents();
    await updateEmbed(messageId, interaction.client);

    return interaction.reply({
      content: `✅ Cancelled **${ev.title}**.`,
      ephemeral: true
    });
  }
};
