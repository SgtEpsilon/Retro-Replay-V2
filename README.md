# 🎉 Retro Replay Bot Rewrite V2.3.0

A comprehensive **Discord.js v14** bot designed for managing bar/club staff scheduling with **emoji-based signups**, **automated shift posting**, **backup alerts**, **role management**, and **detailed shift logging**.

Perfect for RP servers, virtual clubs, bars, and any staff-driven community that needs organized shift management.

---

## ✨ Key Features

### 🤖 Automated Shift Management
- **Daily auto-posting** at 5 PM London time on configured open days
- Shifts automatically scheduled for 9 PM EST
- Smart blackout date system to skip closed days
- Automatic shift reminders when events start
- Backup alerts 2 hours before understaffed shifts (excludes disabled roles)
- One shift per day - prevents duplicate postings

### 📅 Event System
- Emoji-based role signups (react to join, unreact to leave)
- Live-updating embeds showing current staff roster
- **One role per user** - selecting new role removes old signup
- Automatic reaction cleanup for disabled roles
- Date/time format: **DD-MM-YYYY 12HR** (e.g., 15-01-2026 9:00 PM)

### 🎛️ Role Management
- Globally disable specific roles from signups
- Re-enable previously disabled roles
- Disabled roles persist across all events and bot restarts
- Existing signups preserved when roles are disabled
- New signups blocked for disabled roles with DM notification
- Disabled roles excluded from backup alerts

### 🎭 Dynamic Bot Status
- **Default status:** "Watching: 🍸 Shifts at the Retro Bar"
- `/setstatus` - Set custom status messages (Playing/Watching/Listening/Competing)
- `/statusclear` - Return to default status
- Custom status persists until manually cleared

### 🗓️ Blackout Date System
- `/addblackout` - Block specific dates from auto-posting (DD-MM-YYYY format)
- `/removeblackout` - Unblock dates and resume normal scheduling
- `/listblackouts` - View all currently blocked dates
- Bot skips blackout dates when posting shifts

### 📊 Shift Logging
- Automatic logging when shifts start
- Historical records stored in `shift_logs.json`
- Track all completed shifts with full signup details

### 🔒 Permission System
- Role-based access control for management commands
- Configurable manager roles in `config.json`
- Commands require roles: Owner, Head Manager, or Manager

---

## 🤖 Command Reference

### 👥 General Commands (All Users)

| Command | Description |
|---------|-------------|
| `/mysignups` | View all your upcoming shift signups |

### ⚙️ Manager Commands (Restricted)

| Command | Description |
|---------|-------------|
| `/cancelevent [messageid]` | Cancel a shift event (marks as cancelled, updates embed) |
| `/editeventtime [messageid] [datetime]` | Edit shift start time (format: DD-MM-YYYY h:mm AM/PM) |
| `/addblackout [date]` | Block a date from auto-posting (format: YYYY-MM-DD) |
| `/removeblackout [date]` | Unblock a previously blackout date |
| `/listblackouts` | View all currently blocked dates |
| `/setstatus [status] [type]` | Set custom bot status (optional: Playing/Watching/Listening/Competing) |
| `/statusclear` | Clear custom status and return to default |

---

## 🧑‍💼 Signup Roles

React with these emojis on shift posts to sign up:

| Emoji | Role | Description |
|-------|------|-------------|
| 1️⃣ | Active Manager | Primary shift leader |
| 2️⃣ | Backup Manager | Secondary manager on duty |
| 3️⃣ | Bouncer | Security and door control |
| 4️⃣ | Bartender | Bar service staff |
| 5️⃣ | Dancer | Entertainment performer |
| 6️⃣ | DJ | Music and atmosphere |

**One role per shift** - Selecting a new role automatically removes your previous signup for that shift.

---

## 📁 Project Structure

```
Retro-Replay-V2/
├── bot.js                    # Main bot file
├── config.json               # Server configuration
├── .env                      # Bot credentials (KEEP SECRET!)
├── scheduled_events.json     # Active events (auto-created)
├── auto_posted.json          # Daily post tracking (auto-created)
├── blackout_dates.json       # Closed dates (auto-created)
├── shift_logs.json           # Historical records (auto-created)
├── disabled_roles.json       # Globally disabled roles (auto-created)
├── package.json
└── README.md
```

