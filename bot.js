/***********************
 * Retro Replay Bot Rewrite V2.3.7.1
 * Discord.js v14
 * Fixed: Startup auto-post now checks configured hour
 * Fixed: Manager role pings for Active/Backup Manager positions
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
const AUTO_POST_HOUR = config.autoPostHour;
const SHIFT_START_HOUR = config.shiftStartHour;

const DATA_FILE = path.join(__dirname, 'scheduled_events.json');
const AUTO_POST_FILE = path.join(__dirname, 'auto_posted.json');
const BLACKOUT_FILE = path.join(__dirname, 'blackout_dates.json');
const SHIFT_LOG_FILE = path.join(__dirname, 'shift_logs.json');
const DISABLED_ROLES_FILE = path.join(__dirname, 'disabled_roles.json');

const SIGNUP_CHANNEL = process.env.SIGNUP_CHANNEL_ID;
const STAFF_CHAT_CHANNEL = process.env.STAFF_CHAT_CHANNEL_ID;
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
let backupAlert5MinTimers = {};
let backupAlertStartTimers = {};
let autoPosted = {};
let blackoutDates = [];
let shiftLogs = [];
let disabledRoles = [];
let customStatus = null;

function load(file, fallback) {
  try {
    return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : fallback;
  } catch (err) {
    console.error(`⚠️ Error loading ${file}:`, err.message);
    return fallback;
  }
}

events = load(DATA_FILE, {});
autoPosted = load(AUTO_POST_FILE, {});
blackoutDates = load(BLACKOUT_FILE, []);
shiftLogs = load(SHIFT_LOG_FILE, []);
disabledRoles = load(DISABLED_ROLES_FILE, []);

const save = (file, data) => {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(`⚠️ Error saving ${file}:`, err.message);
  }
};

/* ───────── HELPERS ───────── */
function hasEventPermission(member) {
  if (!member || !member.roles) return false;
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
  if (customStatus) return;
  
  try {
    client.user.setPresence({
      activities: [{
        name: '🍸 Shifts at the Retro Bar',
        type: ActivityType.Watching
      }],
      status: 'online'
    });
  } catch (err) {
    console.error('⚠️ Error setting status:', err.message);
  }
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

/* ───────── DUPLICATE SHIFT CHECK ───────── */
async function checkForDuplicateShift(channel, shiftDate) {
  try {
    const messages = await channel.messages.fetch({ limit: 100 });
    const shiftDay = DateTime.fromMillis(shiftDate).setZone(TIMEZONE).toFormat('EEEE');
    const expectedTitle = `🍸 ${shiftDay} Night Shift`;
    
    for (const [id, message] of messages) {
      if (message.author.id === client.user.id && message.embeds.length > 0) {
        const embed = message.embeds[0];
        
        if (embed.title === expectedTitle) {
          const existingEvent = events[id];
          if (existingEvent && !existingEvent.cancelled) {
            const existingDate = DateTime.fromMillis(existingEvent.datetime).setZone(TIMEZONE).toISODate();
            const newDate = DateTime.fromMillis(shiftDate).setZone(TIMEZONE).toISODate();
            
            if (existingDate === newDate) {
              console.log(`✅ Shift for ${shiftDay} (${newDate}) already exists (Message ID: ${id})`);
              return true;
            }
          }
        }
      }
    }
    
    return false;
  } catch (err) {
    console.error('⚠️ Error checking for duplicate shift:', err.message);
    return false;
  }
}

/* ───────── AUTO POST LOGIC ───────── */
async function autoPostWeeklyShifts() {
  try {
    if (!SIGNUP_CHANNEL) {
      console.error('❌ SIGNUP_CHANNEL_ID not configured in .env');
      return;
    }

    const channel = await client.channels.fetch(SIGNUP_CHANNEL).catch(err => {
      console.error('❌ Cannot access signup channel. Check bot permissions and channel ID.');
      console.error('   Channel ID:', SIGNUP_CHANNEL);
      console.error('   Error:', err.message);
      return null;
    });
    
    if (!channel) return;

    if (!channel.permissionsFor(client.user).has(['SendMessages', 'AddReactions', 'ViewChannel'])) {
      console.error('❌ Bot missing required permissions in signup channel');
      console.error('   Required: View Channel, Send Messages, Add Reactions');
      return;
    }

    // FIXED: Use TIMEZONE from config.json instead of AUTO_POST_TIMEZONE
    const now = DateTime.now().setZone(TIMEZONE);
    const today = now.toFormat('EEEE');
    const dateKey = now.toISODate();

    if (!config.openDays.includes(today)) {
      console.log(`⏭️ Today (${today}) is not an open day, skipping auto-post.`);
      return;
    }

    if (autoPosted[dateKey]) {
      console.log(`✅ Already auto-posted for ${dateKey}`);
      return;
    }

    if (isBlackoutDate(now.toMillis())) {
      console.log(`🚫 Today (${dateKey}) is a blackout date, skipping auto-post.`);
      return;
    }

    // FIXED: Shift time already uses TIMEZONE correctly
    const shiftTime = now.set({ 
      hour: SHIFT_START_HOUR, 
      minute: 0, 
      second: 0,
      millisecond: 0
    });

    console.log(`📋 Creating shift for ${today}:`);
    console.log(`   Current time: ${now.toFormat('yyyy-MM-dd HH:mm:ss z')}`);
    console.log(`   Shift time: ${shiftTime.toFormat('yyyy-MM-dd HH:mm:ss z')}`);
    console.log(`   Shift start hour from config: ${SHIFT_START_HOUR}`);

    const isDuplicate = await checkForDuplicateShift(channel, shiftTime.toMillis());
    if (isDuplicate) {
      console.log(`⏭️ Shift for ${today} (${dateKey}) already posted, skipping duplicate.`);
      autoPosted[dateKey] = Date.now();
      save(AUTO_POST_FILE, autoPosted);
      return;
    }

    const title = `🍸 ${today} Night Shift`;
    const signups = Object.fromEntries(
      Object.values(roleConfig).map(role => [role, []])
    );

    const unixTimestamp = Math.floor(shiftTime.toMillis() / 1000);

    const embed = new EmbedBuilder()
      .setColor(0x00b0f4)
      .setTitle(title)
      .setDescription(
        `🕒 **When:** ${formatTime(shiftTime.toMillis())}\n<t:${unixTimestamp}:F>\n<t:${unixTimestamp}:R>\n\n${buildSignupList(signups)}`
      )
      .setFooter({ text: 'React to sign up!' });

    const msg = await channel.send({ 
      content: `<@&${BAR_STAFF_ROLE_ID}> New shift posted!`,
      embeds: [embed] 
    });

    for (const emoji of Object.keys(roleConfig)) {
      await msg.react(emoji);
    }

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
    
    autoPosted[dateKey] = Date.now();
    save(AUTO_POST_FILE, autoPosted);

    console.log(`✅ Auto-posted shift for ${today}, ${dateKey}`);
  } catch (err) {
    console.error('❌ Auto-post error:', err);
  }
}

function scheduleAutoPost() {
  console.log(`⏰ Auto-post scheduler started`);
  console.log(`   Timezone: ${TIMEZONE}`);
  console.log(`   Auto-post hour: ${AUTO_POST_HOUR}`);
  console.log(`   Shift start hour: ${SHIFT_START_HOUR}`);
  console.log(`   Current time: ${DateTime.now().setZone(TIMEZONE).toFormat('yyyy-MM-dd HH:mm:ss z')}`);
  
  setInterval(async () => {
    const now = DateTime.now().setZone(TIMEZONE);
    
    // Debug logging
    if (now.minute === 0) {
      console.log(`🕐 Hourly check - Current time: ${now.toFormat('HH:mm z')} | Looking for hour: ${AUTO_POST_HOUR}`);
    }
    
    if (now.hour === AUTO_POST_HOUR && now.minute < 10) {
      console.log(`✅ Auto-post hour reached! Running auto-post at ${now.toFormat('yyyy-MM-dd HH:mm:ss z')}`);
      await autoPostWeeklyShifts();
    }
  }, 10 * 60 * 1000);
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
    } catch (err) {
      console.error('⚠️ Reminder error:', err.message);
    }
  }, delay);
}

