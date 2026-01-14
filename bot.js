/***********************
 * Retro Replay Bot v26
 * Discord.js v14 Compatible
 * DST-Safe Daily Shifts using Luxon
 * .env for BOT_TOKEN & CLIENT_ID
 * /createevent pre-fills next shift
 ***********************/
process.removeAllListeners('warning');
process.env.NODE_NO_WARNINGS = '1';

require('dotenv').config(); // Load BOT_TOKEN & CLIENT_ID

const { 
  Client, GatewayIntentBits, Partials, EmbedBuilder, ActivityType,
  REST, Routes, SlashCommandBuilder,
  ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder,
  ButtonBuilder, ButtonStyle
} = require('discord.js');

const fs = require('fs');
const path = require('path');
const schedule = require('node-schedule');
const { DateTime } = require('luxon'); // DST-safe time handling
const config = require('./config.json');

// Override sensitive values from .env
config.token = process.env.BOT_TOKEN;
config.clientId = process.env.CLIENT_ID;

const DATA_FILE = path.join(__dirname, 'scheduled_events.json');
const TIMEZONE = 'America/New_York';
const SIGNUP_CHANNEL = config.signupChannelId;

/* ───────── SAFETY ───────── */
process.on('unhandledRejection', console.error);
process.on('uncaughtException', console.error);

/* ───────── CLIENT ───────── */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

/* ───────── STORAGE ───────── */
let events = {};
function loadEvents() {
  if (!fs.existsSync(DATA_FILE)) return;
  try { events = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } 
  catch { events = {}; }
}
function saveEvents() { fs.writeFileSync(DATA_FILE, JSON.stringify(events, null, 2)); }
loadEvents();

/* ───────── PERMISSIONS ───────── */
function hasEventPermission(member) {
  if (!member) return false;
  return member.roles.cache.some(r =>
    config.eventCreatorRoles.map(x => x.toLowerCase()).includes(r.name.toLowerCase())
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

/* ───────── TIME HELPERS ───────── */
function formatEST(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) return 'Invalid Date';
  const dt = DateTime.fromJSDate(date).setZone(TIMEZONE);
  return dt.toFormat('dd-MM-yyyy hh:mm a');
}

function getTodayUnix() { return Math.floor(Date.now() / 1000); }

function isOpenToday(openDays) {
  const today = DateTime.now().setZone(TIMEZONE).toFormat('cccc');
  return openDays.some(d => d.toLowerCase() === today.toLowerCase());
}

function getNextOpenDayUnix(openDays) {
  const now = DateTime.now().setZone(TIMEZONE);
  for (let i = 0; i < 7; i++) {
    const nextDay = now.plus({ days: i });
    const weekday = nextDay.toFormat('cccc').toLowerCase();
    if (openDays.map(d => d.toLowerCase()).includes(weekday)) {
      const shiftTime = nextDay.set({ hour: 21, minute: 0, second: 0, millisecond: 0 });
      return shiftTime.toSeconds();
    }
  }
  return null;
}

/* ───────── EMBED HELPERS ───────── */
function buildSignupList(signups) {
  return Object.entries(roleConfig).map(([emoji, role]) => {
    const users = signups[role] || [];
    return `**${emoji} ${role}:**\n${users.length ? users.map(u => `• <@${u}>`).join('\n') : '*No signups yet*'}`;
  }).join('\n\n');
}

async function updateEmbed(messageId) {
  const ev = events[messageId];
  if (!ev) return;

  const channel = await fetchChannelSafe(ev.channelId || SIGNUP_CHANNEL);
  if (!channel) return;

  try {
    const msg = await channel.messages.fetch(messageId);
    const embed = new EmbedBuilder()
      .setColor(ev.cancelled ? 0xff0000 : 0x00b0f4)
      .setTitle(ev.title)
      .setDescription(ev.cancelled ? '❌ **EVENT CANCELLED**' : `🕒 **When:** ${formatEST(new Date(ev.datetime))} (EST)\n\n${buildSignupList(ev.signups)}`)
      .setTimestamp();
    await msg.edit({ embeds: [embed] });
  } catch (err) { console.error(err); }
}

/* ───────── SAFE CHANNEL FETCH ───────── */
async function fetchChannelSafe(channelId) {
  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel) throw new Error('Channel not found');
    return channel;
  } catch (err) {
    console.warn(`⚠️ Bot cannot access channel ${channelId}. Check ID and permissions.`);
    return null;
  }
}

