<<<<<<< Updated upstream
const { Client, GatewayIntentBits, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ButtonBuilder, ButtonStyle } = require('discord.js');
=======
/***********************
 * Retro Replay Bot
 * Full Commands + Slash Refactor
 * v15 Ready | DD-MM-YYYY Format
 ***********************/

const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActivityType,
  SlashCommandBuilder,
  REST,
  Routes,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');

>>>>>>> Stashed changes
const fs = require('fs');

<<<<<<< Updated upstream
// Read bot token from config file
let config;
try {
  const configFile = fs.readFileSync('./config.json', 'utf8');
  config = JSON.parse(configFile);
} catch (error) {
  console.error('Error reading config.json:', error.message);
  console.error('Please create a config.json file with your bot token and channelId.');
  process.exit(1);
}

if (!config.token) {
  console.error('Bot token is missing in config.json');
  process.exit(1);
}

if (!config.signupChannelId) {
  console.error('signupChannelId is missing in config.json. Please add the channel ID where signup sheets should be posted.');
  process.exit(1);
}

if (!config.openDays || !Array.isArray(config.openDays)) {
  console.error('openDays is missing in config.json. Please add an array of days the bar is open (e.g., ["Friday", "Saturday", "Sunday"])');
  process.exit(1);
}
=======
/* ───────── SAFETY ───────── */
process.on('unhandledRejection', err => console.error('[UnhandledRejection]', err));
process.on('uncaughtException', err => console.error('[UncaughtException]', err));
>>>>>>> Stashed changes

/* ───────── CLIENT ───────── */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

<<<<<<< Updated upstream
// Role configuration - map emojis to role names
=======
/* ───────── CONSTANTS ───────── */
const DATA_FILE = path.join(__dirname, 'scheduled_events.json');
const TIMEZONE = 'America/New_York';
const SIGNUP_CHANNEL = config.signupChannelId;

>>>>>>> Stashed changes
const roleConfig = {
  '1️⃣': 'Active Manager',
  '2️⃣': 'Backup Manager',
  '3️⃣': 'Bouncer',
  '4️⃣': 'Bartender',
  '5️⃣': 'Dancer',
  '6️⃣': 'DJ'
};

<<<<<<< Updated upstream
// Store signups - structure: { messageId: { roleName: [userId1, userId2, ...] } }
const signups = new Map();
let signupMessageId = null;
let signupChannelId = null;

// Store scheduled events
const scheduledEvents = [];

// Function to save scheduled events to file
function saveScheduledEvents() {
  try {
    fs.writeFileSync('./scheduled_events.json', JSON.stringify(scheduledEvents, null, 2));
    console.log('Scheduled events saved to file');
  } catch (error) {
    console.error('Error saving scheduled events:', error);
  }
}

// Function to load scheduled events from file
function loadScheduledEvents() {
  try {
    if (fs.existsSync('./scheduled_events.json')) {
      const data = fs.readFileSync('./scheduled_events.json', 'utf8');
      const events = JSON.parse(data);
      scheduledEvents.push(...events);
      console.log(`Loaded ${events.length} scheduled events from file`);
    }
  } catch (error) {
    console.error('Error loading scheduled events:', error);
  }
}

// Function to save current signups for a message
function saveSignupsForEvent(messageId, eventTitle) {
  const eventIndex = scheduledEvents.findIndex(e => e.title === eventTitle);
  if (eventIndex === -1) return;
  
  const currentSignups = signups.get(messageId);
  if (currentSignups) {
    scheduledEvents[eventIndex].signups = currentSignups;
    saveScheduledEvents();
    console.log(`Saved signups for event: ${eventTitle}`);
  }
}

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  console.log('Bot is ready! Use !setup in a channel to create the reaction role message.');
  
  // Load scheduled events
  loadScheduledEvents();
  
  // Schedule daily signup sheet posting
  scheduleDailySignup();
});

// Function to get next 2 AM GMT timestamp
function getNext2AMGMT() {
  const now = new Date();
  const next2AM = new Date(now);
  
  // Set to GMT timezone and 2 AM
  next2AM.setUTCHours(2, 0, 0, 0);
  
  // If 2 AM today has passed, set to tomorrow
  if (now >= next2AM) {
    next2AM.setUTCDate(next2AM.getUTCDate() + 1);
  }
  
  return Math.floor(next2AM.getTime() / 1000);
}

// Function to build the signup list text
function buildSignupList(messageId) {
  const roleSignups = signups.get(messageId) || {};
  let signupText = '';
  
  for (const [emoji, roleName] of Object.entries(roleConfig)) {
    const users = roleSignups[roleName] || [];
    signupText += `\n**${emoji} ${roleName}:**\n`;
    
    if (users.length === 0) {
      signupText += `*No signups yet*\n`;
    } else {
      users.forEach(userId => {
        signupText += `• <@${userId}>\n`;
      });
    }
  }
  
  return signupText;
}

