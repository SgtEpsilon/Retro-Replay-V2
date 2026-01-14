const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { hasEventPermission } = require('../util/permissions');
const { events, saveEvents } = require('../services/eventStore');
const {
  formatEST,
  buildSignupList,
  roleConfig,
  getEarliestUpcomingEvent
} = require('../services/eventHelpers');
const config = require('../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('repostevent')
    .setDescription('Repost the earliest upcoming event (copies signups)'),

  async execute(interaction) {
    if (!hasEventPermission(interaction.member)) {
      return interaction.reply({
        content: '❌ Only event creators can repost events.',
        ephemeral: true
      });
    }

    const ev = getEarliestUpcomingEvent();
    if (!ev) {
      return interaction.reply({
        content: '❌ No upcoming events to repost.',
        ephemeral: true
      });
    }

    const channel = await interaction.client.channels.fetch(
      ev.channelId || config.signupChannelId
    );

    if (!channel) {
      return interaction.reply({
        content: '❌ Cannot access signup channel.',
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0x00b0f4)
      .setTitle(ev.title)
      .setDescription(
        `🕒 **When:** ${formatEST(ev.datetime)} (EST)\n\n${buildSignupList(ev.signups)}`
      )
      .setTimestamp();

    const msg = await channel.send({ embeds: [embed] });

    events[msg.id] = {
      title: ev.title,
      datetime: ev.datetime,
      channelId: channel.id,
      signups: JSON.parse(JSON.stringify(ev.signups)),
      cancelled: false
    };

    saveEvents();

    for (const emoji of Object.keys(roleConfig)) {
      await msg.react(emoji);
    }

    return interaction.reply({
      content: `🔁 Reposted **${ev.title}** with signups copied.`,
      ephemeral: true
    });
  }
};