/* ───────── SLASH COMMANDS ───────── */
const slashCommands = [
  new SlashCommandBuilder().setName('createevent').setDescription('Create a new event via form'),
  new SlashCommandBuilder().setName('opendays').setDescription('Show open days with countdown')
];

const rest = new REST({ version: '10' }).setToken(config.token);
(async () => {
  try {
    console.log('Refreshing application (/) commands...');
    await rest.put(Routes.applicationCommands(config.clientId), { body: slashCommands.map(cmd => cmd.toJSON()) });
    console.log('Slash commands registered successfully.');
  } catch (err) { console.error(err); }
})();

/* ───────── INTERACTION HANDLER ───────── */
client.tempEvent = {};

client.on('interactionCreate', async interaction => {

  if (interaction.isChatInputCommand()) {

    if (interaction.commandName === 'createevent') {
      if (!hasEventPermission(interaction.member))
        return interaction.reply({ content: '❌ You do not have permission.', ephemeral: true });

      const modal = new ModalBuilder()
        .setCustomId('create_event_modal')
        .setTitle('Create New Event');

      // Pre-fill date with next open shift
      const openDays = config.openDays;
      const nextShiftUnix = getNextOpenDayUnix(openDays);
      const nextShiftDT = DateTime.fromSeconds(nextShiftUnix).setZone(TIMEZONE);
      const defaultDateStr = nextShiftDT.toFormat('dd-MM-yyyy HH:mm');

      const titleInput = new TextInputBuilder()
        .setCustomId('event_title')
        .setLabel("Event Title")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const dateInput = new TextInputBuilder()
        .setCustomId('event_date')
        .setLabel("Event Date (DD-MM-YYYY HH:MM)")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setValue(defaultDateStr); // pre-fill

      modal.addComponents(
        new ActionRowBuilder().addComponents(titleInput),
        new ActionRowBuilder().addComponents(dateInput)
      );

      await interaction.showModal(modal);
    }

    if (interaction.commandName === 'opendays') {
      const openDays = config.openDays;
      if (!openDays || !openDays.length) return interaction.reply('No open days configured.');

      const todayUnix = getTodayUnix();
      const openToday = isOpenToday(openDays);
      const nextUnix = getNextOpenDayUnix(openDays);

      await interaction.reply(
        `📅 **Open Days:** ${openDays.join(', ')}\n` +
        `🕒 **Today is:** <t:${todayUnix}:F>\n` +
        (openToday ? '✅ **OPEN TODAY**' : '❌ **CLOSED TODAY**') + '\n' +
        (nextUnix ? `⏳ **Next Shift:** <t:${nextUnix}:R> (<t:${nextUnix}:F>)` : '❌ No upcoming shifts found.') + '\n' +
        `• Signup sheets are automatically posted at **5 PM GMT** on open days: **${openDays.join(', ')}**\n` +
        `• Make sure to sign up for your roles in time.`
      );
    }
  }

  if (interaction.isModalSubmit() && interaction.customId === 'create_event_modal') {
    const title = interaction.fields.getTextInputValue('event_title');
    const dateStr = interaction.fields.getTextInputValue('event_date');
    const match = dateStr.match(/^(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2})$/);
    if (!match) return interaction.reply({ content: '❌ Invalid date format. Use DD-MM-YYYY HH:MM', ephemeral: true });

    const [ , day, month, year, hour, minute ] = match;
    const datetime = DateTime.fromISO(`${year}-${month}-${day}T${hour}:${minute}:00`, { zone: TIMEZONE });
    if (!datetime.isValid) return interaction.reply({ content: '❌ Invalid date/time.', ephemeral: true });

    const embed = new EmbedBuilder().setColor(0x00b0f4).setTitle(title)
      .setDescription(`🕒 **When:** ${datetime.toFormat('dd-MM-yyyy hh:mm a')} (EST)\n\n${buildSignupList({})}`).setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('confirm_event').setLabel('✅ Confirm').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('cancel_event').setLabel('❌ Cancel').setStyle(ButtonStyle.Danger)
    );

    client.tempEvent[interaction.user.id] = { title, datetime };
    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  }

  if (interaction.isButton()) {
    const temp = client.tempEvent?.[interaction.user.id];
    if (!temp) return interaction.reply({ content: '❌ No event to confirm.', ephemeral: true });

    if (interaction.customId === 'confirm_event') {
      const channel = await fetchChannelSafe(SIGNUP_CHANNEL);
      if (!channel) return interaction.reply({ content: '❌ Cannot access signup channel.', ephemeral: true });

      const embed = new EmbedBuilder().setColor(0x00b0f4).setTitle(temp.title)
        .setDescription(`🕒 **When:** ${temp.datetime.toFormat('dd-MM-yyyy hh:mm a')} (EST)\n\n${buildSignupList({})}`).setTimestamp();

      const msg = await channel.send({ embeds: [embed] });
      events[msg.id] = { title: temp.title, datetime: temp.datetime.toMillis(), channelId: channel.id, signups: {}, cancelled: false };
      saveEvents();

      for (const emoji of Object.keys(roleConfig)) await msg.react(emoji);

      delete client.tempEvent[interaction.user.id];
      await interaction.update({ content: `✅ Event "${temp.title}" created!`, embeds: [], components: [] });
    }

    if (interaction.customId === 'cancel_event') {
      delete client.tempEvent[interaction.user.id];
      await interaction.update({ content: '❌ Event creation cancelled.', embeds: [], components: [] });
    }
  }
});

