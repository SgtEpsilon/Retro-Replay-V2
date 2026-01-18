const { EmbedBuilder } = require('discord.js');
const { config } = require('../utils/constants');

async function helpHandler(i) {
  const helpEmbed = new EmbedBuilder()
    .setColor(0x00b0f4)
    .setTitle('🍸 Retro Replay Bot – Command List')
    .setDescription('Below is a list of all available commands and what they do.')
    .addFields(
      {
        name: '📋 User Commands',
        value: [
          '`/mysignups` – View all shifts you are signed up for',
          '`/nextshift` – View the next upcoming shift',
          '`/areweopen` – Check if the venue is open today',
          '`/help` – Display this help message'
        ].join('\n'),
        inline: false
      },
      {
        name: '📅 Event & Schedule Commands',
        value: [
          '`/createevent` – Create a new shift event (opens modal)',
          '`/cancelevent <messageId>` – Cancel an existing event',
          '`/editeventtime <messageId> <date/time>` – Edit event start time (DD-MM-YYYY h:mm AM/PM)',
          '`/repost` – Repost the next upcoming shift signup',
          '`/post` – Manually post scheduled events',
          '`/generate` – Generate the weekly schedule',
          '`/weeklyschedule` – View the current weekly schedule',
          '`/refresh <messageId>` – Refresh a signup embed'
        ].join('\n'),
        inline: false
      },
      {
        name: '👥 Role Management Commands',
        value: [
          '`/enable <role>` – Enable a role for backup alerts',
          '`/disable <role>` – Disable a role from backup alerts'
        ].join('\n'),
        inline: false
      },
      {
        name: '🚫 Blackout Date Commands',
        value: [
          '`/blackout add <date>` – Add a blackout date (YYYY-MM-DD)',
          '`/blackout remove <date>` – Remove a blackout date',
          '`/blackout list` – List all blackout dates'
        ].join('\n'),
        inline: false
      },
      {
        name: '🤖 Bot Status Commands',
        value: [
          '`/setstatus <text> [type]` – Set a custom bot status',
          '`/statusclear` – Clear custom status and resume rotation',
          '`/statusreload` – Reload rotating status presets'
        ].join('\n'),
        inline: false
      },
      {
        name: '📝 How to Sign Up for Shifts',
        value: [
          'React to the shift post with the corresponding emoji:',
          '1️⃣ Active Manager',
          '2️⃣ Backup Manager',
          '3️⃣ Bouncer',
          '4️⃣ Bartender',
          '5️⃣ Dancer',
          '6️⃣ DJ'
        ].join('\n'),
        inline: false
      },
      {
        name: '🔐 Permission Requirements',
        value: `Management commands require one of the following roles:\n**${config.eventCreatorRoles.join(', ')}**`,
        inline: false
      }
    )
    .setFooter({
      text: 'Retro Replay Bot • Stable Release V1.0.3'
    })
    .setTimestamp();

  return await i.reply({
    embeds: [helpEmbed],
    ephemeral: true
  });
}

module.exports = helpHandler;
