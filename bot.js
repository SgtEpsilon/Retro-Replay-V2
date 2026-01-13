const { Client, GatewayIntentBits, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');

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

// Store signups - structure: { messageId: { roleName: [userId1, userId2, ...] } }
const signups = new Map();
let signupMessageId = null;
let signupChannelId = null;

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  console.log('Bot is ready! Use !setup in a channel to create the reaction role message.');
  
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
  const next2AM = getNext2AMGMT();
  
  const embed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle('📋 Staff Position Signup')
    .setDescription('React to this message to sign up for staff positions!\n\n' +
      `**Bar Opens in:** <t:${next2AM}:R>\n` +
      `Opens at: <t:${next2AM}:F>\n` +
      '═══════════════════════════\n' +
      buildSignupList(message.id))
    .setFooter({ text: 'React with the corresponding emoji to sign up!' })
    .setTimestamp();

  await message.edit({ embeds: [embed] });
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
    
    const timeUntil = next5PM.getTime() - now.getTime();
    
    console.log(`Next signup sheet will be posted at ${next5PM.toISOString()}`);
    
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
  
  // Setup command - creates the reaction role message
  if (message.content === '!setup') {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('You need Administrator permissions to use this command.');
    }

    await createSignupEmbed(message.channel);
    message.reply('Reaction role signup message created! Users can now react to sign up.');
  }

  // Command to create roles if they don't exist (kept for compatibility)
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

  // Check if this is a tracked signup message
  if (!signups.has(reaction.message.id)) return;

  const emoji = reaction.emoji.name;
  const roleName = roleConfig[emoji];

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
  const roleName = roleConfig[emoji];

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
      } catch (error) {
        console.error('Error updating message:', error);
      }
    }
  }
});

// Login with your bot token
client.login(config.token);