// Function to build custom event signup list
function buildCustomSignupList(messageId, customRoleConfig) {
  const roleSignups = signups.get(messageId) || {};
  return buildCustomSignupListWithData(customRoleConfig, roleSignups);
}

// Function to build custom event signup list with data
function buildCustomSignupListWithData(customRoleConfig, signupData) {
  let signupText = '';
  
  for (const [emoji, roleName] of Object.entries(customRoleConfig)) {
    const users = signupData[roleName] || [];
    signupText += `\n**${emoji} ${roleName}:**\n`;
    
    if (users.length === 0) {
      signupText += `*No signups yet*\n`;
    } else {
      users.forEach(userId => {
        signupText += `• <@${userId}>\n`;
      });
    }
  }
  
  return signupText;
}

// Function to create and post the signup embed
async function createSignupEmbed(channel) {
  const next2AM = getNext2AMGMT();
  
  const embed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle('📋 Staff Position Signup')
    .setDescription('React to this message to sign up for staff positions!\n\n' +
      `**Bar Opens in:** <t:${next2AM}:R>\n` +
      `Opens at: <t:${next2AM}:F>\n` +
      '═══════════════════════════\n' +
      buildSignupList(null))
    .setFooter({ text: 'React with the corresponding emoji to sign up!' })
    .setTimestamp();

  // Find the @bar staff role
  const barStaffRole = channel.guild.roles.cache.find(role => role.name.toLowerCase() === 'bar staff');
  
  const messageContent = {
    embeds: [embed]
  };
  
  // Add role ping if the role exists
  if (barStaffRole) {
    messageContent.content = `<@&${barStaffRole.id}> New signup sheet is now available!`;
  }

  const sentMessage = await channel.send(messageContent);
  
  // Initialize empty signup tracking for this message
  signups.set(sentMessage.id, {});
  
  // Add all reactions
  for (const emoji of Object.keys(roleConfig)) {
    await sentMessage.react(emoji);
  }

  signupMessageId = sentMessage.id;
  signupChannelId = sentMessage.channel.id;
  
  console.log(`Signup sheet posted at ${new Date().toISOString()}`);
  return sentMessage;
}

// Function to update the signup message
async function updateSignupMessage(message) {
  // Check if this is a custom event
  let isCustomEvent = false;
  let customConfig = null;
  
  if (client.customEventRoles && client.customEventRoles.has(message.id)) {
    isCustomEvent = true;
    customConfig = client.customEventRoles.get(message.id);
  }
  
  const embed = message.embeds[0];
  if (!embed) return;

  let description = embed.description;
  
  // Find where the signup list starts (after the separator line)
  const separatorIndex = description.indexOf('═══════════════════════════');
  if (separatorIndex === -1) return;
  
  const headerPart = description.substring(0, separatorIndex + '═══════════════════════════'.length);
  
  // Rebuild with updated signup list
  let newDescription;
  if (isCustomEvent) {
    newDescription = headerPart + '\n' + buildCustomSignupList(message.id, customConfig);
  } else {
    const next2AM = getNext2AMGMT();
    newDescription = `React to this message to sign up for staff positions!\n\n` +
      `**Bar Opens in:** <t:${next2AM}:R>\n` +
      `Opens at: <t:${next2AM}:F>\n` +
      '═══════════════════════════\n' +
      buildSignupList(message.id);
  }

  const updatedEmbed = EmbedBuilder.from(embed)
    .setDescription(newDescription);

  await message.edit({ embeds: [updatedEmbed] });
}

