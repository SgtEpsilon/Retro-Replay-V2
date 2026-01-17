const { EmbedBuilder } = require('discord.js');
const { config } = require('../utils/constants');

async function helpHandler(i) {
  const helpEmbed = new EmbedBuilder()
    .setColor(0x00b0f4)
    .setTitle('🍸 Retro Replay Bot - Command List')
    .setDescription('Here are all available commands:')
    .addFields(
      {
        name: '📋 User Commands',
        value: [
          '`/mysignups` - View your upcoming shift signups',
          '`/nextshift` - View the next upcoming shift',
          '`/areweopen` - Check if the bar is open today',
          '`/refresh <messageid>` - Refresh a shift signup embed',
          '`/help` - Display this help message'
        ].join('\n'),
        inline: false
      },
      {
        name: '⚙️ Event Management Commands',
        value: [
          '`/createevent` - Create a new shift event (opens modal)',
          '`/cancelevent <messageid>` - Cancel a scheduled event',
          '`/editeventtime <messageid> <datetime>` - Edit event start time (DD-MM-YYYY h:mm AM/PM)',
          '`/repost` - Repost the latest upcoming shift (deletes old post)'
        ].join('\n'),
        inline: false
      },
      {
        name: '👥 Role Management Commands',
        value: [
          '`/enable <role>` - Enable a role for signups',
          '`/disable <role>` - Disable a role for signups'
        ].join('\n'),
        inline: false
      },
      {
        name: '🚫 Blackout Date Commands',
        value: [
          '`/addblackout <date>` - Add a blackout date (YYYY-MM-DD format, prevents auto-posting)',
          '`/removeblackout <date>` - Remove a blackout date (YYYY-MM-DD format)',
          '`/listblackouts` - List all blackout dates'
        ].join('\n'),
        inline: false
      },
      {
        name: '🤖 Bot Status Commands',
        value: [
          '`/setstatus <status> [type]` - Set a custom bot status',
          '`/statusclear` - Clear custom status and revert to default'
        ].join('\n'),
        inline: false
      },
      {
        name: '📝 How to Sign Up',
        value: 'React with the appropriate emoji on shift posts:\n1️⃣ Active Manager\n2️⃣ Backup Manager\n3️⃣ Bouncer\n4️⃣ Bartender\n5️⃣ Dancer\n6️⃣ DJ',
        inline: false
      },
      {
        name: '🔐 Permission Requirements',
        value: `Management commands require one of these roles: **${config.eventCreatorRoles.join(', ')}**`,
        inline: false
      }
    )
    .setFooter({ text: 'Bot automatically posts shifts on configured open days at the scheduled time' })
    .setTimestamp();

  return await i.reply({ embeds: [helpEmbed], ephemeral: true });
}

module.exports = helpHandler;