const { Client, GatewayIntentBits, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');

// Read bot token from config file
let config;
try {
  const configFile = fs.readFileSync('./config.json', 'utf8');
  config = JSON.parse(configFile);
} catch (error) {
  console.error('Error reading config.json:', error.message);
  console.error('Please create a config.json file with your bot token.');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent
  ]
});

// Role configuration - map emojis to role names
const roleConfig = {
  '1️⃣': 'Active Manager',
  '2️⃣': 'Backup Manager',
  '3️⃣': 'Bouncer',
  '4️⃣': 'Bartender',
  '5️⃣': 'Dancer',
  '6️⃣': 'DJ'
};

let signupMessageId = null;
let signupChannelId = null;

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  console.log('Bot is ready! Use !setup in a channel to create the reaction role message.');
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

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  
  // Setup command - creates the reaction role message
  if (message.content === '!setup') {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('You need Administrator permissions to use this command.');
    }

    const next2AM = getNext2AMGMT();
    
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('📋 Staff Position Signup')
      .setDescription('React to this message to sign up for staff positions!\n\n' +
        '1️⃣ - Active Manager\n' +
        '2️⃣ - Backup Manager\n' +
        '3️⃣ - Bouncer\n' +
        '4️⃣ - Bartender\n' +
        '5️⃣ - Dancer\n' +
        '6️⃣ - DJ\n\n' +
        `**Bar Opens in:** <t:${next2AM}:R>\n` +
        `Opens at: <t:${next2AM}:F>`)
      .setFooter({ text: 'React with the corresponding emoji to get your role!' })
      .setTimestamp();

    const sentMessage = await message.channel.send({ embeds: [embed] });
    
    // Add all reactions
    for (const emoji of Object.keys(roleConfig)) {
      await sentMessage.react(emoji);
    }

    signupMessageId = sentMessage.id;
    signupChannelId = sentMessage.channel.id;
    
    message.reply('Reaction role signup message created! Users can now react to get roles.');
  }

  // Command to create roles if they don't exist
  if (message.content === '!createroles') {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('You need Administrator permissions to use this command.');
    }

    let created = [];
    for (const roleName of Object.values(roleConfig)) {
      const existingRole = message.guild.roles.cache.find(r => r.name === roleName);
      if (!existingRole) {
        await message.guild.roles.create({
          name: roleName,
          reason: 'Reaction role setup'
        });
        created.push(roleName);
      }
    }

    if (created.length > 0) {
      message.reply(`Created roles: ${created.join(', ')}`);
    } else {
      message.reply('All roles already exist!');
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

  // Check if reaction is on the signup message
  if (reaction.message.id !== signupMessageId) return;

  const emoji = reaction.emoji.name;
  const roleName = roleConfig[emoji];

  if (!roleName) return;

  const guild = reaction.message.guild;
  const member = await guild.members.fetch(user.id);
  const role = guild.roles.cache.find(r => r.name === roleName);

  if (!role) {
    console.error(`Role "${roleName}" not found. Use !createroles to create it.`);
    return;
  }

  try {
    await member.roles.add(role);
    console.log(`Added ${roleName} role to ${user.tag}`);
  } catch (error) {
    console.error(`Error adding role: ${error}`);
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

  if (reaction.message.id !== signupMessageId) return;

  const emoji = reaction.emoji.name;
  const roleName = roleConfig[emoji];

  if (!roleName) return;

  const guild = reaction.message.guild;
  const member = await guild.members.fetch(user.id);
  const role = guild.roles.cache.find(r => r.name === roleName);

  if (!role) return;

  try {
    await member.roles.remove(role);
    console.log(`Removed ${roleName} role from ${user.tag}`);
  } catch (error) {
    console.error(`Error removing role: ${error}`);
  }
});

// Login with your bot token
client.login(config.token);