// Function to schedule daily signup posting at 5 PM GMT
function scheduleDailySignup() {
  const checkTime = () => {
    const now = new Date();
    const next5PM = new Date(now);
    
    // Set to 5 PM GMT (17:00 UTC)
    next5PM.setUTCHours(17, 0, 0, 0);
    
    // If 5 PM today has passed, set to tomorrow
    if (now >= next5PM) {
      next5PM.setUTCDate(next5PM.getUTCDate() + 1);
    }
    
    // Find next open day
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const openDaysLower = config.openDays.map(d => d.toLowerCase());
    
    // Keep advancing until we find an open day
    while (!openDaysLower.includes(daysOfWeek[next5PM.getUTCDay()].toLowerCase())) {
      next5PM.setUTCDate(next5PM.getUTCDate() + 1);
      next5PM.setUTCHours(17, 0, 0, 0);
    }
    
    const timeUntil = next5PM.getTime() - now.getTime();
    
    console.log(`Next signup sheet will be posted at ${next5PM.toISOString()} (${daysOfWeek[next5PM.getUTCDay()]})`);
    
    setTimeout(async () => {
      try {
        const channel = await client.channels.fetch(config.signupChannelId);
        if (channel) {
          await createSignupEmbed(channel);
        } else {
          console.error('Signup channel not found!');
        }
      } catch (error) {
        console.error('Error posting daily signup:', error);
      }
      
      // Schedule next day
      scheduleDailySignup();
    }, timeUntil);
  };
  
  checkTime();
}

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  
  // Help command
  if (message.content === '!help') {
    const helpEmbed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('🤖 Bot Commands')
      .setDescription('Here are all available commands for this bot:')
      .addFields(
        {
          name: '!help',
          value: 'Shows this help message with all available commands.',
          inline: false
        },
        {
          name: '!setup',
          value: '**[Admin Only]** Manually creates a signup sheet in the current channel.\nUseful for testing or creating extra signup sheets.',
          inline: false
        },
        {
          name: '!createevent "Title" HH:MM [YYYY-MM-DD]',
          value: '**[Admin Only]** Creates a custom event signup.\nExample: `!createevent "Saturday Special" 22:00 2026-01-18`\nDate is optional (defaults to today). **Times are in EST.**',
          inline: false
        },
        {
          name: '!events',
          value: '**[Admin Only]** Shows a list of all scheduled events that have been created.',
          inline: false
        },
        {
          name: '!repost',
          value: '**[Admin Only]** Reposts the earliest upcoming event (or earliest event if none are upcoming).\nCreates a fresh signup sheet with empty signups.',
          inline: false
        }
      )
      .addFields(
        {
          name: '📋 Automatic Features',
          value: '• Signup sheets are automatically posted at **5 PM GMT** on open days: **${config.openDays.join(', ')}**\n`' +
                 '• The **@bar staff** role is pinged when new sheets are posted\n' +
                 '• Signup lists update in real-time as users react\n' +
                 '• Countdown shows time until bar opens at **2 AM GMT**',
          inline: false
        }
      )
      .setFooter({ text: 'React to signup sheets with emojis to sign up for positions!' })
      .setTimestamp();

    return message.reply({ embeds: [helpEmbed] });
  }
  
  // Setup command - creates the reaction role message
  if (message.content === '!setup') {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('You need Administrator permissions to use this command.');
    }

    await createSignupEmbed(message.channel);
    message.reply('Reaction role signup message created! Users can now react to sign up.');
  }

  // View scheduled events
  if (message.content === '!events') {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('You need Administrator permissions to use this command.');
    }

    if (scheduledEvents.length === 0) {
      return message.reply('No events have been created yet.');
    }

    // Sort events by timestamp
    const sortedEvents = [...scheduledEvents].sort((a, b) => a.timestamp - b.timestamp);

    const embed = new EmbedBuilder()
      .setColor('#ffa500')
      .setTitle('📅 Scheduled Events Log')
      .setDescription(`Total events created: ${scheduledEvents.length}`)
      .setTimestamp();

    // Show up to 10 most recent events
    const eventsToShow = sortedEvents.slice(0, 10);
    
    eventsToShow.forEach((event, index) => {
      embed.addFields({
        name: `${index + 1}. ${event.title}`,
        value: `**Time:** <t:${event.timestamp}:F>\n` +
               `**Created by:** ${event.createdBy}\n` +
               `**Created at:** <t:${Math.floor(new Date(event.createdAt).getTime() / 1000)}:R>`,
        inline: false
      });
    });

    if (scheduledEvents.length > 10) {
      embed.setFooter({ text: `Showing 10 of ${scheduledEvents.length} events` });
=======
/* ───────── STORAGE ───────── */
let events = {};
let lastEventId = null;

function loadEvents() {
  if (!fs.existsSync(DATA_FILE)) return;
  try {
    events = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    lastEventId = Object.keys(events).pop() || null;
  } catch (err) {
    console.error('Failed to load events:', err);
    events = {};
    lastEventId = null;
  }
}

function saveEvents() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(events, null, 2));
}

loadEvents();

/* ───────── PERMISSIONS ───────── */
function hasEventPermission(member) {
  if (!member) return false;
  return member.roles.cache.some(r =>
    config.eventCreatorRoles.map(x => x.toLowerCase()).includes(r.name.toLowerCase())
  );
}

/* ───────── TIME HELPERS ───────── */
function formatEST(date) {
  const options = {
    timeZone: TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  };

  const formatter = new Intl.DateTimeFormat('en-GB', options);
  const parts = formatter.formatToParts(date);
  let day, month, year, hour, minute, dayPeriod;

  for (const part of parts) {
    switch(part.type) {
      case 'day': day = part.value; break;
      case 'month': month = part.value; break;
      case 'year': year = part.value; break;
      case 'hour': hour = part.value; break;
      case 'minute': minute = part.value; break;
      case 'dayPeriod': dayPeriod = part.value; break;
    }
  }

  return `${day}-${month}-${year} ${hour}:${minute} ${dayPeriod}`;
}

function getTodayUnix() {
  return Math.floor(Date.now() / 1000);
}

function isOpenToday(openDays) {
  const todayEST = new Date().toLocaleString('en-US', { timeZone: TIMEZONE, weekday: 'long' });
  return openDays.some(d => d.toLowerCase() === todayEST.toLowerCase());
}

