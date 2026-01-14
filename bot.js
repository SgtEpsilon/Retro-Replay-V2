/***********************
 * Retro Replay Bot v29
 * Discord.js v14
 * Event Cancel, Repost (copy signups), List Events (All / Upcoming)
 ***********************/

process.removeAllListeners('warning');
process.env.NODE_NO_WARNINGS = '1';

require('dotenv').config();

const {
  Client, GatewayIntentBits, Partials,
  EmbedBuilder, ActivityType,
  REST, Routes, SlashCommandBuilder
} = require('discord.js');

const fs = require('fs');
const path = require('path');
const { DateTime } = require('luxon');
const config = require('./config.json');

/* ───────── CONFIG ───────── */
config.token = process.env.BOT_TOKEN;
config.clientId = process.env.CLIENT_ID;

const TIMEZONE = 'America/New_York';
const DATA_FILE = path.join(__dirname, 'scheduled_events.json');
const SIGNUP_CHANNEL = config.signupChannelId;

/* ───────── CLIENT ───────── */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Message, Partials.Reaction, Partials.Channel]
});

/* ───────── STORAGE ───────── */
let events = {};
function loadEvents() {
  if (!fs.existsSync(DATA_FILE)) return;
  try { events = JSON.parse(fs.readFileSync(DATA_FILE)); }
  catch { events = {}; }
}
function saveEvents() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(events, null, 2));
}
loadEvents();

/* ───────── PERMISSIONS ───────── */
function hasEventPermission(member) {
  return member?.roles.cache.some(r =>
    config.eventCreatorRoles.map(x => x.toLowerCase()).includes(r.name.toLowerCase())
  );
}

/* ───────── ROLES ───────── */
const roleConfig = {
  '1️⃣': 'Active Manager',
  '2️⃣': 'Backup Manager',
  '3️⃣': 'Bouncer',
  '4️⃣': 'Bartender',
  '5️⃣': 'Dancer',
  '6️⃣': 'DJ'
};

/* ───────── HELPERS ───────── */
function formatEST(ms) {
  return DateTime.fromMillis(ms).setZone(TIMEZONE).toFormat('dd-MM-yyyy hh:mm a');
}

function buildSignupList(signups) {
  return Object.entries(roleConfig).map(([emoji, role]) => {
    const users = signups[role] || [];
    return `**${emoji} ${role}:**\n${
      users.length ? users.map(u => `• <@${u}>`).join('\n') : '*No signups yet*'
    }`;
  }).join('\n\n');
}

async function fetchChannelSafe(id) {
  try { return await client.channels.fetch(id); }
  catch { return null; }
}

async function updateEmbed(messageId) {
  const ev = events[messageId];
  if (!ev) return;

  const channel = await fetchChannelSafe(ev.channelId);
  if (!channel) return;

  try {
    const msg = await channel.messages.fetch(messageId);
    const embed = new EmbedBuilder()
      .setColor(ev.cancelled ? 0xff0000 : 0x00b0f4)
      .setTitle(ev.title)
      .setDescription(
        ev.cancelled
          ? '❌ **EVENT CANCELLED**'
          : `🕒 **When:** ${formatEST(ev.datetime)} (EST)\n\n${buildSignupList(ev.signups)}`
      )
      .setTimestamp();

    await msg.edit({ embeds: [embed] });
  } catch {}
}

function getSortedEvents({ upcomingOnly = false } = {}) {
  const now = Date.now();

  return Object.entries(events)
    .map(([id, ev]) => ({ id, ...ev }))
    .filter(ev => {
      if (upcomingOnly) {
        return !ev.cancelled && ev.datetime > now;
      }
      return true;
    })
    .sort((a, b) => a.datetime - b.datetime);
}

function getEarliestUpcomingEvent() {
  return getSortedEvents({ upcomingOnly: true })[0] || null;
}

