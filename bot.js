/***********************
 * Retro Replay Bot Rewrite V2.2.0
 * Discord.js v14
 ***********************/

process.removeAllListeners('warning');
process.env.NODE_NO_WARNINGS = '1';

require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActivityType,
  REST,
  Routes,
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} = require('discord.js');

const fs = require('fs');
const path = require('path');
const { DateTime } = require('luxon');
const config = require('./config.json');

/* ───────── CONFIG ───────── */
const TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

const TIMEZONE = config.timezone;
const AUTO_POST_TIMEZONE = config.autoPostTimezone;
const AUTO_POST_HOUR = config.autoPostHour;
const SHIFT_START_HOUR = config.shiftStartHour;

const DATA_FILE = path.join(__dirname, 'scheduled_events.json');
const AUTO_POST_FILE = path.join(__dirname, 'auto_posted.json');
const BLACKOUT_FILE = path.join(__dirname, 'blackout_dates.json');
const SHIFT_LOG_FILE = path.join(__dirname, 'shift_logs.json');
const DISABLED_ROLES_FILE = path.join(__dirname, 'disabled_roles.json');

const SIGNUP_CHANNEL = config.signupChannelId;
const BAR_STAFF_ROLE_ID = config.barStaffRoleId;

/* ───────── CLIENT ───────── */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Message, Partials.Reaction, Partials.Channel]
});

/* ───────── STORAGE ───────── */
let events = {};
let reminderTimers = {};
let backupAlertTimers = {};
let autoPosted = {};
let blackoutDates = [];
let shiftLogs = [];
let disabledRoles = [];

function load(file, fallback) {
  try {
    return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : fallback;
  } catch {
    return fallback;
  }
}

events = load(DATA_FILE, {});
autoPosted = load(AUTO_POST_FILE, {});
blackoutDates = load(BLACKOUT_FILE, []);
shiftLogs = load(SHIFT_LOG_FILE, []);
disabledRoles = load(DISABLED_ROLES_FILE, []);

const save = (file, data) =>
  fs.writeFileSync(file, JSON.stringify(data, null, 2));

/* ───────── HELPERS ───────── */
function hasEventPermission(member) {
  return member.roles.cache.some(r =>
    config.eventCreatorRoles.includes(r.name)
  );
}

function formatTime(ms) {
  return DateTime.fromMillis(ms)
    .setZone(TIMEZONE)
    .toFormat('dd-MM-yyyy h:mm a');
}

const roleConfig = {
  '1️⃣': 'Active Manager',
  '2️⃣': 'Backup Manager',
  '3️⃣': 'Bouncer',
  '4️⃣': 'Bartender',
  '5️⃣': 'Dancer',
  '6️⃣': 'DJ'
};

function buildSignupList(signups) {
  return Object.entries(roleConfig).map(([emoji, role]) => {
    if (disabledRoles.includes(role))
      return `**${emoji} ${role}:** ~~Disabled~~`;

    const users = signups[role] || [];
    return `**${emoji} ${role}:**\n${
      users.length
        ? users.map(u => `• <@${u}>`).join('\n')
        : '*No signups yet*'
    }`;
  }).join('\n\n');
}

/* ───────── SCHEDULING ───────── */
function scheduleReminder(id) {
  const ev = events[id];
  if (!ev || ev.cancelled) return;

  const delay = ev.datetime - Date.now();
  if (delay <= 0) return;

  reminderTimers[id] = setTimeout(async () => {
    try {
      const channel = await client.channels.fetch(ev.channelId);
      await channel.send(`🔔 **Shift starting now!** <@&${BAR_STAFF_ROLE_ID}>`);
      shiftLogs.push({ ...ev, timestamp: Date.now() });
      save(SHIFT_LOG_FILE, shiftLogs);
    } catch {}
  }, delay);
}

function scheduleBackupAlert(id) {
  const ev = events[id];
  if (!ev || ev.cancelled) return;

  const alertTime = ev.datetime - 2 * 60 * 60 * 1000;
  const delay = alertTime - Date.now();
  if (delay <= 0) return;

  backupAlertTimers[id] = setTimeout(async () => {
    const missing = Object.values(roleConfig).filter(
      r => !disabledRoles.includes(r) && !(ev.signups[r]?.length)
    );
    if (!missing.length) return;

    try {
      const channel = await client.channels.fetch(ev.channelId);
      await channel.send(
        `⚠️ **BACKUP NEEDED**\nMissing: **${missing.join(', ')}**\n<@&${BAR_STAFF_ROLE_ID}>`
      );
    } catch {}
  }, delay);
}