function getNextOpenDayUnix(openDays) {
  const map = { sunday:0, monday:1, tuesday:2, wednesday:3, thursday:4, friday:5, saturday:6 };
  const now = new Date();
  const todayEST = new Date(now.toLocaleString('en-US', { timeZone: TIMEZONE }));
  const todayDay = todayEST.getDay();
  const openIdx = openDays.map(d => map[d.toLowerCase()]);

  for(let i=0;i<7;i++){
    const day=(todayDay+i)%7;
    if(openIdx.includes(day)){
      const nextEST = new Date(todayEST);
      nextEST.setDate(nextEST.getDate()+i);
      nextEST.setHours(14,0,0,0);
      return nextEST;
    }
  }
  return null;
}

/* ───────── EMBEDS ───────── */
function buildSignupList(signups){
  return Object.entries(roleConfig).map(([emoji, role])=>{
    const users = signups[role] || [];
    return `**${emoji} ${role}:**\n${users.length ? users.map(id=>`• <@${id}>`).join('\n') : '*No signups yet*'}`;
  }).join('\n\n');
}

async function updateEmbed(messageId){
  const ev = events[messageId];
  if(!ev) return;

  try{
    const channel = await client.channels.fetch(ev.channelId||SIGNUP_CHANNEL);
    const msg = await channel.messages.fetch(messageId);

    const embed = new EmbedBuilder()
      .setColor(ev.cancelled?0xff0000:0x00b0f4)
      .setTitle(ev.title)
      .setDescription(ev.cancelled ? '❌ **EVENT CANCELLED**' : `🕒 **When:** ${formatEST(new Date(ev.datetime))} (EST)\n\n${buildSignupList(ev.signups)}`)
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`cancel_${messageId}`)
        .setLabel('Cancel Event')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(ev.cancelled)
    );

    await msg.edit({embeds:[embed], components:[row]});
  }catch(err){console.error(err);}
}

/* ───────── COMMANDS ───────── */
const commands = new Map();

/* HELP */
commands.set('help',{
  description:'Show all commands',
  execute:msg=>{
    msg.reply([...commands.entries()].map(([k,v])=>`**!${k}** — ${v.description}`).join('\n'));
  }
});
commands.set('h', commands.get('help'));

/* OPENDAYS */
commands.set('opendays',{
  description:'Show open days and countdown',
  execute:msg=>{
    const openDays=config.openDays;
    if(!openDays||!openDays.length)return msg.reply('No open days configured.');
    const todayUnix=getTodayUnix();
    const openToday=isOpenToday(openDays);
    const nextOpen=getNextOpenDayUnix(openDays);
    const nextUnix=nextOpen?Math.floor(nextOpen.getTime()/1000):null;

    msg.reply(`📅 **Open Days:** ${openDays.join(', ')}\n\n🕒 **Today is:** <t:${todayUnix}:F>\n${openToday?'✅ **OPEN TODAY**':'❌ **CLOSED TODAY**'}\n${nextUnix?`⏳ **Next Open Day:** <t:${nextUnix}:R> (<t:${nextUnix}:F>)`:'❌ No upcoming open days found.'}`);
  }
});

/* ───────── SLASH COMMANDS ───────── */
async function registerSlashCommands(){
  if(!config.clientId) return;

  const rest = new REST({version:'10'}).setToken(config.token);

  const commandsData=[
    new SlashCommandBuilder().setName('help').setDescription('Show all commands').toJSON(),
    new SlashCommandBuilder().setName('opendays').setDescription('Show open days and countdown').toJSON(),
    new SlashCommandBuilder().setName('createevent').setDescription('Create a new event (event creators only)').toJSON()
  ];

  try{
    console.log('Registering slash commands...');
    if(config.guildId) await rest.put(Routes.applicationGuildCommands(config.clientId,config.guildId),{body:commandsData});
    else await rest.put(Routes.applicationCommands(config.clientId),{body:commandsData});
    console.log('Slash commands registered.');
  }catch(err){console.error(err);}
}

registerSlashCommands();

/* ───────── INTERACTIONS ───────── */
client.on('interactionCreate', async interaction=>{
  // Slash command handler
  if(interaction.isChatInputCommand()){
    if(interaction.commandName==='help'){
      return interaction.reply([...commands.entries()].map(([k,v])=>`**/${k}** — ${v.description}`).join('\n'));
    }

    if(interaction.commandName==='opendays'){
      const openDays=config.openDays;
      if(!openDays||!openDays.length)return interaction.reply('No open days configured.');
      const todayUnix=getTodayUnix();
      const openToday=isOpenToday(openDays);
      const nextOpen=getNextOpenDayUnix(openDays);
      const nextUnix=nextOpen?Math.floor(nextOpen.getTime()/1000):null;

      return interaction.reply(`📅 **Open Days:** ${openDays.join(', ')}\n\n🕒 **Today is:** <t:${todayUnix}:F>\n${openToday?'✅ **OPEN TODAY**':'❌ **CLOSED TODAY**'}\n${nextUnix?`⏳ **Next Open Day:** <t:${nextUnix}:R> (<t:${nextUnix}:F>)`:'❌ No upcoming open days found.'}`);
    }

    if(interaction.commandName==='createevent'){
      if(!hasEventPermission(interaction.member)) return interaction.reply({content:'❌ You do not have permission to create events.',ephemeral:true});

      const modal=new ModalBuilder()
        .setCustomId('create_event_modal')
        .setTitle('Create New Event')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('event_title').setLabel('Event Title').setStyle(TextInputStyle.Short).setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('event_date').setLabel('Event Date (DD-MM-YYYY HH:MM)').setStyle(TextInputStyle.Short).setRequired(true)
          )
        );
      return interaction.showModal(modal);
>>>>>>> Stashed changes
    }

    message.reply({ embeds: [embed] });
  }

