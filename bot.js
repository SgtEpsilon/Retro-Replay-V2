/***********************
 * Retro Replay Bot Rewrite V2.1.3
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
let disabledRoles = []; // Global list of disabled roles

if (fs.existsSync(DATA_FILE)) {
  try {
    events = JSON.parse(fs.readFileSync(DATA_FILE));
  } catch {
    events = {};
  }
}

if (fs.existsSync(AUTO_POST_FILE)) {
  try {
    autoPosted = JSON.parse(fs.readFileSync(AUTO_POST_FILE));
  } catch {
    autoPosted = {};
  }
}

if (fs.existsSync(BLACKOUT_FILE)) {
  try {
    blackoutDates = JSON.parse(fs.readFileSync(BLACKOUT_FILE));
  } catch {
    blackoutDates = [];
  }
}

if (fs.existsSync(SHIFT_LOG_FILE)) {
  try {
    shiftLogs = JSON.parse(fs.readFileSync(SHIFT_LOG_FILE));
  } catch {
    shiftLogs = [];
  }
}

if (fs.existsSync(DISABLED_ROLES_FILE)) {
  try {
    disabledRoles = JSON.parse(fs.readFileSync(DISABLED_ROLES_FILE));
  } catch {
    disabledRoles = [];
  }
}

function saveEvents() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(events, null, 2));
}

function saveAutoPosted() {
  fs.writeFileSync(AUTO_POST_FILE, JSON.stringify(autoPosted, null, 2));
}

function saveBlackoutDates() {
  fs.writeFileSync(BLACKOUT_FILE, JSON.stringify(blackoutDates, null, 2));
}

function saveShiftLogs() {
  fs.writeFileSync(SHIFT_LOG_FILE, JSON.stringify(shiftLogs, null, 2));
}

function saveDisabledRoles() {
  fs.writeFileSync(DISABLED_ROLES_FILE, JSON.stringify(disabledRoles, null, 2));
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

// Map role names to numbers for ! commands
const roleNumbers = {
  '1': 'Active Manager',
  '2': 'Backup Manager',
  '3': 'Bouncer',
  '4': 'Bartender',
  '5': 'Dancer',
  '6': 'DJ'
};

/* ───────── HELPERS ───────── */
function formatEST(ms) {
  return DateTime.fromMillis(ms)
    .setZone(TIMEZONE)
    .toFormat('cccc, LLL d @ h:mm a');
}