/* ───────── SLASH COMMANDS ───────── */
const commands = [
  new SlashCommandBuilder().setName('mysignups').setDescription('View your upcoming signups'),

  new SlashCommandBuilder()
    .setName('cancelevent')
    .setDescription('Cancel an event')
    .addStringOption(o =>
      o.setName('messageid').setDescription('Event message ID').setRequired(true)),

  new SlashCommandBuilder()
    .setName('editeventtime')
    .setDescription('Edit event start time')
    .addStringOption(o =>
      o.setName('messageid').setRequired(true))
    .addStringOption(o =>
      o.setName('datetime')
        .setDescription('DD-MM-YYYY h:mm AM/PM')
        .setRequired(true))
];

const rest = new REST({ version: '10' }).setToken(TOKEN);
rest.put(Routes.applicationCommands(CLIENT_ID), {
  body: commands.map(c => c.toJSON())
});

/* ───────── INTERACTIONS ───────── */
client.on('interactionCreate', async i => {

  /* MY SIGNUPS */
  if (i.commandName === 'mysignups') {
    const userId = i.user.id;
    const results = [];

    for (const ev of Object.values(events)) {
      if (ev.cancelled || ev.datetime < Date.now()) continue;
      for (const [role, users] of Object.entries(ev.signups)) {
        if (users.includes(userId))
          results.push(`• **${ev.title}** — ${role}\n  🕒 ${formatTime(ev.datetime)}`);
      }
    }

    return i.reply({
      content: results.length
        ? `📝 **Your Signups:**\n\n${results.join('\n')}`
        : '📭 You are not signed up for any upcoming shifts.',
      ephemeral: true
    });
  }

  /* CANCEL EVENT */
  if (i.commandName === 'cancelevent') {
    if (!hasEventPermission(i.member))
      return i.reply({ content: '❌ No permission.', ephemeral: true });

    const id = i.options.getString('messageid');
    const ev = events[id];
    if (!ev || ev.cancelled)
      return i.reply({ content: '⚠️ Event not found.', ephemeral: true });

    ev.cancelled = true;
    save(DATA_FILE, events);
    clearTimeout(reminderTimers[id]);
    clearTimeout(backupAlertTimers[id]);

    try {
      const ch = await client.channels.fetch(ev.channelId);
      const msg = await ch.messages.fetch(id);
      await msg.edit({
        embeds: [
          new EmbedBuilder()
            .setColor(0xff0000)
            .setTitle(`❌ CANCELLED — ${ev.title}`)
            .setDescription('This shift has been cancelled.')
        ]
      });
    } catch {}

    return i.reply({ content: '✅ Event cancelled.', ephemeral: true });
  }

  /* EDIT EVENT TIME */
  if (i.commandName === 'editeventtime') {
    if (!hasEventPermission(i.member))
      return i.reply({ content: '❌ No permission.', ephemeral: true });

    const id = i.options.getString('messageid');
    const dtStr = i.options.getString('datetime');
    const ev = events[id];

    if (!ev || ev.cancelled)
      return i.reply({ content: '⚠️ Event not found.', ephemeral: true });

    const dt = DateTime.fromFormat(dtStr, 'dd-MM-yyyy h:mm a', { zone: TIMEZONE });
    if (!dt.isValid)
      return i.reply({ content: '❌ Invalid date format.', ephemeral: true });

    ev.datetime = dt.toMillis();
    save(DATA_FILE, events);

    clearTimeout(reminderTimers[id]);
    clearTimeout(backupAlertTimers[id]);
    scheduleReminder(id);
    scheduleBackupAlert(id);

    try {
      const ch = await client.channels.fetch(ev.channelId);
      const msg = await ch.messages.fetch(id);

      await msg.edit({
        embeds: [
          new EmbedBuilder()
            .setColor(0x00b0f4)
            .setTitle(ev.title)
            .setDescription(
              `🕒 **When:** ${formatTime(ev.datetime)}\n\n${buildSignupList(ev.signups)}`
            )
        ]
      });
    } catch {}

    return i.reply({ content: '✅ Event time updated.', ephemeral: true });
  }
});

/* ───────── READY ───────── */
client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  Object.keys(events).forEach(id => {
    scheduleReminder(id);
    scheduleBackupAlert(id);
  });
});

client.login(TOKEN);