<<<<<<< Updated upstream
  // Repost earliest event
  if (message.content === '!repost') {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('You need Administrator permissions to use this command.');
    }

    if (scheduledEvents.length === 0) {
      return message.reply('No events available to repost. Create an event first with `!createevent`');
    }

    // Find the shift-signup channel
    let targetChannel = message.guild.channels.cache.find(ch => ch.name === 'shift-signup');
    
    if (!targetChannel) {
      return message.reply('❌ Could not find the #shift-signup channel. Please create it first.');
    }

    // Find the earliest upcoming event (or just earliest if all are past)
    const now = Math.floor(Date.now() / 1000);
    const sortedEvents = [...scheduledEvents].sort((a, b) => a.timestamp - b.timestamp);
    
    // Try to find next upcoming event, otherwise use earliest
    let eventToRepost = sortedEvents.find(e => e.timestamp > now) || sortedEvents[0];

    // Use default roles
    const roles = ['Active Manager', 'Backup Manager', 'Bouncer', 'Bartender', 'Dancer', 'DJ'];
    const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣'];
    const customRoleConfig = {};
    roles.forEach((role, i) => {
      customRoleConfig[emojis[i]] = role;
    });

    // Restore previous signups if they exist
    const previousSignups = eventToRepost.signups || {};
    
    // Create embed with restored signups
    const embed = new EmbedBuilder()
      .setColor('#ff9900')
      .setTitle(`📋 ${eventToRepost.title}`)
      .setDescription(`React to sign up for positions!\n\n` +
        `**Event Starts:** <t:${eventToRepost.timestamp}:R>\n` +
        `**Start Time:** <t:${eventToRepost.timestamp}:F>\n` +
        '═══════════════════════════\n' +
        buildCustomSignupListWithData(customRoleConfig, previousSignups))
      .setFooter({ text: 'React with the corresponding emoji to sign up!' })
      .setTimestamp();

    // Find ping role
    const barStaffRole = message.guild.roles.cache.find(r => r.name.toLowerCase() === 'bar staff');

    const messageContent = {
      embeds: [embed]
    };

    if (barStaffRole) {
      messageContent.content = `<@&${barStaffRole.id}> Reposted event: **${eventToRepost.title}**`;
    }

    const sentMessage = await targetChannel.send(messageContent);

    // Initialize signup tracking with previous signups
    signups.set(sentMessage.id, JSON.parse(JSON.stringify(previousSignups))); // Deep copy

    // Store custom role config for this message
    if (!client.customEventRoles) {
      client.customEventRoles = new Map();
    }
    client.customEventRoles.set(sentMessage.id, customRoleConfig);

    // Add reactions
    for (let i = 0; i < roles.length; i++) {
      await sentMessage.react(emojis[i]);
    }

    // Just delete the command message
    await message.delete().catch(() => {});
  }

  // Create custom event command
  if (message.content.startsWith('!createevent')) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('You need Administrator permissions to use this command.');
    }

    // Check if we're in the correct channel or get the shift-signup channel
    let targetChannel = message.guild.channels.cache.find(ch => ch.name === 'shift-signup');
    
    if (!targetChannel) {
      return message.reply('❌ Could not find the #shift-signup channel. Please create it first.');
    }

    // Parse command: !createevent "Event Title" HH:MM YYYY-MM-DD
    const args = message.content.slice('!createevent'.length).trim();
    
    if (!args) {
      return message.reply('Usage: `!createevent "Event Title" HH:MM YYYY-MM-DD`\nExample: `!createevent "Saturday Special" 22:00 2026-01-18`\nDate is optional (defaults to today). **Times are in EST.**');
    }

    // Extract title in quotes
    const titleMatch = args.match(/"([^"]+)"/);
    if (!titleMatch) {
      return message.reply('Please wrap the event title in quotes. Example: `!createevent "Saturday Special" 22:00`');
    }

    const title = titleMatch[1];
    const remaining = args.slice(titleMatch[0].length).trim().split(/\s+/);
    
    const timeText = remaining[0];
    const dateText = remaining[1] || '';

    // Parse time
    const timeMatch = timeText?.match(/^(\d{1,2}):(\d{2})$/);
    if (!timeMatch) {
      return message.reply('Invalid time format! Use HH:MM (e.g., 21:00) in EST timezone');
    }

    const hours = parseInt(timeMatch[1]);
    const minutes = parseInt(timeMatch[2]);

    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      return message.reply('Invalid time! Hours must be 0-23, minutes 0-59');
    }

    // Calculate event timestamp in EST (UTC-5)
    let eventDate = new Date();
    
    if (dateText) {
      const dateMatch = dateText.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!dateMatch) {
        return message.reply('Invalid date format! Use YYYY-MM-DD (e.g., 2026-01-15)');
      }
      eventDate = new Date(dateText + 'T00:00:00-05:00'); // EST timezone
    }

    // Set time in EST (UTC-5)
    eventDate.setHours(hours, minutes, 0, 0);
    // Convert EST to UTC by adding 5 hours
    const eventTimestamp = Math.floor(eventDate.getTime() / 1000) + (5 * 60 * 60);

    // Use default roles
    const roles = ['Active Manager', 'Backup Manager', 'Bouncer', 'Bartender', 'Dancer', 'DJ'];
    const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣'];
    const customRoleConfig = {};
    roles.forEach((role, i) => {
      customRoleConfig[emojis[i]] = role;
    });

    // Create embed
    const embed = new EmbedBuilder()
      .setColor('#ff9900')
      .setTitle(`📋 ${title}`)
      .setDescription(`React to sign up for positions!\n\n` +
        `**Event Starts:** <t:${eventTimestamp}:R>\n` +
        `**Start Time:** <t:${eventTimestamp}:F>\n` +
        '═══════════════════════════\n' +
        buildCustomSignupList(null, customRoleConfig))
      .setFooter({ text: 'React with the corresponding emoji to sign up!' })
      .setTimestamp();

    // Find ping role
    const barStaffRole = message.guild.roles.cache.find(r => r.name.toLowerCase() === 'bar staff');

    const messageContent = {
      embeds: [embed]
    };

    if (barStaffRole) {
      messageContent.content = `<@&${barStaffRole.id}> New event signup: **${title}**`;
    }

    const sentMessage = await targetChannel.send(messageContent);

    // Initialize signup tracking
    signups.set(sentMessage.id, {});

    // Store custom role config for this message
    if (!client.customEventRoles) {
      client.customEventRoles = new Map();
    }
    client.customEventRoles.set(sentMessage.id, customRoleConfig);

    // Add reactions
    for (let i = 0; i < roles.length; i++) {
      await sentMessage.react(emojis[i]);
    }

    // Log the event
    const eventLog = {
      title: title,
      timestamp: eventTimestamp,
      date: eventDate.toISOString(),
      roles: roles,
      createdBy: message.author.tag,
      createdById: message.author.id,
      createdAt: new Date().toISOString(),
      channelId: targetChannel.id,
      messageId: sentMessage.id,
      signups: {} // Initialize empty signups object
    };
    scheduledEvents.push(eventLog);
    saveScheduledEvents();
    console.log(`Event logged: ${title} at ${eventDate.toISOString()}`);

    // Just delete the command message
    await message.delete().catch(() => {});
  }
});

