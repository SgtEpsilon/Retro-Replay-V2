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

require('./src/events/interactionCreate');
require('./src/events/reactionAdd');
require('./src/events/reactionRemove');

registerCommands();

let autoSaveInterval;

client.once('ready', async () => {
  loadData();
  const events = getEvents();

  console.log(`✅ Logged in as ${client.user.tag}`);

  await verifyChannelAccess();
  initStatus(client);

  for (const id of Object.keys(events)) {
    scheduleReminder(id, client);
    scheduleBackupAlert(id, client);
  }

  scheduleAutoPost(client);

  autoSaveInterval = setInterval(() => {
    const { saveAll } = require('./src/utils/storage');
    saveAll();
  }, 300000);

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