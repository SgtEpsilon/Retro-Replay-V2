/***********************
 * Retro Replay Bot Monolithic Update V1
 * Main Entry Point
 ***********************/
process.removeAllListeners('warning');
process.env.NODE_NO_WARNINGS = '1';

require('dotenv').config();

const { client } = require('./src/client');
const { registerCommands } = require('./src/commands/register');
const { loadData, scheduleReminder, scheduleBackupAlert } = require('./src/utils/storage');
const { scheduleAutoPost, autoPostWeeklyShifts } = require('./src/services/autoPost');
const { setDefaultStatus } = require('./src/utils/helpers');
const { DateTime } = require('luxon');
const config = require('./config.json');

// Import event handlers
require('./src/events/interactionCreate');
require('./src/events/reactionAdd');
require('./src/events/reactionRemove');

// Register slash commands
registerCommands();

// Bot ready event
client.once('ready', async () => {
  const { events } = loadData();
  
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log(`\n⚙️  Configuration:`);
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
  
  // Initial check 5 seconds after startup
  setTimeout(() => {
    const now = DateTime.now().setZone(config.timezone);
    console.log(`\n🔍 Initial auto-post check at startup:`);
    console.log(`   Current time: ${now.toFormat('yyyy-MM-dd HH:mm:ss z')}`);
    console.log(`   Current hour: ${now.hour} | Target hour: ${config.autoPostHour}`);
    console.log(`   Will run: ${now.hour === config.autoPostHour && now.minute < 10 ? 'YES' : 'NO'}\n`);
    
    if (now.hour === config.autoPostHour && now.minute < 10) {
      autoPostWeeklyShifts(client);
    } else {
      console.log(`⏭️ Skipping auto-post at startup - not within configured hour window`);
    }
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