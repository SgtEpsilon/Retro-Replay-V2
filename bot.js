/***********************
 * Retro Replay Bot Rewrite V2.2.2
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

const SIGNUP_CHANNEL = process.env.SIGNUP_CHANNEL_ID;
const BAR_STAFF_ROLE_ID = process.env.BAR_STAFF_ROLE_ID;

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
let customStatus = null; // For /setstatus command

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

function isBlackoutDate(date) {
  const checkDate = DateTime.fromMillis(date).setZone(TIMEZONE).toISODate();
  return blackoutDates.some(bd => {
    const blackout = DateTime.fromISO(bd, { zone: TIMEZONE }).toISODate();
    return blackout === checkDate;
  });
}

function setDefaultStatus() {
  if (customStatus) return; // Don't override custom status
  
  client.user.setPresence({
    activities: [{
      name: '🍸 Shifts at the Retro Bar',
      type: ActivityType.Watching
    }],
    status: 'online'
  });
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

/* ───────── AUTO POST LOGIC ───────── */
async function autoPostWeeklyShifts() {
  try {
    const channel = await client.channels.fetch(SIGNUP_CHANNEL);
    if (!channel) return;

    const now = DateTime.now().setZone(AUTO_POST_TIMEZONE);
    const today = now.toFormat('EEEE'); // Day name (e.g., "Tuesday")
    const dateKey = now.toISODate(); // YYYY-MM-DD

    // Check if today is an open day
    if (!config.openDays.includes(today)) {
      console.log(`⏭️ Today (${today}) is not an open day, skipping auto-post.`);
      return;
    }

    // Check if already posted today
    if (autoPosted[dateKey]) {
      console.log(`✅ Already auto-posted for ${dateKey}`);
      return;
    }

    // Check if today is a blackout date
    if (isBlackoutDate(now.toMillis())) {
      console.log(`🚫 Today (${dateKey}) is a blackout date, skipping auto-post.`);
      return;
    }

    // Create shift for today
    const shiftTime = now.set({ 
      hour: SHIFT_START_HOUR, 
      minute: 0, 
      second: 0 
    }).setZone(TIMEZONE);

    const title = `🍸 ${today} Night Shift`;
    const signups = Object.fromEntries(
      Object.values(roleConfig).map(role => [role, []])
    );

    const embed = new EmbedBuilder()
      .setColor(0x00b0f4)
      .setTitle(title)
      .setDescription(
        `🕒 **When:** ${formatTime(shiftTime.toMillis())}\n\n${buildSignupList(signups)}`
      )
      .setFooter({ text: 'React to sign up!' });

    const msg = await channel.send({ 
      content: `<@&${BAR_STAFF_ROLE_ID}> New shift posted!`,
      embeds: [embed] 
    });

    // Add reaction emojis
    for (const emoji of Object.keys(roleConfig)) {
      await msg.react(emoji);
    }

    // Save event
    events[msg.id] = {
      id: msg.id,
      title,
      datetime: shiftTime.toMillis(),
      channelId: channel.id,
      signups,
      cancelled: false
    };

    scheduleReminder(msg.id);
    scheduleBackupAlert(msg.id);

    save(DATA_FILE, events);
    
    // Mark today as posted
    autoPosted[dateKey] = Date.now();
    save(AUTO_POST_FILE, autoPosted);

    console.log(`✅ Auto-posted shift for ${today}, ${dateKey}`);
  } catch (err) {
    console.error('❌ Auto-post error:', err);
  }
}