function scheduleBackupAlert(id) {
  const ev = events[id];
  if (!ev || ev.cancelled) return;

  // Alert 2 hours before
  const alertTime2Hours = ev.datetime - 2 * 60 * 60 * 1000;
  const delay2Hours = alertTime2Hours - Date.now();
  
  if (delay2Hours > 0) {
    backupAlertTimers[id] = setTimeout(async () => {
      await sendBackupAlert(ev, '2 hours');
    }, delay2Hours);
  }

  // Alert 5 minutes before
  const alertTime5Min = ev.datetime - 5 * 60 * 1000;
  const delay5Min = alertTime5Min - Date.now();
  
  if (delay5Min > 0) {
    backupAlert5MinTimers[id] = setTimeout(async () => {
      await sendBackupAlert(ev, '5 minutes');
    }, delay5Min);
  }

  // Alert at start time
  const delayStart = ev.datetime - Date.now();
  
  if (delayStart > 0) {
    backupAlertStartTimers[id] = setTimeout(async () => {
      await sendBackupAlert(ev, 'now (shift starting)');
    }, delayStart);
  }
}

async function sendBackupAlert(ev, timeframe) {
  const missing = Object.values(roleConfig).filter(
    r => !disabledRoles.includes(r) && !(ev.signups[r]?.length)
  );
  if (!missing.length) return;

  try {
    if (!STAFF_CHAT_CHANNEL) {
      console.error('⚠️ STAFF_CHAT_CHANNEL_ID not configured in .env - backup alert not sent');
      return;
    }

    const staffChannel = await client.channels.fetch(STAFF_CHAT_CHANNEL).catch(err => {
      console.error('⚠️ Cannot access staff chat channel for backup alert');
      console.error('   Channel ID:', STAFF_CHAT_CHANNEL);
      console.error('   Error:', err.message);
      return null;
    });

    if (!staffChannel) {
      console.error('❌ Staff chat channel not found, backup alert not sent');
      return;
    }

    const signupChannel = await client.channels.fetch(ev.channelId);
    const guild = signupChannel.guild;
    
    const roleMentions = [];
    for (const missingRole of missing) {
      let discordRole = null;
      
      if (missingRole === 'Backup Manager' || missingRole === 'Active Manager') {
        // For both manager roles, ping Head Manager and Manager
        const headManager = guild.roles.cache.find(r => r.name.toLowerCase() === 'head manager');
        const manager = guild.roles.cache.find(r => r.name.toLowerCase() === 'manager');
        
        if (headManager) roleMentions.push(`<@&${headManager.id}>`);
        if (manager) roleMentions.push(`<@&${manager.id}>`);
        
        // If neither found, show the role name
        if (!headManager && !manager) {
          roleMentions.push(`**${missingRole}**`);
        }
      } else {
        discordRole = guild.roles.cache.find(r => 
          r.name.toLowerCase() === missingRole.toLowerCase()
        );
        
        if (discordRole) {
          roleMentions.push(`<@&${discordRole.id}>`);
        } else {
          roleMentions.push(`**${missingRole}**`);
        }
      }
    }
    
    await staffChannel.send(
      `⚠️ **BACKUP NEEDED** (${timeframe}) for ${ev.title}\nMissing positions:\n${roleMentions.join('\n')}`
    );
  } catch (err) {
    console.error('⚠️ Backup alert error:', err.message);
  }
}

