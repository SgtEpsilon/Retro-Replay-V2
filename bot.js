/***********************
 * Retro Replay Bot v29.3
 * Discord.js v14
 * Event Cancel, Repost (copy signups), List Events
 ***********************/
require('dotenv').config();
process.removeAllListeners('warning');
process.env.NODE_NO_WARNINGS = '1';

const { Client, GatewayIntentBits, Partials, ActivityType, REST, Routes } = require('discord.js');
const config = require('./config.json');
const { loadEvents } = require('./services/eventStore');
const interactionHandler = require('./handlers/interactionHandler');
const reactionHandler = require('./handlers/reactionHandler');

config.token = process.env.BOT_TOKEN;
config.clientId = process.env.CLIENT_ID;

if (!config.token || !config.clientId) {
  console.error('❌ Missing BOT_TOKEN or CLIENT_ID');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions
  ],
  partials: [Partials.Message, Partials.Reaction, Partials.Channel]
});

loadEvents();

client.on('interactionCreate', i => interactionHandler(client, i));
client.on('messageReactionAdd', (...args) => reactionHandler.add(...args));
client.on('messageReactionRemove', (...args) => reactionHandler.remove(...args));

client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  client.user.setPresence({
    activities: [{ name: 'Retro Replay', type: ActivityType.Watching }],
    status: 'online'
  });

const commands = [
  require('./commands/createevent'),
  require('./commands/cancelevent'),
  require('./commands/repostevent'),
  require('./commands/listevents')
];


  const rest = new REST({ version: '10' }).setToken(config.token);
  await rest.put(
    Routes.applicationCommands(config.clientId),
    { body: commands.map(c => c.data.toJSON()) }
  );

  console.log('✅ Slash commands registered');
});

client.login(config.token);