/* ───────── SLASH COMMANDS ───────── */
const commands = [
  new SlashCommandBuilder()
    .setName('cancelevent')
    .setDescription('Cancel an existing event')
    .addStringOption(o =>
      o.setName('messageid')
        .setDescription('Event message ID')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('repostevent')
    .setDescription('Repost the earliest upcoming event (copies signups)'),

  new SlashCommandBuilder()
    .setName('listevents')
    .setDescription('List scheduled events')
    .addStringOption(o =>
      o.setName('filter')
        .setDescription('Which events to list')
        .addChoices(
          { name: 'All events', value: 'all' },
          { name: 'Upcoming only', value: 'upcoming' }
        )
    )
];

const rest = new REST({ version: '10' }).setToken(config.token);
(async () => {
  await rest.put(
    Routes.applicationCommands(config.clientId),
    { body: commands.map(c => c.toJSON()) }
  );
})();

/* ───────── INTERACTIONS ───────── */
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  /* ── LIST EVENTS ── */
  if (interaction.commandName === 'listevents') {
    if (!hasEventPermission(interaction.member))
      return interaction.reply({ content: '❌ No permission.', ephemeral: true });

    const filter = interaction.options.getString('filter') || 'all';
    const list = getSortedEvents({ upcomingOnly: filter === 'upcoming' });

    if (!list.length)
      return interaction.reply({ content: '📭 No events found.', ephemeral: true });

    let output = list.map(ev =>
      `**${ev.title}**\n` +
      `🕒 ${formatEST(ev.datetime)} (EST)\n` +
      `🆔 \`${ev.id}\`\n` +
      `${ev.cancelled ? '❌ CANCELLED' : '✅ ACTIVE'}`
    ).join('\n\n');

    if (output.length > 1900) {
      output = output.slice(0, 1900) + '\n…';
    }

    return interaction.reply({ content: output, ephemeral: true });
  }

  /* ── CANCEL EVENT ── */
  if (interaction.commandName === 'cancelevent') {
    if (!hasEventPermission(interaction.member))
      return interaction.reply({ content: '❌ No permission.', ephemeral: true });

    const id = interaction.options.getString('messageid');
    const ev = events[id];

    if (!ev)
      return interaction.reply({ content: '❌ Event not found.', ephemeral: true });

    if (ev.cancelled)
      return interaction.reply({ content: '⚠️ Already cancelled.', ephemeral: true });

    ev.cancelled = true;
    saveEvents();
    await updateEmbed(id);

    return interaction.reply({
      content: `✅ Cancelled **${ev.title}**`,
      ephemeral: true
    });
  }

  /* ── REPOST EVENT ── */
  if (interaction.commandName === 'repostevent') {
    if (!hasEventPermission(interaction.member))
      return interaction.reply({ content: '❌ No permission.', ephemeral: true });

    const ev = getEarliestUpcomingEvent();
    if (!ev)
      return interaction.reply({ content: '❌ No upcoming events.', ephemeral: true });

    const channel = await fetchChannelSafe(ev.channelId || SIGNUP_CHANNEL);
    if (!channel)
      return interaction.reply({ content: '❌ Cannot access channel.', ephemeral: true });

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
});

/* ───────── REACTIONS ───────── */
client.on('messageReactionAdd', async (reaction, user) => {
  if (user.bot) return;
  const ev = events[reaction.message.id];
  const role = roleConfig[reaction.emoji.name];
  if (!ev || !role || ev.cancelled) return;

  ev.signups[role] ??= [];
  if (!ev.signups[role].includes(user.id))
    ev.signups[role].push(user.id);

  saveEvents();
  updateEmbed(reaction.message.id);
});

client.on('messageReactionRemove', async (reaction, user) => {
  if (user.bot) return;
  const ev = events[reaction.message.id];
  const role = roleConfig[reaction.emoji.name];
  if (!ev || !role || ev.cancelled) return;

  ev.signups[role] =
    (ev.signups[role] || []).filter(id => id !== user.id);

  saveEvents();
  updateEmbed(reaction.message.id);
});

/* ───────── READY ───────── */
client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  client.user.setPresence({
    activities: [{ name: 'Retro Replay', type: ActivityType.Watching }],
    status: 'online'
  });
});

/* ───────── LOGIN ───────── */
if (!config.token || !config.clientId) {
  console.error('❌ Missing BOT_TOKEN or CLIENT_ID');
  process.exit(1);
}
client.login(config.token);