/* ───────── REACTION SIGNUPS ───────── */
client.on('messageReactionAdd', async (reaction, user) => {
  if (user.bot) return;
  const ev = events[reaction.message.id]; if (!ev) return;
  const role = roleConfig[reaction.emoji.name]; if (!role) return;
  if (!ev.signups[role]) ev.signups[role] = [];
  if (!ev.signups[role].includes(user.id)) ev.signups[role].push(user.id);
  await updateEmbed(reaction.message.id);
  saveEvents();
});

client.on('messageReactionRemove', async (reaction, user) => {
  if (user.bot) return;
  const ev = events[reaction.message.id]; if (!ev) return;
  const role = roleConfig[reaction.emoji.name]; if (!role) return;
  if (ev.signups[role]) ev.signups[role] = ev.signups[role].filter(id => id !== user.id);
  await updateEmbed(reaction.message.id);
  saveEvents();
});

/* ───────── DST-SAFE DAILY SHIFT POSTS ───────── */
function scheduleDailyShifts() {
  const openDays = config.openDays.map(d => d.toLowerCase());
  schedule.scheduleJob('0 21 * * *', async () => { // 21:00 EST = 5 PM GMT
    const nowEST = DateTime.now().setZone(TIMEZONE);
    const todayName = nowEST.toFormat('cccc').toLowerCase();
    if (!openDays.includes(todayName)) return;

    const channel = await fetchChannelSafe(SIGNUP_CHANNEL);
    if (!channel) return;

    const dayCapitalized = todayName.charAt(0).toUpperCase() + todayName.slice(1);
    const title = `[${dayCapitalized}] Shift Signup`;

    const shiftTime = nowEST.set({ hour: 21, minute: 0, second: 0, millisecond: 0 });

    const embed = new EmbedBuilder()
      .setColor(0x00b0f4)
      .setTitle(title)
      .setDescription(`🕒 **Shift starts:** ${shiftTime.toFormat('dd-MM-yyyy hh:mm a')} (EST)\n\n${buildSignupList({})}`)
      .setTimestamp();

    const msg = await channel.send({ embeds: [embed] });
    events[msg.id] = { title, datetime: shiftTime.toMillis(), channelId: channel.id, signups: {}, cancelled: false };
    saveEvents();

    for (const emoji of Object.keys(roleConfig)) await msg.react(emoji);
    console.log(`✅ Posted daily shift signup for ${dayCapitalized} at ${shiftTime.toFormat('hh:mm a')} EST`);
  });
}

/* ───────── PRESENCE ───────── */
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);

  const activities = [
    { name: 'Retro Replay', type: ActivityType.Watching },
    { name: 'Hiring Staff', type: ActivityType.Playing }
  ];
  let i = 0;
  setInterval(() => {
    client.user.setPresence({ activities: [activities[i % activities.length]], status: 'online' });
    i++;
  }, 30000);

  scheduleDailyShifts();
});

/* ───────── LOGIN ───────── */
if (!config.token) { console.error("❌ Missing BOT_TOKEN in .env"); process.exit(1); }
if (!config.clientId) { console.error("❌ Missing CLIENT_ID in .env"); process.exit(1); }
client.login(config.token);