/* ───────── SLASH COMMANDS ───────── */
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
    .setDescription('Repost the latest upcoming shift event')
];

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    await rest.put(Routes.applicationCommands(CLIENT_ID), {
      body: commands.map(c => c.toJSON())
    });
    console.log('✅ Slash commands registered');
  } catch (err) {
    console.error('❌ Error registering commands:', err);
  }
})();

/* ───────── INTERACTIONS ───────── */
client.on('interactionCreate', async i => {
  try {
    if (i.isChatInputCommand() && i.commandName === 'createevent') {
      if (!hasEventPermission(i.member))
        return await i.reply({ content: '❌ No permission.', ephemeral: true });

      const modal = new ModalBuilder()
        .setCustomId('createEventModal')
        .setTitle('Create New Shift Event');

      const titleInput = new TextInputBuilder()
        .setCustomId('eventTitle')
        .setLabel('Event Title')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g., Friday Night Shift')
        .setRequired(true)
        .setMaxLength(100);

      const dateInput = new TextInputBuilder()
        .setCustomId('eventDate')
        .setLabel('Date (DD-MM-YYYY)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g., 25-01-2026')
        .setRequired(true)
        .setMaxLength(10);

      const timeInput = new TextInputBuilder()
        .setCustomId('eventTime')
        .setLabel('Time (h:mm AM/PM)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g., 9:00 PM')
        .setRequired(true)
        .setMaxLength(10);

      const firstRow = new ActionRowBuilder().addComponents(titleInput);
      const secondRow = new ActionRowBuilder().addComponents(dateInput);
      const thirdRow = new ActionRowBuilder().addComponents(timeInput);

      modal.addComponents(firstRow, secondRow, thirdRow);

      await i.showModal(modal);
      return;
    }

    if (i.isModalSubmit() && i.customId === 'createEventModal') {
      const title = i.fields.getTextInputValue('eventTitle');
      const dateStr = i.fields.getTextInputValue('eventDate');
      const timeStr = i.fields.getTextInputValue('eventTime');

      const datetimeStr = `${dateStr} ${timeStr}`;
      const dt = DateTime.fromFormat(datetimeStr, 'dd-MM-yyyy h:mm a', { zone: TIMEZONE });

      if (!dt.isValid) {
        return await i.reply({
          content: '❌ Invalid date/time format. Please use:\n• Date: DD-MM-YYYY (e.g., 25-01-2026)\n• Time: h:mm AM/PM (e.g., 9:00 PM)',
          ephemeral: true
        });
      }

      if (dt.toMillis() < Date.now()) {
        return await i.reply({
          content: '❌ Cannot create an event in the past.',
          ephemeral: true
        });
      }

      await i.deferReply({ ephemeral: true });

      try {
        const channel = await client.channels.fetch(SIGNUP_CHANNEL);
        
        const signups = Object.fromEntries(
          Object.values(roleConfig).map(role => [role, []])
        );

        const unixTimestamp = Math.floor(dt.toMillis() / 1000);
        
        const embed = new EmbedBuilder()
          .setColor(0x00b0f4)
          .setTitle(title)
          .setDescription(
            `🕒 **When:** ${formatTime(dt.toMillis())}\n<t:${unixTimestamp}:F>\n<t:${unixTimestamp}:R>\n\n${buildSignupList(signups)}`
          )
          .setFooter({ text: 'React to sign up!' });

        const msg = await channel.send({
          content: `<@&${BAR_STAFF_ROLE_ID}> New shift posted!`,
          embeds: [embed]
        });

        for (const emoji of Object.keys(roleConfig)) {
          await msg.react(emoji);
        }

        events[msg.id] = {
          id: msg.id,
          title,
          datetime: dt.toMillis(),
          channelId: channel.id,
          signups,
          cancelled: false
        };

        scheduleReminder(msg.id);
        scheduleBackupAlert(msg.id);
        save(DATA_FILE, events);

        await i.editReply({
          content: `✅ Event created successfully!\n**${title}**\n🕒 ${formatTime(dt.toMillis())}\n📍 Message ID: ${msg.id}`
        });
      } catch (err) {
        console.error('❌ Error creating event:', err);
        await i.editReply({
          content: '❌ Failed to create event. Check bot permissions in the signup channel.'
        });
      }
      return;
    }

    if (!i.isChatInputCommand()) return;

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

      return await i.reply({
        content: results.length
          ? `📋 **Your Signups:**\n\n${results.join('\n')}`
          : '🔭 You are not signed up for any upcoming shifts.',
        ephemeral: true
      });
    }

    if (i.commandName === 'nextshift') {
      const now = DateTime.now().setZone(TIMEZONE);
      let nextOpenDate = null;
      
      for (let j = 0; j < 14; j++) {
        const checkDate = now.plus({ days: j });
        const dayName = checkDate.toFormat('EEEE');
        const shiftTime = checkDate.set({ hour: 21, minute: 0, second: 0, millisecond: 0 });
        
        if (config.openDays.includes(dayName) && shiftTime > now) {
          nextOpenDate = shiftTime;
          break;
        }
      }

      if (!nextOpenDate) {
        return await i.reply({
          content: '📅 No upcoming open days found in the next 2 weeks.',
          ephemeral: true
        });
      }

      const unixTimestamp = Math.floor(nextOpenDate.toMillis() / 1000);
      const dayName = nextOpenDate.toFormat('EEEE');

      const embed = new EmbedBuilder()
        .setColor(0x00b0f4)
        .setTitle('📅 Next Open Day')
        .addFields(
          { name: 'Day', value: `${dayName} Night`, inline: false },
          { name: 'Shift Starts', value: `<t:${unixTimestamp}:F>`, inline: false },
          { name: 'Countdown', value: `<t:${unixTimestamp}:R>`, inline: false }
        )
        .setFooter({ text: 'All times shown in your local timezone' });

      return await i.reply({ embeds: [embed], ephemeral: true });
    }

    if (i.commandName === 'areweopen') {
      const now = DateTime.now().setZone(TIMEZONE);
      const today = now.toFormat('EEEE');
      const todayAt9PM = now.set({ hour: 21, minute: 0, second: 0, millisecond: 0 });

      if (config.openDays.includes(today)) {
        const unixTimestamp = Math.floor(todayAt9PM.toMillis() / 1000);
        
        if (now > todayAt9PM) {
          let nextOpenDate = null;
          
          for (let j = 1; j < 14; j++) {
            const checkDate = now.plus({ days: j });
            const dayName = checkDate.toFormat('EEEE');
            const shiftTime = checkDate.set({ hour: 21, minute: 0, second: 0, millisecond: 0 });
            
            if (config.openDays.includes(dayName)) {
              nextOpenDate = shiftTime;
              break;
            }
          }

          if (nextOpenDate) {
            const nextUnixTimestamp = Math.floor(nextOpenDate.toMillis() / 1000);
            const nextDayName = nextOpenDate.toFormat('EEEE');
            
            return await i.reply({
              content: `🍸 **Yes, we were open today!**\n\nBut it's past 9 PM now.\n\n**We open next on ${nextDayName}**\n<t:${nextUnixTimestamp}:F>\n<t:${nextUnixTimestamp}:R>`,
              ephemeral: true
            });
          }
        }
        
        return await i.reply({
          content: `🍸 **Yes, we are open today!**\n\n**Shift starts at:**\n<t:${unixTimestamp}:F>\n<t:${unixTimestamp}:R>`,
          ephemeral: true
        });
      } else {
        let nextOpenDate = null;
        
        for (let j = 1; j < 14; j++) {
          const checkDate = now.plus({ days: j });
          const dayName = checkDate.toFormat('EEEE');
          const shiftTime = checkDate.set({ hour: 21, minute: 0, second: 0, millisecond: 0 });
          
          if (config.openDays.includes(dayName)) {
            nextOpenDate = shiftTime;
            break;
          }
        }

        if (!nextOpenDate) {
          return await i.reply({
            content: '❌ **No, we are not open today.**\n\nNo upcoming open days found in the next 2 weeks.',
            ephemeral: true
          });
        }

        const unixTimestamp = Math.floor(nextOpenDate.toMillis() / 1000);
        const nextDayName = nextOpenDate.toFormat('EEEE');

        return await i.reply({
          content: `❌ **No, we are not open today.**\n\n**We open next on ${nextDayName}**\n<t:${unixTimestamp}:F>\n<t:${unixTimestamp}:R>`,
          ephemeral: true
        });
      }
    }

    if (i.commandName === 'cancelevent') {
      if (!hasEventPermission(i.member))
        return await i.reply({ content: '❌ No permission.', ephemeral: true });

      const id = i.options.getString('messageid');
      const ev = events[id];
      
      if (!ev || ev.cancelled)
        return await i.reply({ content: '⚠️ Event not found.', ephemeral: true });

      ev.cancelled = true;
      save(DATA_FILE, events);
      clearTimeout(reminderTimers[id]);
      clearTimeout(backupAlertTimers[id]);
      clearTimeout(backupAlert5MinTimers[id]);
      clearTimeout(backupAlertStartTimers[id]);

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
      } catch (err) {
        console.error('⚠️ Error updating cancelled event message:', err.message);
      }

      return await i.reply({ content: '✅ Event cancelled.', ephemeral: true });
    }

    if (i.commandName === 'editeventtime') {
      if (!hasEventPermission(i.member))
        return await i.reply({ content: '❌ No permission.', ephemeral: true });

      const id = i.options.getString('messageid');
      const dtStr = i.options.getString('datetime');
      const ev = events[id];

      if (!ev || ev.cancelled)
        return await i.reply({ content: '⚠️ Event not found.', ephemeral: true });

      const dt = DateTime.fromFormat(dtStr, 'dd-MM-yyyy h:mm a', { zone: TIMEZONE });
      if (!dt.isValid)
        return await i.reply({ content: '❌ Invalid date format. Use DD-MM-YYYY h:mm AM/PM', ephemeral: true });

      ev.datetime = dt.toMillis();
      save(DATA_FILE, events);

      clearTimeout(reminderTimers[id]);
      clearTimeout(backupAlertTimers[id]);
      clearTimeout(backupAlert5MinTimers[id]);
      clearTimeout(backupAlertStartTimers[id]);
      scheduleReminder(id);
      scheduleBackupAlert(id);

      try {
        const ch = await client.channels.fetch(ev.channelId);
        const msg = await ch.messages.fetch(id);

        const unixTimestamp = Math.floor(ev.datetime / 1000);

        await msg.edit({
          embeds: [
            new EmbedBuilder()
              .setColor(0x00b0f4)
              .setTitle(ev.title)
              .setDescription(
                `🕒 **When:** ${formatTime(ev.datetime)}\n<t:${unixTimestamp}:F>\n<t:${unixTimestamp}:R>\n\n${buildSignupList(ev.signups)}`
              )
          ]
        });
      } catch (err) {
        console.error('⚠️ Error updating event message:', err.message);
      }

      return await i.reply({ content: '✅ Event time updated.', ephemeral: true });
    }

    if (i.commandName === 'setstatus') {
      if (!hasEventPermission(i.member))
        return await i.reply({ content: '❌ You need one of the following roles to use this command: ' + config.eventCreatorRoles.join(', '), ephemeral: true });

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

      return await i.reply({ content: `✅ Status set to: ${type} ${status}`, ephemeral: true });
    }

    if (i.commandName === 'statusclear') {
      if (!hasEventPermission(i.member))
        return await i.reply({ content: '❌ You need one of the following roles to use this command: ' + config.eventCreatorRoles.join(', '), ephemeral: true });

      customStatus = null;
      setDefaultStatus();

      return await i.reply({ content: '✅ Status cleared, reverted to default.', ephemeral: true });
    }

    if (i.commandName === 'addblackout') {
      if (!hasEventPermission(i.member))
        return await i.reply({ content: '❌ No permission.', ephemeral: true });

      const dateStr = i.options.getString('date');
      const dt = DateTime.fromISO(dateStr, { zone: TIMEZONE });

      if (!dt.isValid)
        return await i.reply({ content: '❌ Invalid date format. Use YYYY-MM-DD', ephemeral: true });

      if (blackoutDates.includes(dateStr))
        return await i.reply({ content: '⚠️ Date already in blackout list.', ephemeral: true });

      blackoutDates.push(dateStr);
      save(BLACKOUT_FILE, blackoutDates);

      return await i.reply({ content: `✅ Added blackout date: ${dateStr}`, ephemeral: true });
    }

    if (i.commandName === 'removeblackout') {
      if (!hasEventPermission(i.member))
        return await i.reply({ content: '❌ No permission.', ephemeral: true });

      const dateStr = i.options.getString('date');
      const idx = blackoutDates.indexOf(dateStr);

      if (idx === -1)
        return await i.reply({ content: '⚠️ Date not found in blackout list.', ephemeral: true });

      blackoutDates.splice(idx, 1);
      save(BLACKOUT_FILE, blackoutDates);

      return await i.reply({ content: `✅ Removed blackout date: ${dateStr}`, ephemeral: true });
    }

    if (i.commandName === 'listblackouts') {
      if (!blackoutDates.length)
        return await i.reply({ content: '📅 No blackout dates set.', ephemeral: true });

      const sorted = blackoutDates.sort();
      return await i.reply({
        content: `📅 **Blackout Dates:**\n${sorted.map(d => `• ${d}`).join('\n')}`,
        ephemeral: true
      });
    }

    if (i.commandName === 'enable') {
      if (!hasEventPermission(i.member))
        return await i.reply({ content: '❌ No permission.', ephemeral: true });

      const role = i.options.getString('role');
      const idx = disabledRoles.indexOf(role);

      if (idx === -1)
        return await i.reply({ content: `⚠️ **${role}** is already enabled.`, ephemeral: true });

      disabledRoles.splice(idx, 1);
      save(DISABLED_ROLES_FILE, disabledRoles);

      return await i.reply({ content: `✅ **${role}** role has been enabled for signups.`, ephemeral: true });
    }

    if (i.commandName === 'disable') {
      if (!hasEventPermission(i.member))
        return await i.reply({ content: '❌ No permission.', ephemeral: true });

      const role = i.options.getString('role');

      if (disabledRoles.includes(role))
        return await i.reply({ content: `⚠️ **${role}** is already disabled.`, ephemeral: true });

      disabledRoles.push(role);
      save(DISABLED_ROLES_FILE, disabledRoles);

      return await i.reply({ content: `✅ **${role}** role has been disabled for signups.`, ephemeral: true });
    }

    if (i.commandName === 'help') {
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

    if (i.commandName === 'refresh') {
      const id = i.options.getString('messageid');
      const ev = events[id];
      
      if (!ev) {
        return await i.reply({ content: '⚠️ Event not found. Make sure the message ID is correct.', ephemeral: true });
      }

      if (ev.cancelled) {
        return await i.reply({ content: '⚠️ Cannot refresh a cancelled event.', ephemeral: true });
      }

      await i.deferReply({ ephemeral: true });

      try {
        const channel = await client.channels.fetch(ev.channelId);
        const msg = await channel.messages.fetch(id);

        const unixTimestamp = Math.floor(ev.datetime / 1000);

        const embed = new EmbedBuilder()
          .setColor(0x00b0f4)
          .setTitle(ev.title)
          .setDescription(
            `🕒 **When:** ${formatTime(ev.datetime)}\n<t:${unixTimestamp}:F>\n<t:${unixTimestamp}:R>\n\n${buildSignupList(ev.signups)}`
          )
          .setFooter({ text: 'React to sign up!' });

        await msg.edit({ embeds: [embed] });

        await i.editReply({ content: '✅ Shift signup embed refreshed successfully!' });
      } catch (err) {
        console.error('⚠️ Error refreshing embed:', err.message);
        await i.editReply({ content: '❌ Failed to refresh embed. Make sure the message ID is correct and the bot has access to that channel.' });
      }
      return;
    }

    if (i.commandName === 'repost') {
      if (!hasEventPermission(i.member))
        return await i.reply({ content: '❌ You need one of the following roles to use this command: ' + config.eventCreatorRoles.join(', '), ephemeral: true });

      await i.deferReply({ ephemeral: true });

      try {
        // Find the latest upcoming non-cancelled event
        const now = Date.now();
        let latestEvent = null;
        let latestEventId = null;

        for (const [id, ev] of Object.entries(events)) {
          if (ev.cancelled || ev.datetime < now) continue;
          
          if (!latestEvent || ev.datetime < latestEvent.datetime) {
            latestEvent = ev;
            latestEventId = id;
          }
        }

        if (!latestEvent) {
          return await i.editReply({ content: '⚠️ No upcoming shifts found to repost.' });
        }

        // Fetch the channel
        const channel = await client.channels.fetch(SIGNUP_CHANNEL);
        
        // Create new embed with current data
        const unixTimestamp = Math.floor(latestEvent.datetime / 1000);
        
        const embed = new EmbedBuilder()
          .setColor(0x00b0f4)
          .setTitle(latestEvent.title)
          .setDescription(
            `🕒 **When:** ${formatTime(latestEvent.datetime)}\n<t:${unixTimestamp}:F>\n<t:${unixTimestamp}:R>\n\n${buildSignupList(latestEvent.signups)}`
          )
          .setFooter({ text: 'React to sign up!' });

        // Send new message
        const newMsg = await channel.send({
          content: `<@&${BAR_STAFF_ROLE_ID}> Shift reposted!`,
          embeds: [embed]
        });

        // Add reactions
        for (const emoji of Object.keys(roleConfig)) {
          await newMsg.react(emoji);
        }

        // Update events storage with new message ID
        events[newMsg.id] = {
          ...latestEvent,
          id: newMsg.id,
          channelId: channel.id
        };

        // Remove old event reference
        delete events[latestEventId];

        // Clear old timers
        clearTimeout(reminderTimers[latestEventId]);
        clearTimeout(backupAlertTimers[latestEventId]);
        clearTimeout(backupAlert5MinTimers[latestEventId]);
        clearTimeout(backupAlertStartTimers[latestEventId]);

        // Schedule new timers
        scheduleReminder(newMsg.id);
        scheduleBackupAlert(newMsg.id);

        save(DATA_FILE, events);

        // Try to delete old message
        try {
          const oldChannel = await client.channels.fetch(latestEvent.channelId);
          const oldMsg = await oldChannel.messages.fetch(latestEventId);
          await oldMsg.delete();
        } catch (err) {
          console.error('⚠️ Could not delete old message:', err.message);
        }

        await i.editReply({ 
          content: `✅ Reposted shift: **${latestEvent.title}**\n🕒 ${formatTime(latestEvent.datetime)}\n📍 New Message ID: ${newMsg.id}\n🗑️ Old Message ID: ${latestEventId}` 
        });

      } catch (err) {
        console.error('❌ Error reposting event:', err);
        await i.editReply({ content: '❌ Failed to repost event. Check bot permissions and try again.' });
      }
      return;
    }

  } catch (err) {
    console.error(`❌ Error handling command ${i.commandName}:`, err);
    
    try {
      const errorMsg = { content: '❌ An error occurred processing your command.', ephemeral: true };
      if (i.replied || i.deferred) {
        await i.followUp(errorMsg);
      } else {
        await i.reply(errorMsg);
      }
    } catch (replyErr) {
      console.error('❌ Could not send error message:', replyErr.message);
    }
  }
});