function scheduleAutoPost() {
  // Check every 10 minutes if it's time to post
  setInterval(async () => {
    const now = DateTime.now().setZone(AUTO_POST_TIMEZONE);
    
    // Only post during the configured hour
    if (now.hour === AUTO_POST_HOUR && now.minute < 10) {
      await autoPostWeeklyShifts();
    }
  }, 10 * 60 * 1000); // Check every 10 minutes
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
  new SlashCommandBuilder()
    .setName('mysignups')
    .setDescription('View your upcoming signups'),

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
        .setDescription('Date (YYYY-MM-DD)')
        .setRequired(true)),

  new SlashCommandBuilder()
    .setName('removeblackout')
    .setDescription('Remove a blackout date')
    .addStringOption(o =>
      o.setName('date')
        .setDescription('Date (YYYY-MM-DD)')
        .setRequired(true)),

  new SlashCommandBuilder()
    .setName('listblackouts')
    .setDescription('List all blackout dates')
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
          results.push(`• **${ev.title}** – ${role}\n  🕒 ${formatTime(ev.datetime)}`);
      }
    }

    return i.reply({
      content: results.length
        ? `📋 **Your Signups:**\n\n${results.join('\n')}`
        : '🔭 You are not signed up for any upcoming shifts.',
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
            .setTitle(`❌ CANCELLED – ${ev.title}`)
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

  /* SET STATUS */
  if (i.commandName === 'setstatus') {
    if (!hasEventPermission(i.member))
      return i.reply({ content: '❌ No permission.', ephemeral: true });

    const status = i.options.getString('status');
    const type = i.options.getString('type') || 'Playing';

    customStatus = { status, type };

    client.user.setPresence({
      activities: [{
        name: status,
        type: ActivityType[type]
      }],
      status: 'online'
    });

    return i.reply({ content: `✅ Status set to: ${type} ${status}`, ephemeral: true });
  }

  /* CLEAR STATUS */
  if (i.commandName === 'statusclear') {
    if (!hasEventPermission(i.member))
      return i.reply({ content: '❌ No permission.', ephemeral: true });

    customStatus = null;
    setDefaultStatus();

    return i.reply({ content: '✅ Status cleared, reverted to default.', ephemeral: true });
  }

  /* ADD BLACKOUT */
  if (i.commandName === 'addblackout') {
    if (!hasEventPermission(i.member))
      return i.reply({ content: '❌ No permission.', ephemeral: true });

    const dateStr = i.options.getString('date');
    const dt = DateTime.fromISO(dateStr, { zone: TIMEZONE });

    if (!dt.isValid)
      return i.reply({ content: '❌ Invalid date format. Use YYYY-MM-DD', ephemeral: true });

    if (blackoutDates.includes(dateStr))
      return i.reply({ content: '⚠️ Date already in blackout list.', ephemeral: true });

    blackoutDates.push(dateStr);
    save(BLACKOUT_FILE, blackoutDates);

    return i.reply({ content: `✅ Added blackout date: ${dateStr}`, ephemeral: true });
  }

  /* REMOVE BLACKOUT */
  if (i.commandName === 'removeblackout') {
    if (!hasEventPermission(i.member))
      return i.reply({ content: '❌ No permission.', ephemeral: true });

    const dateStr = i.options.getString('date');
    const idx = blackoutDates.indexOf(dateStr);

    if (idx === -1)
      return i.reply({ content: '⚠️ Date not found in blackout list.', ephemeral: true });

    blackoutDates.splice(idx, 1);
    save(BLACKOUT_FILE, blackoutDates);

    return i.reply({ content: `✅ Removed blackout date: ${dateStr}`, ephemeral: true });
  }

  /* LIST BLACKOUTS */
  if (i.commandName === 'listblackouts') {
    if (!blackoutDates.length)
      return i.reply({ content: '📅 No blackout dates set.', ephemeral: true });

    const sorted = blackoutDates.sort();
    return i.reply({
      content: `📅 **Blackout Dates:**\n${sorted.map(d => `• ${d}`).join('\n')}`,
      ephemeral: true
    });
  }
});

/* ───────── REACTION HANDLER ───────── */
client.on('messageReactionAdd', async (reaction, user) => {
  if (user.bot) return;

  // Fetch partial reactions
  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch {
      return;
    }
  }

  const messageId = reaction.message.id;
  const ev = events[messageId];
  
  if (!ev || ev.cancelled) return;

  const emoji = reaction.emoji.name;
  const role = roleConfig[emoji];

  if (!role) return; // Not a signup emoji

  // Check if role is disabled
  if (disabledRoles.includes(role)) {
    await reaction.users.remove(user.id);
    try {
      await user.send(`⚠️ Sorry, the **${role}** role is currently disabled for signups.`);
    } catch {}
    return;
  }

  // Remove user from all other roles for this event (one role per person)
  for (const [r, users] of Object.entries(ev.signups)) {
    const idx = users.indexOf(user.id);
    if (idx > -1) {
      users.splice(idx, 1);
    }
  }

  // Add user to the selected role
  if (!ev.signups[role]) ev.signups[role] = [];
  if (!ev.signups[role].includes(user.id)) {
    ev.signups[role].push(user.id);
  }

  save(DATA_FILE, events);

  // Update the message embed
  try {
    const embed = new EmbedBuilder()
      .setColor(0x00b0f4)
      .setTitle(ev.title)
      .setDescription(
        `🕒 **When:** ${formatTime(ev.datetime)}\n\n${buildSignupList(ev.signups)}`
      )
      .setFooter({ text: 'React to sign up!' });

    await reaction.message.edit({ embeds: [embed] });
  } catch {}
});

client.on('messageReactionRemove', async (reaction, user) => {
  if (user.bot) return;

  // Fetch partial reactions
  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch {
      return;
    }
  }

  const messageId = reaction.message.id;
  const ev = events[messageId];
  
  if (!ev || ev.cancelled) return;

  const emoji = reaction.emoji.name;
  const role = roleConfig[emoji];

  if (!role) return;

  // Remove user from this role
  const users = ev.signups[role] || [];
  const idx = users.indexOf(user.id);
  if (idx > -1) {
    users.splice(idx, 1);
  }

  save(DATA_FILE, events);

  // Update the message embed
  try {
    const embed = new EmbedBuilder()
      .setColor(0x00b0f4)
      .setTitle(ev.title)
      .setDescription(
        `🕒 **When:** ${formatTime(ev.datetime)}\n\n${buildSignupList(ev.signups)}`
      )
      .setFooter({ text: 'React to sign up!' });

    await reaction.message.edit({ embeds: [embed] });
  } catch {}
});

/* ───────── READY ───────── */
client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  
  setDefaultStatus();
  
  Object.keys(events).forEach(id => {
    scheduleReminder(id);
    scheduleBackupAlert(id);
  });

  scheduleAutoPost();
  
  // Run auto-post check on startup (in case bot was down during post time)
  setTimeout(autoPostWeeklyShifts, 5000);
});

client.login(TOKEN);