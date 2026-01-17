const path = require('path');
const config = require('../../config.json');

// Environment variables
const TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const SIGNUP_CHANNEL = process.env.SIGNUP_CHANNEL_ID;
const STAFF_CHAT_CHANNEL = process.env.STAFF_CHAT_CHANNEL_ID;
const BAR_STAFF_ROLE_ID = process.env.BAR_STAFF_ROLE_ID;

// Config values
const TIMEZONE = config.timezone;
const AUTO_POST_HOUR = config.autoPostHour;
const SHIFT_START_HOUR = config.shiftStartHour;

// File paths
const DATA_FILE = path.join(__dirname, '../../scheduled_events.json');
const AUTO_POST_FILE = path.join(__dirname, '../../auto_posted.json');
const BLACKOUT_FILE = path.join(__dirname, '../../blackout_dates.json');
const SHIFT_LOG_FILE = path.join(__dirname, '../../shift_logs.json');
const DISABLED_ROLES_FILE = path.join(__dirname, '../../disabled_roles.json');

// Role configuration
const roleConfig = {
  '1️⃣': 'Active Manager',
  '2️⃣': 'Backup Manager',
  '3️⃣': 'Bouncer',
  '4️⃣': 'Bartender',
  '5️⃣': 'Dancer',
  '6️⃣': 'DJ'
};

module.exports = {
  TOKEN,
  CLIENT_ID,
  SIGNUP_CHANNEL,
  STAFF_CHAT_CHANNEL,
  BAR_STAFF_ROLE_ID,
  TIMEZONE,
  AUTO_POST_HOUR,
  SHIFT_START_HOUR,
  DATA_FILE,
  AUTO_POST_FILE,
  BLACKOUT_FILE,
  SHIFT_LOG_FILE,
  DISABLED_ROLES_FILE,
  roleConfig,
  config
};