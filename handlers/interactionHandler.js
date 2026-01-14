const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

const { DateTime } = require('luxon');
const config = require('../config.json');
const { events, saveEvents } = require('../services/eventStore');
const { roleConfig, formatEST } = require('../services/eventHelpers');
const { hasEventPermission } = require('../util/permissions');

const TIMEZONE = 'America/New_York';

module.exports = async (client, interaction) => {

  /* ───────── SLASH COMMANDS ───────── */
  if (interaction.isChatInputCommand()) {
    const command = require(`../commands/${interaction.commandName}`);
    if (command?.execute) {
      await command.execute(interaction, client);
    }
  }

  /* ───────── MODAL SUBMIT ───────── */
  if (interaction.isModalSubmit() && interaction.customId === 'createevent_modal') {
    if (!hasEventPermission(interaction.member)) {
      return interaction.reply({ content: '❌ No permission.', ephemeral: true });
    }

    const rawTitle = interaction.fields.getTextInputValue('title');
    const input = interaction.fields.getTextInputValue('datetime');
    const description = interaction.fields.getTextInputValue('description');

    const dt = DateTime.fromFormat(input, 'yyyy-MM-dd HH:mm', { zone: TIMEZONE });
    if (!dt.isValid) {
      return interaction.reply({
        content: '❌ Invalid date format.',
        ephemeral: true
      });
    }

    const title =
      rawTitle?.trim() ||
      `${dt.toFormat('EEEE')} Night Event`;

    const previewEmbed = new EmbedBuilder()
      .setColor(0x00b0f4)
      .setTitle(title)
      .setDescription(
        `🕒 **When:** ${formatEST(dt.toMillis())} (EST)\n\n` +
        (description || '_No description_')
      )
      .setFooter({ text: 'Preview — confirm to post' });

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('confirm_create_event')
        .setLabel('Confirm')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('cancel_create_event')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Danger)
    );

    interaction.client.tempEventCreate ??= {};
    interaction.client.tempEventCreate[interaction.user.id] = {
      title,
      description,
      datetime: dt.toMillis()
    };

    return interaction.reply({
      embeds: [previewEmbed],
      components: [buttons],
      ephemeral: true
    });
  }

  /* ───────── BUTTONS ───────── */
  if (interaction.isButton()) {
    const temp = interaction.client.tempEventCreate?.[interaction.user.id];
    if (!temp) return interaction.reply({ content: '❌ Session expired.', ephemeral: true });

    if (interaction.customId === 'cancel_create_event') {
      delete interaction.client.tempEventCreate[interaction.user.id];
      return interaction.update({ content: '❌ Event creation cancelled.', embeds: [], components: [] });
    }

    if (interaction.customId === 'confirm_create_event') {
      const channel = await client.channels.fetch(config.signupChannelId);

      const embed = new EmbedBuilder()
        .setColor(0x00b0f4)
        .setTitle(temp.title)
        .setDescription(
          `🕒 **When:** ${formatEST(temp.datetime)} (EST)\n\n${temp.description || '_No description_'}`
        )
        .setTimestamp();

      const msg = await channel.send({ embeds: [embed] });

      events[msg.id] = {
        title: temp.title,
        datetime: temp.datetime,
        channelId: channel.id,
        signups: {},
        cancelled: false
      };

      saveEvents();

      for (const emoji of Object.keys(roleConfig)) {
        await msg.react(emoji);
      }

      delete interaction.client.tempEventCreate[interaction.user.id];

      return interaction.update({
        content: '✅ Event created successfully.',
        embeds: [],
        components: []
      });
    }
  }
};