// Handle button interactions
client.on('interactionCreate', async (interaction) => {
  try {
    console.log('Interaction received:', interaction.type);
    
    if (!interaction.isButton() && !interaction.isModalSubmit()) return;

    // Open event creation form
    if (interaction.isButton() && interaction.customId === 'open_event_form') {
      console.log('Opening event form modal...');
      
      const modal = new ModalBuilder()
        .setCustomId('event_form')
        .setTitle('Create Custom Event Signup');

      const eventTitle = new TextInputBuilder()
        .setCustomId('event_title')
        .setLabel('Event Title')
        .setPlaceholder('e.g., Special DJ Night')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const eventRoles = new TextInputBuilder()
        .setCustomId('event_roles')
        .setLabel('Roles (one per line)')
        .setPlaceholder('Active Manager\nBackup Manager\nBouncer\nBartender\nDancer\nDJ')
        .setValue('Active Manager\nBackup Manager\nBouncer\nBartender\nDancer\nDJ')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      const eventTime = new TextInputBuilder()
        .setCustomId('event_time')
        .setLabel('Event Start Time (24h format, e.g., 21:00)')
        .setPlaceholder('21:00')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const eventDate = new TextInputBuilder()
        .setCustomId('event_date')
        .setLabel('Event Date (YYYY-MM-DD, leave blank for today)')
        .setPlaceholder('2026-01-15')
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

      const pingRole = new TextInputBuilder()
        .setCustomId('ping_role')
        .setLabel('Role to Ping (leave blank for @bar staff)')
        .setPlaceholder('bar staff')
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

      const row1 = new ActionRowBuilder().addComponents(eventTitle);
      const row2 = new ActionRowBuilder().addComponents(eventRoles);
      const row3 = new ActionRowBuilder().addComponents(eventTime);
      const row4 = new ActionRowBuilder().addComponents(eventDate);
      const row5 = new ActionRowBuilder().addComponents(pingRole);

      modal.addComponents(row1, row2, row3, row4, row5);

      await interaction.showModal(modal);
      console.log('Modal shown successfully');
    }

    // Handle form submission
    if (interaction.isModalSubmit() && interaction.customId === 'event_form') {
      const title = interaction.fields.getTextInputValue('event_title');
      const rolesText = interaction.fields.getTextInputValue('event_roles');
      const timeText = interaction.fields.getTextInputValue('event_time');
      const dateText = interaction.fields.getTextInputValue('event_date') || '';
      const pingRoleText = interaction.fields.getTextInputValue('ping_role') || 'bar staff';

      // Parse roles
      const roles = rolesText.split('\n').filter(r => r.trim()).map(r => r.trim());
      
      if (roles.length === 0) {
        return interaction.reply({ content: 'You must provide at least one role!', ephemeral: true });
      }

      if (roles.length > 10) {
        return interaction.reply({ content: 'Maximum 10 roles allowed!', ephemeral: true });
      }

      // Parse time
      const timeMatch = timeText.match(/^(\d{1,2}):(\d{2})$/);
      if (!timeMatch) {
        return interaction.reply({ content: 'Invalid time format! Use HH:MM (e.g., 21:00)', ephemeral: true });
      }

      const hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2]);

      if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        return interaction.reply({ content: 'Invalid time! Hours must be 0-23, minutes 0-59', ephemeral: true });
      }

      // Calculate event timestamp
      let eventDate = new Date();
      
      if (dateText) {
        const dateMatch = dateText.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!dateMatch) {
          return interaction.reply({ content: 'Invalid date format! Use YYYY-MM-DD (e.g., 2026-01-15)', ephemeral: true });
        }
        eventDate = new Date(dateText);
      }

      eventDate.setUTCHours(hours, minutes, 0, 0);
      const eventTimestamp = Math.floor(eventDate.getTime() / 1000);

      // Create emoji mapping
      const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
      const customRoleConfig = {};
      roles.forEach((role, i) => {
        customRoleConfig[emojis[i]] = role;
      });

      // Build role list description
      let roleList = '';
      roles.forEach((role, i) => {
        roleList += `${emojis[i]} - ${role}\n`;
      });

      // Create embed
      const embed = new EmbedBuilder()
        .setColor('#ff9900')
        .setTitle(`📋 ${title}`)
        .setDescription(`React to sign up for positions!\n\n` +
          `**Event Starts:** <t:${eventTimestamp}:R>\n` +
          `**Start Time:** <t:${eventTimestamp}:F>\n` +
          '═══════════════════════════\n' +
          buildCustomSignupList(null, customRoleConfig))
        .setFooter({ text: 'React with the corresponding emoji to sign up!' })
        .setTimestamp();

      // Find ping role
      const guild = interaction.guild;
      const roleToMention = guild.roles.cache.find(r => r.name.toLowerCase() === pingRoleText.toLowerCase());

      const messageContent = {
        embeds: [embed]
      };

      if (roleToMention) {
        messageContent.content = `<@&${roleToMention.id}> New event signup: **${title}**`;
      }

      const sentMessage = await interaction.channel.send(messageContent);

      // Initialize signup tracking
      signups.set(sentMessage.id, {});

      // Store custom role config for this message
      if (!client.customEventRoles) {
        client.customEventRoles = new Map();
      }
      client.customEventRoles.set(sentMessage.id, customRoleConfig);

      // Add reactions
      for (let i = 0; i < roles.length; i++) {
        await sentMessage.react(emojis[i]);
      }

      await interaction.reply({ content: `✅ Event "${title}" created successfully!`, ephemeral: true });
    }
  } catch (error) {
    console.error('Error in interactionCreate:', error);
    if (!interaction.replied && !interaction.deferred) {
      try {
        await interaction.reply({ content: 'An error occurred. Please check the bot console.', ephemeral: true });
      } catch (e) {
        console.error('Could not send error message:', e);
      }
    }
  }
});

