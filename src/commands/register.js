const { REST, Routes, SlashCommandBuilder } = require('discord.js');
const { TOKEN, CLIENT_ID } = require('../utils/constants');

const commands = [
  new SlashCommandBuilder()
    .setName('createevent')
    .setDescription('Create a new shift event'),

  new SlashCommandBuilder()
    .setName('mysignups')
    .setDescription('View your upcoming signups'),

  new SlashCommandBuilder()
    .setName('nextshift')
    .setDescription('View the next upcoming shift'),

  new SlashCommandBuilder()
    .setName('areweopen')
    .setDescription('Check if the bar is open today'),

  new SlashCommandBuilder()
    .setName('cancelevent')
    .setDescription('Cancel an event')
    .addStringOption(o =>
      o.setName('messageid').setDescription('Event message ID').setRequired(true)),

  new SlashCommandBuilder()
    .setName('editeventtime')
    .setDescription('Edit event start time')
    .addStringOption(o =>
      o.setName('messageid')
        .setDescription('Event message ID')
        .setRequired(true))
    .addStringOption(o =>
      o.setName('datetime')
        .setDescription('DD-MM-YYYY h:mm AM/PM')
        .setRequired(true)),

  new SlashCommandBuilder()
    .setName('setstatus')
    .setDescription('Set custom bot status')
    .addStringOption(o =>
      o.setName('status')
        .setDescription('Status text')
        .setRequired(true))
    .addStringOption(o =>
      o.setName('type')
        .setDescription('Activity type')
        .addChoices(
          { name: 'Playing', value: 'Playing' },
          { name: 'Watching', value: 'Watching' },
          { name: 'Listening', value: 'Listening' },
          { name: 'Competing', value: 'Competing' }
        )),

  new SlashCommandBuilder()
    .setName('statusclear')
    .setDescription('Clear custom status and return to default'),

  new SlashCommandBuilder()
    .setName('addblackout')
    .setDescription('Add a blackout date (no shifts)')
    .addStringOption(o =>
      o.setName('date')
        .setDescription('Date (MM-DD-YYYY)')
        .setRequired(true)),

  new SlashCommandBuilder()
    .setName('removeblackout')
    .setDescription('Remove a blackout date')
    .addStringOption(o =>
      o.setName('date')
        .setDescription('Date (MM-DD-YYYY)')
        .setRequired(true)),

  new SlashCommandBuilder()
    .setName('listblackouts')
    .setDescription('List all blackout dates'),

  new SlashCommandBuilder()
    .setName('enable')
    .setDescription('Enable a role for signups')
    .addStringOption(o =>
      o.setName('role')
        .setDescription('Role to enable')
        .setRequired(true)
        .addChoices(
          { name: 'Active Manager', value: 'Active Manager' },
          { name: 'Backup Manager', value: 'Backup Manager' },
          { name: 'Bouncer', value: 'Bouncer' },
          { name: 'Bartender', value: 'Bartender' },
          { name: 'Dancer', value: 'Dancer' },
          { name: 'DJ', value: 'DJ' }
        )),

  new SlashCommandBuilder()
    .setName('disable')
    .setDescription('Disable a role for signups')
    .addStringOption(o =>
      o.setName('role')
        .setDescription('Role to disable')
        .setRequired(true)
        .addChoices(
          { name: 'Active Manager', value: 'Active Manager' },
          { name: 'Backup Manager', value: 'Backup Manager' },
          { name: 'Bouncer', value: 'Bouncer' },
          { name: 'Bartender', value: 'Bartender' },
          { name: 'Dancer', value: 'Dancer' },
          { name: 'DJ', value: 'DJ' }
        )),

  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Display all available commands'),

  new SlashCommandBuilder()
    .setName('refresh')
    .setDescription('Refresh a shift signup embed')
    .addStringOption(o =>
      o.setName('messageid').setDescription('Event message ID').setRequired(true)),

  new SlashCommandBuilder()
    .setName('repost')
    .setDescription('Repost the latest upcoming shift event'),

new SlashCommandBuilder()
    .setName('weeklyschedule')
    .setDescription('View all events scheduled for the next 7 days'),

new SlashCommandBuilder()
    .setName('generate')
    .setDescription('Manually generate the weekly shift schedule'),

  new SlashCommandBuilder()
    .setName('post')
    .setDescription('Post scheduled events to Discord')
];
async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(TOKEN);

  try {
    await rest.put(Routes.applicationCommands(CLIENT_ID), {
      body: commands.map(c => c.toJSON())
    });
    console.log('✅ Slash commands registered');
  } catch (err) {
    console.error('❌ Error registering commands:', err);
  }
}

module.exports = { registerCommands };