const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  REST,
  Routes,
  SlashCommandBuilder
} = require('discord.js');

const fs = require('fs');
const path = require('path');
const config = require('./config.json');

/* ───────────── STORAGE ───────────── */

const DATA_FILE = path.join(__dirname, 'events.json');

function loadEvents() {
  if (!fs.existsSync(DATA_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    console.error('❌ Failed to parse events.json');
    return {};
  }
}

function saveEvents() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(events, null, 2));
}

let events = loadEvents();

/* ───────────── CLIENT ───────────── */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: ['MESSAGE', 'CHANNEL', 'REACTION']
});

/* ───────────── CONSTANTS ───────────── */

const TIMEZONE = 'America/New_York';
const DIVIDER = '═══════════════════════════';

const roleConfig = {
  '1️⃣': 'Active Manager',
  '2️⃣': 'Backup Manager',
  '3️⃣': 'Bouncer',
  '4️⃣': 'Bartender',
  '5️⃣': 'Dancer',
  '6️⃣': 'DJ'
};

const commands = new Map();

/* ───────────── RICH PRESENCE ───────────── */

const presenceStates = [
  { name: 'Retro Replay', type: 3 }, // WATCHING
  { name: 'Hiring Staff', type: 0 }  // PLAYING
];

let presenceIndex = 0;

function rotatePresence() {
  if (!client.user) return;
  client.user.setPresence({
    activities: [presenceStates[presenceIndex]],
    status: 'online'
  });
  presenceIndex = (presenceIndex + 1) % presenceStates.length;
}

/* ───────────── TIME ───────────── */

function formatEST(date) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(date);
}

function parseESTDate(input) {
  const m = input.match(/^(\d{2})-(\d{2})-(\d{4}) (\d{1,2}):(\d{2}) (AM|PM)$/i);
  if (!m) return null;

  let [, d, mo, y, h, mi, p] = m.map(v => (isNaN(v) ? v : Number(v)));
  mo -= 1;
  if (p.toUpperCase() === 'PM' && h !== 12) h += 12;
  if (p.toUpperCase() === 'AM' && h === 12) h = 0;

  return new Date(Date.UTC(y, mo, d, h + 5, mi));
}

function next2AMGMT() {
  const now = new Date();
  const d = new Date();
  d.setUTCHours(2, 0, 0, 0);
  if (now >= d) d.setUTCDate(d.getUTCDate() + 1);
  return Math.floor(d.getTime() / 1000);
}

/* ───────────── PERMISSIONS ───────────── */

function hasEventPermission(member) {
  return member.roles.cache.some(r =>
    config.eventCreatorRoles.map(x => x.toLowerCase()).includes(r.name.toLowerCase())
  );
}

/* ───────────── EMBEDS ───────────── */

function buildSignupList(signups) {
  let out = '';
  for (const [emoji, role] of Object.entries(roleConfig)) {
    const users = signups[role] || [];
    out += `\n**${emoji} ${role}:**\n`;
    out += users.length
      ? users.map(id => `• <@${id}>`).join('\n')
      : '*No signups yet*';
    out += '\n';
  }
  return out;
}

async function updateEmbed(messageId) {
  const ev = events[messageId];
  if (!ev) return;

  const channel = await client.channels.fetch(ev.channelId);
  const msg = await channel.messages.fetch(messageId);

  const embed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle(ev.title)
    .setDescription(
      `**When:** ${formatEST(new Date(ev.datetime))} (EST)\n` +
      `**Bar Opens In:** <t:${next2AMGMT()}:R>\n\n` +
      `${DIVIDER}\n` +
      buildSignupList(ev.signups)
    )
    .setTimestamp();

  await msg.edit({ embeds: [embed] });
}

/* ───────────── PREFIX COMMANDS ───────────── */

const helpCommand = {
  description: 'Show available commands',
  execute: msg => {
    let text = '**Available Commands:**\n';
    for (const [name, cmd] of commands) {
      if (name === 'h') continue;
      text += `\n\`!${name}\` — ${cmd.description}`;
    }
    msg.reply(text);
  }
};

commands.set('help', helpCommand);
commands.set('h', helpCommand);

commands.set('opendays', {
  description: 'Show open days',
  execute: msg =>
    msg.reply(`📅 **We are open on:**\n${config.openDays.map(d => `• ${d}`).join('\n')}`)
});

commands.set('createevent', {
  description: 'Create an event',
  execute: async msg => {
    if (!msg.guild || !hasEventPermission(msg.member))
      return msg.reply('❌ No permission.');

    const button = new ButtonBuilder()
      .setCustomId('open_create_event_modal')
      .setLabel('Create Event')
      .setStyle(ButtonStyle.Primary);

    await msg.reply({
      content: 'Click below to create an event:',
      components: [new ActionRowBuilder().addComponents(button)]
    });

    if (msg.deletable) setTimeout(() => msg.delete().catch(() => {}), 1000);
  }
});