client.on('messageReactionAdd', async (reaction, user) => {
  if (user.bot) return;
  
  // Fetch partial data if needed
  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (error) {
      console.error('Error fetching reaction:', error);
      return;
    }
  }

  // Check if this is a tracked signup message
  if (!signups.has(reaction.message.id)) return;

  const emoji = reaction.emoji.name;
  
  // Check if this is a custom event or regular signup
  let roleName;
  if (client.customEventRoles && client.customEventRoles.has(reaction.message.id)) {
    const customConfig = client.customEventRoles.get(reaction.message.id);
    roleName = customConfig[emoji];
  } else {
    roleName = roleConfig[emoji];
  }

  if (!roleName) return;

  // Get or initialize signup data for this message
  const messageSignups = signups.get(reaction.message.id);
  if (!messageSignups[roleName]) {
    messageSignups[roleName] = [];
  }

  // Add user if not already signed up
  if (!messageSignups[roleName].includes(user.id)) {
    messageSignups[roleName].push(user.id);
    console.log(`${user.tag} signed up for ${roleName}`);
    
    // Update the message
    try {
      await updateSignupMessage(reaction.message);
      
      // Save signups to event log
      const embed = reaction.message.embeds[0];
      if (embed && embed.title) {
        const eventTitle = embed.title.replace('📋 ', '');
        saveSignupsForEvent(reaction.message.id, eventTitle);
      }
    } catch (error) {
      console.error('Error updating message:', error);
    }
  }
});