/* ───────── REACTION HANDLER ───────── */
client.on('messageReactionAdd', async (reaction, user) => {
  if (user.bot) return;

  try {
    if (reaction.partial) {
      await reaction.fetch();
    }
  } catch (err) {
    console.error('⚠️ Error fetching reaction:', err.message);
    return;
  }

  const messageId = reaction.message.id;
  const ev = events[messageId];
  
  if (!ev || ev.cancelled) return;

  const emoji = reaction.emoji.name;
  const role = roleConfig[emoji];

  if (!role) return;

  if (disabledRoles.includes(role)) {
    try {
      await reaction.users.remove(user.id);
      await user.send(`⚠️ Sorry, the **${role}** role is currently disabled for signups.`);
    } catch (err) {
      console.error('⚠️ Error handling disabled role reaction:', err.message);
    }
    return;
  }

  let previousEmoji = null;
  for (const [r, users] of Object.entries(ev.signups)) {
    const idx = users.indexOf(user.id);
    if (idx > -1) {
      users.splice(idx, 1);
      previousEmoji = Object.keys(roleConfig).find(e => roleConfig[e] === r);
    }
  }

  if (previousEmoji && previousEmoji !== emoji) {
    try {
      const previousReaction = reaction.message.reactions.cache.get(previousEmoji);
      if (previousReaction) {
        await previousReaction.users.remove(user.id);
      }
    } catch (err) {
      console.error('⚠️ Error removing previous reaction:', err.message);
    }
  }

  if (!ev.signups[role]) ev.signups[role] = [];
  if (!ev.signups[role].includes(user.id)) {
    ev.signups[role].push(user.id);
  }

  save(DATA_FILE, events);

  try {
    const unixTimestamp = Math.floor(ev.datetime / 1000);
    
    const embed = new EmbedBuilder()
      .setColor(0x00b0f4)
      .setTitle(ev.title)
      .setDescription(
        `🕒 **When:** ${formatTime(ev.datetime)}\n<t:${unixTimestamp}:F>\n<t:${unixTimestamp}:R>\n\n${buildSignupList(ev.signups)}`
      )
      .setFooter({ text: 'React to sign up!' });

    await reaction.message.edit({ embeds: [embed] });
  } catch (err) {
    console.error('⚠️ Error updating embed on reaction add:', err.message);
  }
});

