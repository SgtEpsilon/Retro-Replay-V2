/***********************
 * Retro Replay Bot v29.4
 * Discord.js v14
 * Event Cancel, Repost (copy signups), List Events
 ***********************/
process.removeAllListeners('warning');
process.env.NODE_NO_WARNINGS = '1';

require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  Partials,
  ActivityType
} = require('discord.js');

const config = require('./config.json');

/* ───────── CLIENT (MUST COME FIRST) ───────── */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent
  ],
  partials: [
    Partials.Message,
    Partials.Reaction,
    Partials.Channel
  ]
});

/* ───────── HANDLERS ───────── */
const interactionHandler = require('./handlers/interactionHandler');
const reactionHandler = require('./handlers/reactionHandler');

/* ───────── INTERACTIONS ───────── */
client.on('interactionCreate', async interaction => {
  try {
    await interactionHandler(interaction);
  } catch (err) {
    console.error('❌ Interaction handler error:', err);
  }
});

const fs = require('fs');
const path = require('path');

/* ───────── LOAD COMMANDS ───────── */
client.commands = new Map();

const commandsPath = path.join(__dirname, 'commands');

if (!fs.existsSync(commandsPath)) {
  console.error('❌ commands folder not found:', commandsPath);
} else {
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter(file => file.endsWith('.js'));

  console.log('📦 Loading commands:', commandFiles);

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);

    try {
      const command = require(filePath);

      if (!command.data || !command.execute) {
        console.warn(`⚠️ Invalid command file skipped: ${file}`);
        continue;
      }

      client.commands.set(command.data.name, command);
      console.log(`✅ Loaded command: ${command.data.name}`);

    } catch (err) {
      console.error(`❌ Failed to load command ${file}:`, err);
    }
  }
}


/* ───────── REACTIONS ───────── */
client.on('messageReactionAdd', (reaction, user) =>
  reactionHandler.add(reaction, user)
);

client.on('messageReactionRemove', (reaction, user) =>
  reactionHandler.remove(reaction, user)
);

/* ───────── READY ───────── */
client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  client.user.setPresence({
    activities: [{ name: 'Retro Replay', type: ActivityType.Watching }],
    status: 'online'
  });
});

/* ───────── LOGIN ───────── */
if (!process.env.BOT_TOKEN) {
  console.error('❌ BOT_TOKEN missing from .env');
  process.exit(1);
}

client.login(process.env.BOT_TOKEN);