function buildSignupList(signups, eventId) {
  return Object.entries(roleConfig).map(([emoji, role]) => {
    // Check if role is globally disabled
    const isDisabled = disabledRoles.includes(role);
    
    if (isDisabled) {
      return `**${emoji} ${role}:** ~~*Disabled*~~`;
    }
    
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
    const dateKey = day.toFormat('yyyy-MM-dd');
    
    if (openDays.includes(day.toFormat('cccc')) && !blackoutDates.includes(dateKey)) {
      return day.set({ hour: 21, minute: 0, second: 0, millisecond: 0 });
    }
  }
  return null;
}

function getAutoTitle(shiftDate) {
  return `${shiftDate.toFormat('cccc')} Night Shift`;
}

function isTodayOpen() {
  const now = DateTime.now().setZone(TIMEZONE);
  const dateKey = now.toFormat('yyyy-MM-dd');
  return config.openDays.includes(now.toFormat('cccc')) && !blackoutDates.includes(dateKey);
}

/* ───────── SHIFT LOGS ───────── */
function logShift(eventId) {
  const ev = events[eventId];
  if (!ev || ev.cancelled) return;

  const log = {
    date: DateTime.fromMillis(ev.datetime).toFormat('yyyy-MM-dd'),
    title: ev.title,
    datetime: ev.datetime,
    signups: JSON.parse(JSON.stringify(ev.signups)),
    timestamp: Date.now()
  };

  shiftLogs.push(log);
  saveShiftLogs();
}

/* ───────── BACKUP ALERTS ───────── */
function scheduleBackupAlert(eventId) {
  const ev = events[eventId];
  if (!ev || ev.cancelled || backupAlertTimers[eventId]) return;

  // Alert 2 hours before shift
  const alertTime = ev.datetime - (2 * 60 * 60 * 1000);
  const delay = alertTime - Date.now();
  
  if (delay <= 0) return;

  backupAlertTimers[eventId] = setTimeout(async () => {
    try {
      const emptyRoles = Object.entries(roleConfig)
        .map(([emoji, role]) => {
          // Skip disabled roles
          if (disabledRoles.includes(role)) return null;
          
          const signups = ev.signups[role] || [];
          return signups.length === 0 ? role : null;
        })
        .filter(Boolean);

      if (emptyRoles.length > 0) {
        const channel = await client.channels.fetch(ev.channelId);
        await channel.send(
          `⚠️ **BACKUP NEEDED** - 2 hours until shift!\n` +
          `Missing roles: **${emptyRoles.join(', ')}**\n` +
          `<@&${BAR_STAFF_ROLE_ID}>`
        );
      }
    } catch {}
    delete backupAlertTimers[eventId];
  }, delay);
}

/* ───────── AUTO POST EVENT ───────── */
async function createAutoEvent(shiftDate) {
  const title = getAutoTitle(shiftDate);
  const unix = Math.floor(shiftDate.toSeconds());

  const embed = new EmbedBuilder()
    .setColor(0x00b0f4)
    .setTitle(title)
    .setDescription(
      `🕒 **When:** ${formatEST(shiftDate.toMillis())} (EST)\n` +
      `⏳ **Starts:** <t:${unix}:R>\n\n` +
      buildSignupList({}, msg.id)
    )
    .setTimestamp();

  const channel = await client.channels.fetch(SIGNUP_CHANNEL);
  const msg = await channel.send({ embeds: [embed] });

  events[msg.id] = {
    title,
    datetime: shiftDate.toMillis(),
    channelId: channel.id,
    signups: {},
    cancelled: false
  };

  saveEvents();
  scheduleReminder(msg.id);
  scheduleBackupAlert(msg.id);

  for (const emoji of Object.keys(roleConfig)) {
    await msg.react(emoji);
  }

  console.log(`✅ Auto-posted event: ${title}`);
}

function checkAndAutoPost() {
  const nowGMT = DateTime.now().setZone('Europe/London');
  const nowEST = DateTime.now().setZone(TIMEZONE);
  
  if (nowGMT.hour !== 17 || nowGMT.minute !== 0) return;

  const todayEST = nowEST.toFormat('cccc');
  const dateKey = nowEST.toFormat('yyyy-MM-dd');
  
  // Check blackout dates
  if (blackoutDates.includes(dateKey)) {
    console.log(`⏸️ Skipping auto-post: ${dateKey} is blacked out`);
    return;
  }
  
  if (!config.openDays.includes(todayEST)) return;
  if (autoPosted[dateKey]) return;

  const shiftDate = nowEST.set({ hour: 21, minute: 0, second: 0, millisecond: 0 });

  createAutoEvent(shiftDate).then(() => {
    autoPosted[dateKey] = true;
    saveAutoPosted();
  }).catch(err => {
    console.error('❌ Auto-post failed:', err);
  });
}

/* ───────── BOT STATUS ───────── */
const statuses = [
  {
    name: 'The Bar',
    type: ActivityType.Watching
  },
  {
    name: 'Now Hiring',
    type: ActivityType.Playing
  }
];

let currentStatusIndex = 0;
let customStatusTimer = null;
let isCustomStatus = false;

function rotateStatus() {
  if (isCustomStatus) return; // Don't rotate if custom status is active
  
  const status = statuses[currentStatusIndex];
  client.user.setActivity(status.name, { type: status.type });
  currentStatusIndex = (currentStatusIndex + 1) % statuses.length;
}

function setCustomStatus(type, message, durationMinutes = 0) {
  isCustomStatus = true;
  
  // Clear existing custom status timer
  if (customStatusTimer) {
    clearTimeout(customStatusTimer);
    customStatusTimer = null;
  }
  
  // Map string type to ActivityType
  const activityTypes = {
    'playing': ActivityType.Playing,
    'watching': ActivityType.Watching,
    'listening': ActivityType.Listening,
    'competing': ActivityType.Competing
  };
  
  client.user.setActivity(message, { type: activityTypes[type] });
  
  // If duration is set, revert after time expires
  if (durationMinutes > 0) {
    customStatusTimer = setTimeout(() => {
      isCustomStatus = false;
      rotateStatus();
      console.log('✅ Custom status expired, resuming rotation');
    }, durationMinutes * 60 * 1000);
  }
}

function clearCustomStatus() {
  if (customStatusTimer) {
    clearTimeout(customStatusTimer);
    customStatusTimer = null;
  }
  isCustomStatus = false;
  rotateStatus();
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
      
      // Log the shift
      logShift(eventId);
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
    .setDescription('Show the next shift time and countdown'),

  new SlashCommandBuilder()
    .setName('shiftstats')
    .setDescription('View signup statistics')
    .addStringOption(option =>
      option.setName('period')
        .setDescription('Time period')
        .setRequired(false)
        .addChoices(
          { name: 'Last 7 days', value: '7' },
          { name: 'Last 30 days', value: '30' },
          { name: 'All time', value: 'all' }
        )),

  new SlashCommandBuilder()
    .setName('blackout')
    .setDescription('Manage blackout dates')
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Add a blackout date')
        .addStringOption(option =>
          option.setName('date')
            .setDescription('Date (YYYY-MM-DD)')
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Remove a blackout date')
        .addStringOption(option =>
          option.setName('date')
            .setDescription('Date (YYYY-MM-DD)')
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('List all blackout dates')),

  new SlashCommandBuilder()
    .setName('roster')
    .setDescription('View upcoming shifts')
    .addIntegerOption(option =>
      option.setName('days')
        .setDescription('Number of days to look ahead (default: 7)')
        .setRequired(false)),

  new SlashCommandBuilder()
    .setName('shiftlogs')
    .setDescription('View archived shift logs')
    .addIntegerOption(option =>
      option.setName('count')
        .setDescription('Number of recent shifts to show (default: 5)')
        .setRequired(false)),

  new SlashCommandBuilder()
    .setName('help')
    .setDescription('View all available commands and their usage'),

  new SlashCommandBuilder()
    .setName('setstatus')
    .setDescription('Set a custom bot status for a period of time')
    .addStringOption(option =>
      option.setName('type')
        .setDescription('Activity type')
        .setRequired(true)
        .addChoices(
          { name: 'Playing', value: 'playing' },
          { name: 'Watching', value: 'watching' },
          { name: 'Listening to', value: 'listening' },
          { name: 'Competing in', value: 'competing' }
        ))
    .addStringOption(option =>
      option.setName('message')
        .setDescription('Status message')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('duration')
        .setDescription('Duration in minutes (0 = permanent until changed)')
        .setRequired(false))
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
        buildSignupList({}, msg.id)
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
    scheduleBackupAlert(msg.id);

    for (const emoji of Object.keys(roleConfig)) {
      await msg.react(emoji);
    }

    return interaction.editReply(`✅ Event **${title}** created.`);
  }

  /* NEXT SHIFT */
  if (interaction.isChatInputCommand() &&
      interaction.commandName === 'nextshift') {

    const nextShift = getNextShift();
    if (!nextShift)
      return interaction.reply({ content: '❌ No upcoming shifts found.', ephemeral: true });

    const unix = Math.floor(nextShift.toSeconds());

    return interaction.reply({
      content:
        `🕒 **Next Shift:** <t:${unix}:F>\n` +
        `⏳ **Countdown:** <t:${unix}:R>\n` +
        `🚪 **We are:** ${isTodayOpen() ? 'OPEN' : 'NOT OPEN'}`,
      ephemeral: true
    });
  }

  /* SHIFT STATS */
  if (interaction.isChatInputCommand() &&
      interaction.commandName === 'shiftstats') {

    const period = interaction.options.getString('period') || '30';
    let cutoff = 0;

    if (period !== 'all') {
      const days = parseInt(period);
      cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    }

    const recentLogs = shiftLogs.filter(log => log.timestamp >= cutoff);

    if (recentLogs.length === 0) {
      return interaction.reply({ content: '📊 No shift data available for this period.', ephemeral: true });
    }

    // Count signups per user
    const userStats = {};
    const roleStats = {};

    recentLogs.forEach(log => {
      Object.entries(log.signups).forEach(([role, users]) => {
        roleStats[role] = (roleStats[role] || 0) + users.length;
        users.forEach(userId => {
          userStats[userId] = (userStats[userId] || 0) + 1;
        });
      });
    });

    const topUsers = Object.entries(userStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id, count]) => `<@${id}>: **${count}** shifts`)
      .join('\n');

    const roleBreakdown = Object.entries(roleStats)
      .sort((a, b) => b[1] - a[1])
      .map(([role, count]) => `**${role}:** ${count} signups`)
      .join('\n');

    const embed = new EmbedBuilder()
      .setColor(0x00b0f4)
      .setTitle('📊 Shift Statistics')
      .addFields(
        { name: '📅 Period', value: period === 'all' ? 'All time' : `Last ${period} days`, inline: true },
        { name: '🎯 Total Shifts', value: `${recentLogs.length}`, inline: true },
        { name: '\u200b', value: '\u200b', inline: true },
        { name: '👑 Top Contributors', value: topUsers || 'None', inline: false },
        { name: '🎭 Role Breakdown', value: roleBreakdown || 'None', inline: false }
      )
      .setTimestamp();

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  /* BLACKOUT */
  if (interaction.isChatInputCommand() &&
      interaction.commandName === 'blackout') {

    if (!hasEventPermission(interaction.member))
      return interaction.reply({ content: '❌ No permission.', ephemeral: true });

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'add') {
      const dateStr = interaction.options.getString('date');
      const dt = DateTime.fromFormat(dateStr, 'yyyy-MM-dd', { zone: TIMEZONE });

      if (!dt.isValid)
        return interaction.reply({ content: '❌ Invalid date format. Use YYYY-MM-DD', ephemeral: true });

      const dateKey = dt.toFormat('yyyy-MM-dd');

      if (blackoutDates.includes(dateKey))
        return interaction.reply({ content: '⚠️ Date already blacked out.', ephemeral: true });

      blackoutDates.push(dateKey);
      saveBlackoutDates();

      return interaction.reply({ content: `✅ Blackout added for **${dateKey}**`, ephemeral: true });
    }

    if (subcommand === 'remove') {
      const dateStr = interaction.options.getString('date');
      const dateKey = DateTime.fromFormat(dateStr, 'yyyy-MM-dd', { zone: TIMEZONE }).toFormat('yyyy-MM-dd');

      const index = blackoutDates.indexOf(dateKey);
      if (index === -1)
        return interaction.reply({ content: '⚠️ Date not found in blackout list.', ephemeral: true });

      blackoutDates.splice(index, 1);
      saveBlackoutDates();

      return interaction.reply({ content: `✅ Blackout removed for **${dateKey}**`, ephemeral: true });
    }

    if (subcommand === 'list') {
      if (blackoutDates.length === 0)
        return interaction.reply({ content: '📅 No blackout dates set.', ephemeral: true });

      const sorted = blackoutDates.sort();
      const list = sorted.map(d => `• ${d}`).join('\n');

      return interaction.reply({ content: `🚫 **Blackout Dates:**\n${list}`, ephemeral: true });
    }
  }

  /* ROSTER */
  if (interaction.isChatInputCommand() &&
      interaction.commandName === 'roster') {

    const days = interaction.options.getInteger('days') || 7;
    const now = DateTime.now().setZone(TIMEZONE);
    const upcomingShifts = [];

    for (let i = 0; i < days; i++) {
      const day = now.plus({ days: i });
      const dateKey = day.toFormat('yyyy-MM-dd');
      const dayName = day.toFormat('cccc');

      if (config.openDays.includes(dayName) && !blackoutDates.includes(dateKey)) {
        const shiftTime = day.set({ hour: 21, minute: 0, second: 0, millisecond: 0 });
        const unix = Math.floor(shiftTime.toSeconds());
        upcomingShifts.push(`• **${dayName}** ${dateKey} - <t:${unix}:R>`);
      }
    }

    if (upcomingShifts.length === 0) {
      return interaction.reply({ content: `📅 No shifts scheduled in the next ${days} days.`, ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor(0x00b0f4)
      .setTitle('📅 Upcoming Shifts')
      .setDescription(upcomingShifts.join('\n'))
      .setFooter({ text: `Next ${days} days` })
      .setTimestamp();

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  /* SHIFT LOGS */
  if (interaction.isChatInputCommand() &&
      interaction.commandName === 'shiftlogs') {

    if (!hasEventPermission(interaction.member))
      return interaction.reply({ content: '❌ No permission.', ephemeral: true });

    const count = interaction.options.getInteger('count') || 5;
    const recentLogs = shiftLogs.slice(-count).reverse();

    if (recentLogs.length === 0) {
      return interaction.reply({ content: '📋 No shift logs available.', ephemeral: true });
    }

    const logText = recentLogs.map(log => {
      const date = DateTime.fromMillis(log.datetime).toFormat('yyyy-MM-dd');
      const totalSignups = Object.values(log.signups).flat().length;
      return `**${log.title}** (${date}) - ${totalSignups} signups`;
    }).join('\n');

    const embed = new EmbedBuilder()
      .setColor(0x00b0f4)
      .setTitle('📋 Recent Shift Logs')
      .setDescription(logText)
      .setTimestamp();

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  /* HELP */
  if (interaction.isChatInputCommand() &&
      interaction.commandName === 'help') {

    const isManager = hasEventPermission(interaction.member);

    const generalCommands = [
      '`/nextshift` - Shows when the next shift is scheduled with countdown',
      '`/roster` - View all upcoming shifts for the next 7 days (or custom period)',
      '`/shiftstats` - View signup statistics and top contributors over time'
    ];

    const managerCommands = [
      '`/createevent` - Manually create a new shift signup event',
      '`/blackout add/remove/list` - Manage dates when the bar is closed',
      '`/shiftlogs` - View archived records of past shifts and who worked',
      '`/setstatus` - Set a custom bot status message for a period of time'
    ];

    const featuresText = [
      '**🤖 Auto Features:**',
      '• Signup sheets auto-post at 5 PM GMT on open days',
      '• Shift reminders sent when shifts start',
      '• Backup alerts 2 hours before if roles are empty',
      '• All shifts automatically archived for records'
    ].join('\n');

    const signupText = [
      '**📝 How to Sign Up:**',
      '1️⃣ Active Manager',
      '2️⃣ Backup Manager', 
      '3️⃣ Bouncer',
      '4️⃣ Bartender',
      '5️⃣ Dancer',
      '6️⃣ DJ',
      '',
      'React with the emoji for your role!'
    ].join('\n');

    const embed = new EmbedBuilder()
      .setColor(0x00b0f4)
      .setTitle('📚 Retro Replay Bot - Help')
      .setDescription('Your bar management assistant')
      .addFields(
        { name: '👥 General Commands', value: generalCommands.join('\n'), inline: false },
        { name: '⚙️ Manager Commands', value: isManager ? managerCommands.join('\n') : '*Manager access required*', inline: false },
        { name: '\u200b', value: featuresText, inline: false },
        { name: '\u200b', value: signupText, inline: false }
      )
      .setFooter({ text: 'Retro Replay Bot v30.0' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  /* SET STATUS */
  if (interaction.isChatInputCommand() &&
      interaction.commandName === 'setstatus') {

    if (!hasEventPermission(interaction.member))
      return interaction.reply({ content: '❌ No permission.', ephemeral: true });

    const type = interaction.options.getString('type');
    const message = interaction.options.getString('message');
    const duration = interaction.options.getInteger('duration') || 0;

    setCustomStatus(type, message, duration);

    const typeLabel = {
      'playing': 'Playing',
      'watching': 'Watching',
      'listening': 'Listening to',
      'competing': 'Competing in'
    };

    const durationText = duration > 0 
      ? `for **${duration} minutes**` 
      : 'until manually changed';

    return interaction.reply({ 
      content: `✅ Status set to "${typeLabel[type]} ${message}" ${durationText}`, 
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
      buildSignupList(ev.signups, message.id)
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

  // Check if role is globally disabled
  if (disabledRoles.includes(role)) {
    // Remove the reaction if role is disabled
    await reaction.users.remove(user.id);
    return;
  }

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

/* ───────── TEXT COMMANDS ───────── */
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith('!')) return;

  const args = message.content.slice(1).trim().split(/\s+/);
  const command = args[0].toLowerCase();

  // !disable [role_number] - Toggle role availability globally (Manager only)
  if (command === 'disable' || command === 'enable') {
    // Check permissions
    const member = message.member;
    if (!hasEventPermission(member)) {
      return message.reply('❌ You need manager permissions to use this command.');
    }

    const roleNum = args[1];
    
    if (!roleNum || !roleNumbers[roleNum]) {
      return message.reply('Usage: `!disable [1-6]` or `!enable [1-6]`\n1=Manager, 2=Backup, 3=Bouncer, 4=Bartender, 5=Dancer, 6=DJ');
    }

    const roleName = roleNumbers[roleNum];
    const isCurrentlyDisabled = disabledRoles.includes(roleName);

    if (command === 'disable') {
      if (isCurrentlyDisabled) {
        return message.reply(`⚠️ **${roleName}** is already disabled globally.`);
      }
      
      // Disable the role globally
      disabledRoles.push(roleName);
      saveDisabledRoles();
      
      // Update all active event embeds in this channel
      let updatedCount = 0;
      for (const [msgId, ev] of Object.entries(events)) {
        if (ev.channelId === message.channel.id && !ev.cancelled) {
          try {
            const eventMessage = await message.channel.messages.fetch(msgId);
            await updateEventEmbed(eventMessage);
            updatedCount++;
          } catch {}
        }
      }
      
      await message.reply(`🚫 **${roleName}** signups are now disabled globally. Existing signups preserved. Updated ${updatedCount} event(s).`);
    } else {
      // enable
      if (!isCurrentlyDisabled) {
        return message.reply(`⚠️ **${roleName}** is already enabled.`);
      }
      
      // Enable the role globally
      const index = disabledRoles.indexOf(roleName);
      disabledRoles.splice(index, 1);
      saveDisabledRoles();
      
      // Update all active event embeds in this channel
      let updatedCount = 0;
      for (const [msgId, ev] of Object.entries(events)) {
        if (ev.channelId === message.channel.id && !ev.cancelled) {
          try {
            const eventMessage = await message.channel.messages.fetch(msgId);
            await updateEventEmbed(eventMessage);
            updatedCount++;
          } catch {}
        }
      }
      
      await message.reply(`✅ **${roleName}** signups are now enabled globally. Updated ${updatedCount} event(s).`);
    }
  }
});

/* ───────── READY ───────── */
client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  
  // Set initial status and start rotation
  rotateStatus();
  setInterval(rotateStatus, 30000);
  
  // Check for auto-posting every minute
  setInterval(checkAndAutoPost, 60000);
  checkAndAutoPost();
  
  // Restore timers
  Object.keys(events).forEach(eventId => {
    scheduleReminder(eventId);
    scheduleBackupAlert(eventId);
  });
});

/* ───────── LOGIN ───────── */
if (!TOKEN || !CLIENT_ID) {
  console.error('❌ Missing BOT_TOKEN or CLIENT_ID');
  process.exit(1);
}

client.login(TOKEN);