client.on('messageReactionRemove', async (reaction, user) => {
  if (user.bot) return;

  try {
    if (reaction.partial) {
      await reaction.fetch();
    }
  } catch (err) {
    console.error('⚠️ Error fetching reaction:', err.message);
    return;
  }

  const messageId = reaction.message.id;
  const ev = events[messageId];
  
  if (!ev || ev.cancelled) return;

  const emoji = reaction.emoji.name;
  const role = roleConfig[emoji];

  if (!role) return;

  const users = ev.signups[role] || [];
  const idx = users.indexOf(user.id);
  if (idx > -1) {
    users.splice(idx, 1);
  }

  save(DATA_FILE, events);

  try {
    const unixTimestamp = Math.floor(ev.datetime / 1000);
    
    const embed = new EmbedBuilder()
      .setColor(0x00b0f4)
      .setTitle(ev.title)
      .setDescription(
        `🕒 **When:** ${formatTime(ev.datetime)}\n<t:${unixTimestamp}:F>\n<t:${unixTimestamp}:R>\n\n${buildSignupList(ev.signups)}`
      )
      .setFooter({ text: 'React to sign up!' });

    await reaction.message.edit({ embeds: [embed] });
  } catch (err) {
    console.error('⚠️ Error updating embed on reaction remove:', err.message);
  }
});