commands.set('repost', {
  description: 'Repost the most recent event',
  execute: async msg => {
    if (!msg.guild || !hasEventPermission(msg.member))
      return msg.reply('❌ No permission.');

    const entries = Object.values(events);
    if (!entries.length) return msg.reply('❌ No events found.');

    const ev = entries[entries.length - 1];
    const channel = await client.channels.fetch(ev.channelId);

    const newMsg = await channel.send({ embeds: [new EmbedBuilder().setTitle('Reposting…')] });

    events[newMsg.id] = {
      channelId: channel.id,
      title: ev.title,
      datetime: ev.datetime,
      signups: {}
    };

    saveEvents();
    await updateEmbed(newMsg.id);
    for (const e of Object.keys(roleConfig)) await newMsg.react(e);

    msg.reply('✅ Event reposted.');
  }
});

/* ───────────── MESSAGE HANDLER ───────────── */

client.on('messageCreate', msg => {
  if (msg.author.bot || !msg.content.startsWith('!')) return;
  const cmd = commands.get(msg.content.slice(1).toLowerCase());
  if (cmd) cmd.execute(msg);
});

/* ───────────── INTERACTIONS ───────────── */

client.on('interactionCreate', async interaction => {
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === 'help')
      return interaction.reply({ content: 'Use `!help` for full list.', flags: 64 });

    if (interaction.commandName === 'opendays')
      return interaction.reply({
        content: `📅 **We are open on:**\n${config.openDays.map(d => `• ${d}`).join('\n')}`,
        flags: 64
      });

    if (interaction.commandName === 'createevent') {
      if (!interaction.inGuild() || !hasEventPermission(interaction.member))
        return interaction.reply({ content: '❌ No permission.', flags: 64 });

      const button = new ButtonBuilder()
        .setCustomId('open_create_event_modal')
        .setLabel('Create Event')
        .setStyle(ButtonStyle.Primary);

      return interaction.reply({
        content: 'Click below to create an event:',
        components: [new ActionRowBuilder().addComponents(button)],
        flags: 64
      });
    }
  }

  if (interaction.isButton() && interaction.customId === 'open_create_event_modal') {
    await interaction.update({
      components: [
        new ActionRowBuilder().addComponents(
          ButtonBuilder.from(interaction.component).setDisabled(true)
        )
      ]
    });

    const modal = new ModalBuilder()
      .setCustomId('create_event_modal')
      .setTitle('Create Event')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('event_title')
            .setLabel('Event Title')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('event_datetime')
            .setLabel('DD-MM-YYYY HH:MM AM/PM (EST)')
            .setPlaceholder('17-01-2026 8:30 PM')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        )
      );

    return interaction.showModal(modal);
  }

  if (interaction.isModalSubmit() && interaction.customId === 'create_event_modal') {
    await interaction.deferReply({ flags: 64 });

    const parsed = parseESTDate(interaction.fields.getTextInputValue('event_datetime'));
    if (!parsed) return interaction.editReply('❌ Invalid date format.');

    const channel = await client.channels.fetch(config.signupChannelId);
    const msg = await channel.send({ embeds: [new EmbedBuilder().setTitle('Creating event…')] });

    events[msg.id] = {
      channelId: channel.id,
      title: `📅 ${interaction.fields.getTextInputValue('event_title')}`,
      datetime: parsed.toISOString(),
      signups: {}
    };

    saveEvents();
    await updateEmbed(msg.id);
    for (const e of Object.keys(roleConfig)) await msg.react(e);

    interaction.editReply('✅ Event created!');
  }
});

/* ───────────── REACTIONS ───────────── */

async function handleReaction(reaction, user, add) {
  if (user.bot) return;
  if (reaction.partial) await reaction.fetch();

  const ev = events[reaction.message.id];
  if (!ev) return;

  const role = roleConfig[reaction.emoji.name];
  if (!role) return;

  ev.signups[role] ??= [];
  if (add && !ev.signups[role].includes(user.id)) ev.signups[role].push(user.id);
  if (!add) ev.signups[role] = ev.signups[role].filter(id => id !== user.id);

  saveEvents();
  updateEmbed(reaction.message.id);
}

client.on('messageReactionAdd', (r, u) => handleReaction(r, u, true));
client.on('messageReactionRemove', (r, u) => handleReaction(r, u, false));

/* ───────────── READY ───────────── */

client.once('clientReady', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  rotatePresence();
  setInterval(rotatePresence, 30_000);

  const rest = new REST({ version: '10' }).setToken(config.token);
  await rest.put(
    Routes.applicationCommands(client.user.id),
    {
      body: [
        new SlashCommandBuilder().setName('help').setDescription('Show commands'),
        new SlashCommandBuilder().setName('opendays').setDescription('Show open days'),
        new SlashCommandBuilder().setName('createevent').setDescription('Create an event')
      ].map(c => c.toJSON())
    }
  );

  for (const id of Object.keys(events)) {
    try {
      await updateEmbed(id);
    } catch {
      delete events[id];
      saveEvents();
    }
  }
});

client.login(config.token);