---

## ⚙️ Configuration

### `.env` File
```env
BOT_TOKEN=your_discord_bot_token_here
CLIENT_ID=your_bot_application_id_here
SIGNUP_CHANNEL_ID=channel_id_for_shift_posts
BAR_STAFF_ROLE_ID=role_id_to_ping_for_shifts
```

**⚠️ CRITICAL: Never share your .env file or bot token publicly! Regenerate token immediately if exposed.**

### `config.json` File
```json
{
  "openDays": ["Tuesday", "Friday", "Saturday", "Sunday"],
  "eventCreatorRoles": [
    "Owner",
    "Head Manager",
    "Manager"
  ],
  "timezone": "America/New_York",
  "autoPostTimezone": "Europe/London",
  "autoPostHour": 17,
  "shiftStartHour": 21
}
```

**Configuration Options:**
- `openDays` - Days of the week the bar operates (bot posts on these days only)
- `eventCreatorRoles` - Discord roles that can use management commands
- `timezone` - Timezone for shift times (America/New_York = EST)
- `autoPostTimezone` - Timezone for auto-posting checks (Europe/London = GMT)
- `autoPostHour` - Hour to check for auto-posting (17 = 5 PM)
- `shiftStartHour` - Hour shifts start (21 = 9 PM)

---

## 🚀 Installation & Setup

### Prerequisites
- **Node.js** v18 or higher
- **Discord Bot** with required permissions:
  - Send Messages
  - Embed Links
  - Add Reactions
  - Read Message History
  - Use Slash Commands
  - Read Messages/View Channels
  - Manage Messages (for reaction removal)
- **Message Content Intent** enabled in Discord Developer Portal

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/retro-replay-v2.git
   cd retro-replay-v2
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   - Create `.env` file with your bot token, client ID, channel ID, and role ID
   - Edit `config.json` with your server's settings

4. **Enable Message Content Intent**
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Select your application → Bot section
   - Enable "Message Content Intent" under Privileged Gateway Intents

5. **Start the bot**
   ```bash
   node bot.js
   ```

### Required Dependencies
```json
{
  "discord.js": "^14.x",
  "luxon": "^3.x",
  "dotenv": "^16.x"
}
```

---

## 🧠 How It Works

### Automated Shift Posting
1. Bot checks every 10 minutes if it's 5 PM London time
2. If today matches an "open day" in config AND is not blacked out:
   - Creates shift event for 9 PM EST tonight
   - Posts to configured signup channel
   - Adds reaction emojis automatically
   - Pings bar staff role
3. Tracks posting by date to prevent duplicates
4. Disabled roles show as `~~Disabled~~` in embed

### Signup System
1. Users react with 1️⃣-6️⃣ to sign up for roles
2. Bot automatically removes their previous role signup (one role per shift)
3. Embed updates instantly with their username
4. Removing reaction removes user from that role
5. All changes persist across bot restarts
6. Reactions for disabled roles are auto-removed with DM notification

### Reminder & Alert Flow
1. **2 hours before shift** - Backup alert if **enabled** roles have no signups
2. **At shift start** - Reminder ping to all bar staff
3. **After shift starts** - Event logged to `shift_logs.json`

### Blackout Dates
- Use `/addblackout` with format YYYY-MM-DD (e.g., 2026-12-25)
- Bot skips blackout dates during daily auto-post checks
- Use `/removeblackout` to re-enable posting on that date
- Use `/listblackouts` to see all blocked dates

### Event Management
- `/cancelevent` - Marks event as cancelled, updates embed to red
- `/editeventtime` - Updates shift time, reschedules reminders/alerts
- Format dates as **DD-MM-YYYY h:mm AM/PM** (e.g., 25-12-2026 9:00 PM)

---

## 📊 Data Files

The bot creates and manages several JSON files:

| File | Purpose | Safe to Delete? |
|------|---------|-----------------|
| `scheduled_events.json` | Active shift events | ❌ No - will lose active signups |
| `auto_posted.json` | Daily post tracking | ✅ Yes - only prevents duplicates |
| `blackout_dates.json` | Closed dates list | ⚠️ Caution - will resume posting |
| `shift_logs.json` | Historical archives | ⚠️ Caution - will lose history |
| `disabled_roles.json` | Globally disabled roles | ⚠️ Caution - will re-enable all roles |

