const { SlashCommandBuilder } = require('discord.js');
const { hasEventPermission } = require('../util/permissions');
const { getSortedEvents, formatEST } = require('../services/eventHelpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('listevents')
    .setDescription('List scheduled events')
    .addStringOption(option =>
      option
        .setName('filter')
        .setDescription('Which events to list')
        .addChoices(
          { name: 'All events', value: 'all' },
          { name: 'Upcoming only', value: 'upcoming' }
        )
    ),

  async execute(interaction) {
    if (!hasEventPermission(interaction.member)) {
      return interaction.reply({
        content: '❌ You do not have permission to list events.',
        ephemeral: true
      });
    }

    const filter = interaction.options.getString('filter') || 'all';
    const events = getSortedEvents(filter === 'upcoming');

    if (!events.length) {
      return interaction.reply({
        content: '📭 No events found.',
        ephemeral: true
      });
    }

    let output = events.map(ev =>
      `**${ev.title}**\n` +
      `🕒 ${formatEST(ev.datetime)} (EST)\n` +
      `🆔 \`${ev.id}\`\n` +
      `${ev.cancelled ? '❌ CANCELLED' : '✅ ACTIVE'}`
    ).join('\n\n');

    if (output.length > 1900) {
      output = output.slice(0, 1900) + '\n…';
    }

    return interaction.reply({
      content: output,
      ephemeral: true
    });
  }
};
