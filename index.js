process.removeAllListeners('warning');
process.env.NODE_NO_WARNINGS = '1';

require('dotenv').config();

const { client } = require('./src/client');
const { registerCommands } = require('./src/commands/register');
const {
  loadData,
  getEvents,
  scheduleReminder,
  scheduleBackupAlert
} = require('./src/utils/storage');

const {
  scheduleAutoPost,
  checkAndGenerateSchedule,
  checkAndPostScheduledEvents
} = require('./src/services/autoPost');

const { initStatus } = require('./src/utils/statusManager');
const { DateTime } = require('luxon');
const config = require('./config.json');

// Entertainment bot modules
const TwitchMonitor = require('./src/modules/twitch');
const YouTubeMonitor = require('./src/modules/youtube');

require('./src/events/interactionCreate');
require('./src/events/reactionAdd');
require('./src/events/reactionRemove');

registerCommands();

let autoSaveInterval;

// Initialize entertainment monitors (will be passed to commands)
const monitors = {
  twitchMonitor: null,
  youtubeMonitor: null
};

// Export monitors so commands can access them
global.monitors = monitors;

client.once('ready', async () => {
  loadData();
  const events = getEvents();

  console.log(`✅ Logged in as ${client.user.tag}`);

  // Verify channel access for Retro Replay features
  await verifyChannelAccess();
  
  // Initialize status system
  initStatus(client);

  // Schedule reminders and backup alerts for existing events
  for (const id of Object.keys(events)) {
    scheduleReminder(id, client);
    scheduleBackupAlert(id, client);
  }

  // Schedule auto-post for weekly schedules
  scheduleAutoPost(client);

  // Initialize entertainment bot monitors
  try {
    console.log('🎬 Initializing entertainment monitors...');
    
    monitors.twitchMonitor = new TwitchMonitor(client, config);
    monitors.youtubeMonitor = new YouTubeMonitor(client, config);
    
    monitors.twitchMonitor.start();
    monitors.youtubeMonitor.start();
    
    console.log('✅ Entertainment monitors started');
  } catch (error) {
    console.error('❌ Error initializing entertainment monitors:', error);
  }

  // Auto-save interval for data protection
  autoSaveInterval = setInterval(() => {
    const { saveAll } = require('./src/utils/storage');
    saveAll();
  }, 300000);

  // Delayed startup tasks
  setTimeout(async () => {
    await checkAndGenerateSchedule(client);
    await checkAndPostScheduledEvents(client);
  }, 5000);
});

async function verifyChannelAccess() {
  const { SIGNUP_CHANNEL_ID, STAFF_CHAT_CHANNEL_ID } = process.env;

  for (const [label, id] of [
    ['Signup', SIGNUP_CHANNEL_ID],
    ['Staff', STAFF_CHAT_CHANNEL_ID]
  ]) {
    if (!id) continue;
    try {
      const channel = await client.channels.fetch(id);
      const perms = channel.permissionsFor(client.user);
      if (perms?.has(['ViewChannel', 'SendMessages']))
        console.log(`✅ ${label} channel verified`);
    } catch {
      console.error(`⚠️ Cannot access ${label} channel`);
    }
  }
}

// Graceful shutdown handler
async function gracefulShutdown() {
  console.log('💾 Saving all data...');
  
  // Clear the auto-save interval
  if (autoSaveInterval) {
    clearInterval(autoSaveInterval);
  }

  // Stop entertainment monitors
  if (monitors.twitchMonitor) {
    console.log('🛑 Stopping Twitch monitor...');
    monitors.twitchMonitor.stop();
  }
  
  if (monitors.youtubeMonitor) {
    console.log('🛑 Stopping YouTube monitor...');
    monitors.youtubeMonitor.stop();
  }

  // Perform final save
  const { saveAll } = require('./src/utils/storage');
  saveAll();

  // Destroy the Discord client
  console.log('👋 Disconnecting from Discord...');
  client.destroy();

  console.log('✅ Shutdown complete');
  process.exit(0);
}

// Handle shutdown signals
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  await gracefulShutdown();
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  await gracefulShutdown();
});

client.login(process.env.BOT_TOKEN);