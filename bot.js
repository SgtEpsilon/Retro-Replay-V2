/***********************
 * Retro Replay Bot v29.6
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
const TIMEZONE = 'America/New_York';
const DATA_FILE = path.join(__dirname, 'scheduled_events.json');
const SIGNUP_CHANNEL = config.signupChannelId;
const BAR_STAFF_ROLE_ID = config.barStaffRoleId;

/* ───────── CLIENT ───────── */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions
  ],
  partials: [Partials.Message, Partials.Reaction, Partials.Channel]
});

/* ───────── STORAGE ───────── */
let events = {};
let reminderTimers = {};

if (fs.existsSync(DATA_FILE)) {
  try {
    events = JSON.parse(fs.readFileSync(DATA_FILE));
  } catch {
    events = {};
  }
}

function saveEvents() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(events, null, 2));
}

/* ───────── PERMISSIONS ───────── */
function hasEventPermission(member) {
  return member.roles.cache.some(r =>
    config.eventCreatorRoles.includes(r.name)
  );
}

/* ───────── ROLE EMOJIS ───────── */
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
  return DateTime.fromMillis(ms)
    .setZone(TIMEZONE)
    .toFormat('cccc, LLL d @ h:mm a');
}

function buildSignupList(signups) {
  return Object.entries(roleConfig).map(([emoji, role]) => {
    const users = signups[role] || [];
    return `**${emoji} ${role}:**\n${
      users.length
        ? users.map(id => `• <@${id}>`).join('\n')
        : '*No signups yet*'
    }`;
  }).join('\n\n');
}

/* ───────── NEXT SHIFT HELPERS ───────── */
function getNextShift() {
  const openDays = config.openDays || [];
  let now = DateTime.now().setZone(TIMEZONE);

  for (let i = 0; i < 14; i++) {
    const day = now.plus({ days: i });
    if (openDays.includes(day.toFormat('cccc'))) {
      return day.set({ hour: 21, minute: 0, second: 0, millisecond: 0 });
    }
  }
  return null;
}

function getAutoTitle(shiftDate) {
  return `${shiftDate.toFormat('cccc')} Night Shift`;
}

function isTodayOpen() {
  return config.openDays.includes(
    DateTime.now().setZone(TIMEZONE).toFormat('cccc')
  );
}

/* ───────── REMINDERS ───────── */
function scheduleReminder(eventId) {
  const ev = events[eventId];
  if (!ev || ev.cancelled || reminderTimers[eventId]) return;

  const delay = ev.datetime - Date.now();
  if (delay <= 0) return;

  reminderTimers[eventId] = setTimeout(async () => {
    try {
      const channel = await client.channels.fetch(ev.channelId);
      await channel.send(
        `🔔 **Shift starting now!** <@&${BAR_STAFF_ROLE_ID}>`
      );
    } catch {}
    delete reminderTimers[eventId];
  }, delay);
}

/* ───────── SLASH COMMANDS ───────── */
const commands = [
  new SlashCommandBuilder()
    .setName('createevent')
    .setDescription('Create a new event'),

  new SlashCommandBuilder()
    .setName('nextshift')
    .setDescription('Show the next shift time and countdown')
];

const rest = new REST({ version: '10' }).setToken(TOKEN);
(async () => {
  await rest.put(
    Routes.applicationCommands(CLIENT_ID),
    { body: commands.map(c => c.toJSON()) }
  );
})();