---

## 🎯 Usage Examples

### Blocking a Holiday
```
/addblackout date:2026-12-25
→ Christmas Day blocked from auto-posting
→ No shift will be posted on this date
```

### Editing a Shift Time
```
/editeventtime messageid:123456789 datetime:25-12-2026 10:00 PM
→ Shift time updated to 10 PM
→ Reminders and alerts rescheduled
→ Embed updated with new time
```

### Setting Custom Status
```
/setstatus status:Grand Opening Tonight! type:Playing
→ Bot status: "Playing: Grand Opening Tonight!"
→ Persists until you run /statusclear
```

### Checking Your Signups
```
/mysignups
→ Lists all your upcoming shifts with roles and times
```

### Managing Blackouts
```
/listblackouts
→ Shows: • 2026-12-25
         • 2026-01-01
         • 2026-07-04

/removeblackout date:2026-07-04
→ July 4th removed from blackout list
→ Shifts will resume posting on this date
```

---

## 📝 Important Notes

- **Timezone:** All shift times displayed in EST (America/New_York)
- **Auto-posting:** Checks daily at 5 PM London time (12 PM EST)
- **Shift time:** Always 9 PM EST on open days
- **Date format:** DD-MM-YYYY h:mm AM/PM for all displays and commands
- **Blackout format:** YYYY-MM-DD for blackout commands only
- **Data persistence:** All JSON files are critical for operation
- **One role per shift:** Users can only hold one role per event
- **Message Content Intent:** Required for reaction handling
- **Token security:** Never share your bot token - regenerate if exposed

---

## 🔧 Troubleshooting

**Bot isn't posting shifts automatically**
- Check that current day is in `openDays` config
- Verify no blackout date is set for today (`/listblackouts`)
- Ensure bot has permission to post in signup channel
- Verify bot is running during the 5 PM London time window
- Check console logs for "Auto-posted" or skip messages

**Reactions aren't working**
- Verify bot has "Add Reactions" and "Manage Messages" permissions
- Check that message ID exists in `scheduled_events.json`
- Ensure Message Content Intent is enabled in Developer Portal
- Check if role is disabled (`disabled_roles.json`)
- Verify bot can send DMs to users

**Commands not appearing**
- Bot needs "Use Application Commands" permission
- Commands register automatically on startup
- Try re-inviting bot with updated permissions
- Restart bot after permission changes
- Check console for "Logged in as" message

**Signup removed immediately after reacting**
- This is normal if the role is disabled
- Check `disabled_roles.json` file
- User should receive a DM explaining the role is disabled
- Re-enable role if needed (requires custom command implementation)

**Backup alerts not triggering**
- Alerts only fire for enabled roles with no signups
- Check 2 hours before shift time
- Verify disabled roles are properly excluded
- Ensure bot can send messages in the channel

**Event time showing wrong timezone**
- Check `timezone` setting in `config.json`
- Format is always DD-MM-YYYY h:mm AM/PM in configured timezone
- Auto-posting uses `autoPostTimezone` setting

---

## 🔄 Version History

**V2.3.0** (Current)
- Changed auto-posting from weekly to daily
- Added `/addblackout`, `/removeblackout`, `/listblackouts` commands
- Added `/setstatus` and `/statusclear` commands
- Implemented dynamic bot status system
- Changed to one role per user per shift (auto-removes previous role)
- Fixed config to use `.env` for channel and role IDs
- Improved reaction handling with DM notifications
- Standardized date format to DD-MM-YYYY 12HR throughout
- Added automatic shift logging when events start

**V2.1.3** (Previous)
- Weekly shift posting system
- Multi-role signups per user
- Basic role disable/enable system

---

## 📄 License

This project is open source and available under the MIT License.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

---

## 📞 Support

For support, questions, or feature requests, please open an issue on GitHub or contact the development team.

---

**Retro Replay Bot Rewrite V2.2.2** - Making shift management effortless 🎉