client.on('messageReactionRemove', async (reaction, user) => {
  if (user.bot) return;

  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (error) {
      console.error('Error fetching reaction:', error);
      return;
    }
  }

  if (!signups.has(reaction.message.id)) return;

  const emoji = reaction.emoji.name;
  
  // Check if this is a custom event or regular signup
  let roleName;
  if (client.customEventRoles && client.customEventRoles.has(reaction.message.id)) {
    const customConfig = client.customEventRoles.get(reaction.message.id);
    roleName = customConfig[emoji];
  } else {
    roleName = roleConfig[emoji];
  }

  if (!roleName) return;

  const messageSignups = signups.get(reaction.message.id);
  if (messageSignups[roleName]) {
    const index = messageSignups[roleName].indexOf(user.id);
    if (index > -1) {
      messageSignups[roleName].splice(index, 1);
      console.log(`${user.tag} removed signup for ${roleName}`);
      
      // Update the message
      try {
        await updateSignupMessage(reaction.message);
        
        // Save signups to event log
        const embed = reaction.message.embeds[0];
        if (embed && embed.title) {
          const eventTitle = embed.title.replace('📋 ', '');
          saveSignupsForEvent(reaction.message.id, eventTitle);
        }
      } catch (error) {
        console.error('Error updating message:', error);
      }
    }
  }
});

// Login with your bot token
client.login(config.token);
=======
  // Modal submission for create event
  if(interaction.isModalSubmit() && interaction.customId==='create_event_modal'){
    const title=interaction.fields.getTextInputValue('event_title');
    const dateStr=interaction.fields.getTextInputValue('event_date');
    const match=dateStr.match(/^(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2})$/);
    if(!match) return interaction.reply({content:'❌ Invalid date format! Use DD-MM-YYYY HH:MM',ephemeral:true});
    const [_,day,month,year,hour,minute]=match;
    const datetime=new Date(`${year}-${month}-${day}T${hour}:${minute}:00`);
    if(isNaN(datetime.getTime())) return interaction.reply({content:'❌ Invalid date/time!',ephemeral:true});

    const event={title,datetime:datetime.toISOString(),signups:{},cancelled:false,channelId:SIGNUP_CHANNEL};
    const channel=await client.channels.fetch(SIGNUP_CHANNEL);
    const embed=new EmbedBuilder().setColor(0x00b0f4).setTitle(title).setDescription(`🕒 **When:** ${formatEST(datetime)} (EST)\n\n${buildSignupList(event.signups)}`).setTimestamp();
    const row=new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('cancel_placeholder').setLabel('Cancel Event').setStyle(ButtonStyle.Danger));
    const message=await channel.send({embeds:[embed],components:[row]});
    await message.edit({components:[new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`cancel_${message.id}`).setLabel('Cancel Event').setStyle(ButtonStyle.Danger))]});
    for(const emoji of Object.keys(roleConfig)) await message.react(emoji);
    events[message.id]=event;
    saveEvents();
    return interaction.reply({content:`✅ Event "${title}" created successfully!`,ephemeral:true});
  }

  // Cancel button
  if(interaction.isButton() && interaction.customId.startsWith('cancel_')){
    const messageId=interaction.customId.replace('cancel_','');
    const ev=events[messageId];
    if(!ev) return interaction.reply({content:'Event not found.',ephemeral:true});
    if(!hasEventPermission(interaction.member)) return interaction.reply({content:'❌ You do not have permission.',ephemeral:true});
    if(ev.cancelled) return interaction.reply({content:'Event already cancelled.',ephemeral:true});
    ev.cancelled=true;
    saveEvents();
    await updateEmbed(messageId);
    return interaction.reply({content:`✅ Event "${ev.title}" cancelled.`,ephemeral:true});
  }
});

/* ───────── MESSAGE HANDLER ───────── */
client.on('messageCreate', msg=>{
  if(msg.author.bot||!msg.content.startsWith('!')) return;
  const cmd=commands.get(msg.content.slice(1).split(' ')[0].toLowerCase());
  if(cmd) cmd.execute(msg);
});

/* ───────── PRESENCE ───────── */
client.once('clientReady', ()=>{
  console.log(`Logged in as ${client.user.tag}`);
  const activities=[{name:'Retro Replay',type:ActivityType.Watching},{name:'Hiring Staff',type:ActivityType.Playing}];
  let i=0;
  setInterval(()=>{client.user.setPresence({activities:[activities[i%activities.length]],status:'online'});i++;},30000);
});

/* ───────── LOGIN ───────── */
if(!config.token){console.error("❌ Missing bot token!");process.exit(1);}
client.login(config.token);
>>>>>>> Stashed changes