/* ───────── INTERACTIONS ───────── */
client.on('interactionCreate', async interaction => {

  /* CREATE EVENT */
  if (interaction.isChatInputCommand() &&
      interaction.commandName === 'createevent') {

    if (!hasEventPermission(interaction.member))
      return interaction.reply({ content: '❌ No permission.', ephemeral: true });

    const nextShift = getNextShift();
    if (!nextShift)
      return interaction.reply({ content: '❌ No upcoming shift.', ephemeral: true });

    const modal = new ModalBuilder()
      .setCustomId('createevent-modal')
      .setTitle('Create Event');

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('title')
          .setLabel('Event Title')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setValue(getAutoTitle(nextShift))
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('datetime')
          .setLabel('Date & Time (YYYY-MM-DD HH:mm)')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setValue(nextShift.toFormat('yyyy-MM-dd HH:mm'))
      )
    );

    return interaction.showModal(modal);
  }

  /* MODAL SUBMIT */
  if (interaction.isModalSubmit() &&
      interaction.customId === 'createevent-modal') {

    await interaction.deferReply({ ephemeral: true });

    const title = interaction.fields.getTextInputValue('title');
    const dtStr = interaction.fields.getTextInputValue('datetime');
    const dt = DateTime.fromFormat(dtStr, 'yyyy-MM-dd HH:mm', { zone: TIMEZONE });

    if (!dt.isValid)
      return interaction.editReply('❌ Invalid date.');

    const unix = Math.floor(dt.toSeconds());

    const embed = new EmbedBuilder()
      .setColor(0x00b0f4)
      .setTitle(title)
      .setDescription(
        `🕒 **When:** ${formatEST(dt.toMillis())} (EST)\n` +
        `⏳ **Starts:** <t:${unix}:R>\n\n` +
        buildSignupList({})
      )
      .setTimestamp();

    const channel = await client.channels.fetch(SIGNUP_CHANNEL);
    const msg = await channel.send({ embeds: [embed] });

    events[msg.id] = {
      title,
      datetime: dt.toMillis(),
      channelId: channel.id,
      signups: {},
      cancelled: false
    };

    saveEvents();
    scheduleReminder(msg.id);

    for (const emoji of Object.keys(roleConfig)) {
      await msg.react(emoji);
    }

    return interaction.editReply(`✅ Event **${title}** created.`);
  }

  /* NEXT SHIFT */
  if (interaction.isChatInputCommand() &&
      interaction.commandName === 'nextshift') {

    const nextShift = getNextShift();
    const unix = Math.floor(nextShift.toSeconds());

    return interaction.reply({
      content:
        `🕒 **Next Shift:** <t:${unix}:F>\n` +
        `⏳ **Countdown:** <t:${unix}:R>\n` +
        `🚪 **We are:** ${isTodayOpen() ? 'OPEN' : 'NOT OPEN'}`,
      ephemeral: true
    });
  }
});

/* ───────── EMOJI SIGNUPS ───────── */
async function updateEventEmbed(message) {
  const ev = events[message.id];
  if (!ev) return;

  const unix = Math.floor(ev.datetime / 1000);

  const embed = new EmbedBuilder()
    .setColor(0x00b0f4)
    .setTitle(ev.title)
    .setDescription(
      `🕒 **When:** ${formatEST(ev.datetime)} (EST)\n` +
      `⏳ **Starts:** <t:${unix}:R>\n\n` +
      buildSignupList(ev.signups)
    )
    .setTimestamp();

  await message.edit({ embeds: [embed] });
}

client.on('messageReactionAdd', async (reaction, user) => {
  if (user.bot) return;
  if (reaction.partial) await reaction.fetch();
  if (reaction.message.partial) await reaction.message.fetch();

  const ev = events[reaction.message.id];
  const role = roleConfig[reaction.emoji.name];
  if (!ev || !role || ev.cancelled) return;

  ev.signups[role] ??= [];
  if (!ev.signups[role].includes(user.id)) {
    ev.signups[role].push(user.id);
    saveEvents();
    await updateEventEmbed(reaction.message);
  }
});

client.on('messageReactionRemove', async (reaction, user) => {
  if (user.bot) return;
  if (reaction.partial) await reaction.fetch();
  if (reaction.message.partial) await reaction.message.fetch();

  const ev = events[reaction.message.id];
  const role = roleConfig[reaction.emoji.name];
  if (!ev || !role) return;

  ev.signups[role] =
    (ev.signups[role] || []).filter(id => id !== user.id);

  saveEvents();
  await updateEventEmbed(reaction.message);
});

/* ───────── READY ───────── */
client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  Object.keys(events).forEach(scheduleReminder);
});

/* ───────── LOGIN ───────── */
if (!TOKEN || !CLIENT_ID) {
  console.error('❌ Missing BOT_TOKEN or CLIENT_ID');
  process.exit(1);
}

client.login(TOKEN);