/* ───────── READY ───────── */
client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log(`\n⚙️  Configuration:`);
  console.log(`   Timezone: ${TIMEZONE}`);
  console.log(`   Auto-post hour: ${AUTO_POST_HOUR} (${AUTO_POST_HOUR}:00 ${TIMEZONE})`);
  console.log(`   Shift start hour: ${SHIFT_START_HOUR} (${SHIFT_START_HOUR}:00 ${TIMEZONE})`);
  console.log(`   Current server time: ${DateTime.now().setZone(TIMEZONE).toFormat('yyyy-MM-dd HH:mm:ss z')}`);
  console.log(`   Open days: ${config.openDays.join(', ')}\n`);
  
  if (SIGNUP_CHANNEL) {
    try {
      const channel = await client.channels.fetch(SIGNUP_CHANNEL);
      if (channel) {
        const perms = channel.permissionsFor(client.user);
        if (perms.has(['ViewChannel', 'SendMessages', 'AddReactions'])) {
          console.log('✅ Signup channel access verified');
        } else {
          console.error('⚠️ Bot has access to channel but missing permissions');
          console.error('   Required: View Channel, Send Messages, Add Reactions');
        }
      }
    } catch (err) {
      console.error('⚠️ Cannot access signup channel - check bot permissions');
      console.error('   Channel ID:', SIGNUP_CHANNEL);
      console.error('   Make sure the bot has access to this channel');
    }
  } else {
    console.error('⚠️ SIGNUP_CHANNEL_ID not set in .env');
  }

  if (STAFF_CHAT_CHANNEL) {
    try {
      const staffChannel = await client.channels.fetch(STAFF_CHAT_CHANNEL);
      if (staffChannel) {
        const perms = staffChannel.permissionsFor(client.user);
        if (perms.has(['ViewChannel', 'SendMessages'])) {
          console.log('✅ Staff chat channel access verified');
        } else {
          console.error('⚠️ Bot has access to staff chat but missing permissions');
          console.error('   Required: View Channel, Send Messages');
        }
      }
    } catch (err) {
      console.error('⚠️ Cannot access staff chat channel - check bot permissions');
      console.error('   Channel ID:', STAFF_CHAT_CHANNEL);
      console.error('   Backup alerts will not be sent');
    }
  } else {
    console.error('⚠️ STAFF_CHAT_CHANNEL_ID not set in .env - backup alerts will not be sent');
  }
  
  setDefaultStatus();
  
  Object.keys(events).forEach(id => {
    scheduleReminder(id);
    scheduleBackupAlert(id);
  });

  scheduleAutoPost();
  
  // Initial check 5 seconds after startup - only run if it's the correct hour
  setTimeout(() => {
    const now = DateTime.now().setZone(TIMEZONE);
    console.log(`\n🔍 Initial auto-post check at startup:`);
    console.log(`   Current time: ${now.toFormat('yyyy-MM-dd HH:mm:ss z')}`);
    console.log(`   Current hour: ${now.hour} | Target hour: ${AUTO_POST_HOUR}`);
    console.log(`   Will run: ${now.hour === AUTO_POST_HOUR && now.minute < 10 ? 'YES' : 'NO'}\n`);
    
    // Only run auto-post if it's within the configured hour window
    if (now.hour === AUTO_POST_HOUR && now.minute < 10) {
      autoPostWeeklyShifts();
    } else {
      console.log(`⏭️ Skipping auto-post at startup - not within configured hour window`);
    }
  }, 5000);
});

client.login(TOKEN);