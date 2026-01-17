/***********************
 * Retro Replay Bot Monolithic Update V1
 * Main Entry Point
 ***********************/
process.removeAllListeners('warning');
process.env.NODE_NO_WARNINGS = '1';

require('dotenv').config();

const { client } = require('./src/client');
const { registerCommands } = require('./src/commands/register');
const { loadData, scheduleReminder, scheduleBackupAlert, getEvents } = require('./src/utils/storage');
const { scheduleAutoPost, checkAndGenerateSchedule, checkAndPostScheduledEvents } = require('./src/services/autoPost');
const { setDefaultStatus } = require('./src/utils/helpers');
const { DateTime } = require('luxon');
const config = require('./config.json');

// Import event handlers
require('./src/events/interactionCreate');
require('./src/events/reactionAdd');
require('./src/events/reactionRemove');

// Register slash commands
registerCommands();

// Graceful shutdown handler
async function gracefulShutdown(signal) {
  console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
  
  try {
    const { saveAll } = require('./src/utils/storage');
    const success = saveAll();
    
    if (success) {
      console.log('✅ All data saved successfully');
    } else {
      console.log('⚠️ Some data may not have saved properly');
    }
    
    // Destroy Discord client
    client.destroy();
    console.log('✅ Discord client closed');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during shutdown:', err);
    process.exit(1);
  }
}

// Register shutdown handlers
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  console.error('❌ UNCAUGHT EXCEPTION:', err);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ UNHANDLED REJECTION at:', promise, 'reason:', reason);
  // Don't exit on unhandled rejection, just log it
});

// Auto-save interval (every 5 minutes)
let autoSaveInterval;

// Bot ready event
client.once('ready', async () => {
  loadData();
  const events = getEvents();
  
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log(`\n⚙️ Configuration:`);
  console.log(`   Timezone: ${config.timezone}`);
  console.log(`   Auto-post hour: ${config.autoPostHour} (${config.autoPostHour}:00 ${config.timezone})`);
  console.log(`   Shift start hour: ${config.shiftStartHour} (${config.shiftStartHour}:00 ${config.timezone})`);
  console.log(`   Current server time: ${DateTime.now().setZone(config.timezone).toFormat('yyyy-MM-dd HH:mm:ss z')}`);
  console.log(`   Open days: ${config.openDays.join(', ')}\n`);
  
  // Verify channel access
  await verifyChannelAccess();
  
  // Set bot status
  setDefaultStatus(client);
  
  // Schedule reminders for existing events
  Object.keys(events).forEach(id => {
    scheduleReminder(id, client);
    scheduleBackupAlert(id, client);
  });

  // Start auto-post scheduler
  scheduleAutoPost(client);
  
  // Start auto-save interval
  autoSaveInterval = setInterval(() => {
    const { saveAll } = require('./src/utils/storage');
    saveAll();
  }, 5 * 60 * 1000); // Every 5 minutes
  
  console.log('💾 Auto-save enabled (every 5 minutes)');
  
  // Initial check 5 seconds after startup
  setTimeout(async () => {
    const now = DateTime.now().setZone(config.timezone);
    console.log(`\n🔍 Initial auto-post check at startup:`);
    console.log(`   Current time: ${now.toFormat('yyyy-MM-dd HH:mm:ss z')}`);
    console.log(`   Current hour: ${now.hour} | Target hour: ${config.autoPostHour}`);
    
    // Check if we should generate schedule
    await checkAndGenerateSchedule(client);
    
    // Check if we should post scheduled events
    await checkAndPostScheduledEvents(client);
    
  }, 5000);
});

async function verifyChannelAccess() {
  const SIGNUP_CHANNEL = process.env.SIGNUP_CHANNEL_ID;
  const STAFF_CHAT_CHANNEL = process.env.STAFF_CHAT_CHANNEL_ID;

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
        }
      }
    } catch (err) {
      console.error('⚠️ Cannot access staff chat channel');
      console.error('   Channel ID:', STAFF_CHAT_CHANNEL);
    }
  } else {
    console.error('⚠️ STAFF_CHAT_CHANNEL_ID not set in .env');
  }
}

// Login
client.login(process.env.BOT_TOKEN);