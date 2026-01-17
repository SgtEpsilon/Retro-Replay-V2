# 🎉 Retro Replay Bot - Monolithic Update V1

A comprehensive **Discord.js v14** bot designed for managing bar/club staff scheduling with **emoji-based signups**, **automated shift posting**, **multi-stage backup alerts**, **role management**, and **detailed shift logging**.

Perfect for RP servers, virtual clubs, bars, and any staff-driven community that needs organized shift management.

---

## ✨ Key Features

### 🤖 Automated Shift Management
- **Daily auto-posting** at configured hour in your timezone on configured open days
- **Smart restart handling** - Won't post shifts on restart unless within configured hour window
- Shifts automatically scheduled for configured start hour
- **Duplicate shift prevention** - Scans last 100 messages to prevent duplicate posts
- Smart blackout date system to skip closed days (supports **DD-MM-YYYY** format)
- Automatic shift reminders when events start
- **Multi-stage backup alerts** sent to #staff-chat:
  - 2 hours before shift
  - 5 minutes before shift
  - At shift start time
- **Intelligent manager pings** - Both Active Manager and Backup Manager positions ping @Head Manager and @Manager
- Backup alerts exclude disabled roles
- One shift per day - prevents duplicate postings
- **Unified timezone configuration** - All times use single timezone setting
- **Enhanced debug logging** - Detailed startup diagnostics and hourly checks

### 📅 Event System
- Emoji-based role signups (react to join, unreact to leave)
- Live-updating embeds showing current staff roster
- **Discord dynamic timestamps** - Shows time in each user's local timezone with live countdown
- **Manual refresh command** - Anyone can refresh shift embeds to fix display issues
- **Shift reposting** - Managers can repost latest shift to bump it to top of channel
- **One role per user** - selecting new role removes old signup
- Automatic reaction cleanup for disabled roles
- **Universal date format: DD-MM-YYYY** (e.g., 15-01-2026 for January 15, 2026)
- Time format: **12-hour with AM/PM** (e.g., 9:00 PM)
- Manual event creation via modal form with `/createevent`

### 🎛️ Role Management
- `/disable` - Globally disable specific roles from signups via dropdown menu
- `/enable` - Re-enable previously disabled roles via dropdown menu
- Disabled roles persist across all events and bot restarts
- Existing signups preserved when roles are disabled
- New signups blocked for disabled roles with DM notification
- Disabled roles excluded from backup alerts

### 🎭 Dynamic Bot Status
- **Default status:** "Watching: 🍸 Shifts at the Retro Bar"
- `/setstatus` - Set custom status messages (Playing/Watching/Listening/Competing)
- `/statusclear` - Return to default status
- Custom status persists until manually cleared
- **Permission-locked** - Only users with configured eventCreatorRoles can manage status

### 🗓️ Blackout Date System
- `/addblackout` - Block specific dates from auto-posting (**DD-MM-YYYY** format)
- `/removeblackout` - Unblock dates and resume normal scheduling (**DD-MM-YYYY** format)
- `/listblackouts` - View all currently blocked dates (displays in **DD-MM-YYYY** format)
- Bot skips blackout dates when posting shifts
- **Consistent date format** - Uses DD-MM-YYYY format matching all other bot operations

### 📊 Shift Logging
- Automatic logging when shifts start
- Historical records stored in `shift_logs.json`
- Track all completed shifts with full signup details

### 🔐 Permission System
- Role-based access control for management commands
- Configurable manager roles in `config.json`
- Informative permission error messages showing required roles
- Commands require roles: Owner, Head Manager, or Manager (configurable)

---

## 🤖 Command Reference

### 👥 General Commands (All Users)

| Command | Description |
|---------|-------------|
| `/mysignups` | View all your upcoming shift signups |
| `/nextshift` | View the next upcoming shift with countdown |
| `/areweopen` | Check if the bar is open today |
| `/refresh <messageid>` | Refresh a shift signup embed (fixes display issues, updates timestamps) |
| `/help` | Display comprehensive command list and signup guide |

### ⚙️ Manager Commands (Restricted)

| Command | Description |
|---------|-------------|
| `/createevent` | Create a new shift event using modal form |
| `/cancelevent <messageid>` | Cancel a shift event (marks as cancelled, updates embed) |
| `/editeventtime <messageid> <datetime>` | Edit shift start time (format: DD-MM-YYYY h:mm AM/PM) |
| `/repost` | Repost the latest upcoming shift (deletes old, creates new with signups preserved) |
| `/enable <role>` | Enable a disabled role for signups (dropdown selection) |
| `/disable <role>` | Disable a role from signups (dropdown selection) |
| `/addblackout <date>` | Block a date from auto-posting (format: DD-MM-YYYY) |
| `/removeblackout <date>` | Unblock a previously blackout date (format: DD-MM-YYYY) |
| `/listblackouts` | View all currently blocked dates |
| `/setstatus <status> [type]` | Set custom bot status (optional: Playing/Watching/Listening/Competing) |
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
├── index.js                  # Main entry point
├── config.json               # Server configuration
├── .env                      # Bot credentials (KEEP SECRET!)
├── src/
│   ├── client.js            # Discord client initialization
│   ├── commands/            # Command handlers
│   │   ├── register.js
│   │   ├── createEvent.js
│   │   ├── mySignups.js
│   │   ├── nextShift.js
│   │   ├── areWeOpen.js
│   │   ├── cancelEvent.js
│   │   ├── editEventTime.js
│   │   ├── setStatus.js
│   │   ├── statusClear.js
│   │   ├── blackout.js
│   │   ├── roleManagement.js
│   │   ├── help.js
│   │   ├── refresh.js
│   │   └── repost.js
│   ├── events/              # Event handlers
│   │   ├── interactionCreate.js
│   │   ├── reactionAdd.js
│   │   └── reactionRemove.js
│   ├── services/            # Background services
│   │   ├── autoPost.js
│   │   └── backupAlert.js
│   └── utils/               # Utility functions
│       ├── constants.js
│       ├── helpers.js
│       └── storage.js
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
STAFF_CHAT_CHANNEL_ID=channel_id_for_backup_alerts
BAR_STAFF_ROLE_ID=role_id_to_ping_for_shifts
```

**⚠️ CRITICAL: Never share your .env file or bot token publicly! Regenerate token immediately if exposed.**

**Required Environment Variables:**
- `BOT_TOKEN` - Your Discord bot token from Developer Portal
- `CLIENT_ID` - Your bot's application ID
- `SIGNUP_CHANNEL_ID` - Channel where shifts are posted
- `STAFF_CHAT_CHANNEL_ID` - Channel where backup alerts are sent (separate from signup channel)
- `BAR_STAFF_ROLE_ID` - Role ID to ping when shifts are posted

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
  "autoPostHour": 17,
  "shiftStartHour": 21
}
```

**Configuration Options:**
- `openDays` - Days of the week the bar operates (bot posts on these days only)
- `eventCreatorRoles` - Discord roles that can use management commands
- `timezone` - **Single timezone for all operations** (America/New_York = EST)
- `autoPostHour` - Hour to check for auto-posting (17 = 5 PM in configured timezone)
- `shiftStartHour` - Hour shifts start (21 = 9 PM in configured timezone)

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
   - Create `.env` file with your bot token, client ID, channel IDs, and role ID
   - Add `STAFF_CHAT_CHANNEL_ID` for backup alerts
   - Edit `config.json` with your server's settings

4. **Enable Message Content Intent**
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Select your application → Bot section
   - Enable "Message Content Intent" under Privileged Gateway Intents

5. **Start the bot**
   ```bash
   node index.js
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
1. Bot checks every 10 minutes if current hour matches `autoPostHour` in configured timezone
2. **Startup check** - On bot restart, only posts if within configured hour window (prevents unexpected posts)
3. **Scans last 100 messages** to check if shift already exists (prevents duplicates)
4. If today matches an "open day" in config AND is not blacked out AND no duplicate exists:
   - Creates shift event for configured `shiftStartHour` tonight
   - Posts to configured signup channel
   - Adds reaction emojis automatically
   - Pings bar staff role
   - Shows Discord dynamic timestamps (displays in each user's local timezone)
5. Tracks posting by date to prevent duplicates
6. Disabled roles show as `~~Disabled~~` in embed
7. **Debug logging** shows timezone, config values, and posting decisions

### Signup System
1. Users react with 1️⃣-6️⃣ to sign up for roles
2. Bot automatically removes their previous role signup (one role per shift)
3. Embed updates instantly with their username
4. **Discord timestamps** update automatically showing countdown in user's timezone
5. **Manual refresh available** - Use `/refresh` if embed doesn't update properly
6. Removing reaction removes user from that role
7. All changes persist across bot restarts
8. Reactions for disabled roles are auto-removed with DM notification

### Multi-Stage Backup Alert System
The bot sends backup alerts at **three different times** to #staff-chat:

1. **2 hours before shift** - First warning for unfilled positions
2. **5 minutes before shift** - Urgent alert if still understaffed
3. **At shift start time** - Final alert for missing positions

**Alert Features:**
- Only mentions roles that are **enabled** and have **no signups**
- Sent to dedicated #staff-chat channel (not signup channel)
- Includes shift title and timeframe in message
- Pings relevant Discord roles (e.g., @Bartender, @Bouncer)
- **Intelligent manager pinging**: Both Active Manager and Backup Manager positions ping @Head Manager AND @Manager (not just one)
- Gracefully handles missing Discord roles

**Example Alert:**
```
⚠️ BACKUP NEEDED (5 minutes) for Friday Night Shift
Missing positions:
@Head Manager
@Manager
@Bartender
@Bouncer
```

### Reminder Flow
1. **2 hours before shift** - First backup alert to #staff-chat (if positions unfilled)
2. **5 minutes before shift** - Second backup alert to #staff-chat (if positions unfilled)
3. **At shift start** - Final backup alert to #staff-chat (if positions unfilled)
4. **At shift start** - Shift start reminder ping in signup channel to all bar staff
5. **After shift starts** - Event logged to `shift_logs.json`

### Blackout Dates
- Use `/addblackout` with format **DD-MM-YYYY** (e.g., 25-12-2026)
- Bot skips blackout dates during daily auto-post checks
- Use `/removeblackout` to re-enable posting on that date
- Use `/listblackouts` to see all blocked dates
- **All dates use DD-MM-YYYY format** for consistency

### Role Management
- Use `/disable` with dropdown menu to select role to disable
- Use `/enable` with dropdown menu to select role to enable
- Changes apply globally to all shifts immediately
- Disabled status persists in `disabled_roles.json`

### Event Management
- `/createevent` - Opens modal form to create custom shift event
- `/cancelevent` - Marks event as cancelled, updates embed to red
- `/editeventtime` - Updates shift time, reschedules all reminders and alerts, updates timestamps
- **All dates use DD-MM-YYYY h:mm AM/PM format** (e.g., 25-12-2026 9:00 PM)

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

### Creating a Custom Event
```
/createevent
→ Modal opens with three fields:
  • Event Title: "Saturday Special Event"
  • Date: 25-01-2026 (DD-MM-YYYY)
  • Time: 10:00 PM
→ Event created and posted to signup channel
→ All reminders and alerts automatically scheduled
→ Discord timestamps show time in each user's timezone
```

### Managing Roles
```
/disable role:Dancer
→ Dancer role disabled globally
→ Existing signups preserved
→ New signup attempts auto-removed with DM

/enable role:Dancer
→ Dancer role re-enabled for signups
→ Users can now sign up again
```

### Blocking a Holiday
```
/addblackout date:25-12-2026
→ Christmas Day blocked from auto-posting
→ No shift will be posted on this date
→ Format: DD-MM-YYYY
```

### Editing a Shift Time
```
/editeventtime messageid:123456789 datetime:25-12-2026 10:00 PM
→ Shift time updated to 10 PM on December 25, 2026
→ All reminders and alerts rescheduled (2hr, 5min, start)
→ Embed updated with new time and timestamps
→ Format: DD-MM-YYYY h:mm AM/PM
```

### Setting Custom Status
```
/setstatus status:Grand Opening Tonight! type:Playing
→ Bot status: "Playing: Grand Opening Tonight!"
→ Persists until you run /statusclear
→ Requires eventCreatorRoles permission
```

### Checking Your Signups
```
/mysignups
→ Lists all your upcoming shifts with roles and times
```

### Checking Next Shift
```
/nextshift
→ Shows next scheduled shift with countdown timer
→ Displays shift start time in your local timezone
→ Uses Discord's dynamic timestamp feature
```

### Checking if Bar is Open
```
/areweopen
→ Shows if bar is open today
→ If not, displays which days bar is open
→ Displays times in your local timezone
```

### Getting Help
```
/help
→ Displays comprehensive command list with parameters
→ Shows all role emojis and descriptions
→ Organized by command categories
→ Shows required permission roles dynamically
```

### Refreshing a Shift Embed
```
/refresh messageid:123456789012345678
→ Refreshes the shift signup embed
→ Updates timestamps and signup list
→ Fixes display issues if embed didn't update
→ Available to all users (no special permissions required)

Use cases:
• Embed not updating after reactions
• Timestamps showing incorrectly
• Signup list out of sync
• General display problems
```

### Reposting a Shift
```
/repost
→ Finds the latest upcoming shift
→ Creates a new post with all current signups
→ Deletes the old shift message
→ Pings @Bar Staff role again
→ Requires manager permissions

Use cases:
• Shift message buried in chat
• Want to bump shift to top of channel
• Need fresh notification to staff
• Old message had persistent issues
```

### Managing Blackouts
```
/listblackouts
→ Shows: • 25-12-2026 (2026-12-25)
         • 01-01-2027 (2027-01-01)
         • 04-07-2026 (2026-07-04)

/removeblackout date:04-07-2026
→ July 4th removed from blackout list
→ Shifts will resume posting on this date
→ Format: DD-MM-YYYY
```

---

## 📝 Important Notes

- **Date Format:** **ALL dates use DD-MM-YYYY format** throughout the entire bot (e.g., 25-12-2026 = December 25, 2026)
- **Time Format:** 12-hour format with AM/PM (e.g., 9:00 PM)
- **Timezone:** All operations use single `timezone` setting from config.json
- **Discord Timestamps:** Users see times in their local timezone automatically
- **Auto-posting:** Checks every 10 minutes during configured `autoPostHour`
- **Shift time:** Uses configured `shiftStartHour` on open days
- **Data persistence:** All JSON files are critical for operation
- **One role per shift:** Users can only hold one role per event
- **Message Content Intent:** Required for reaction handling
- **Token security:** Never share your bot token - regenerate if exposed
- **Duplicate prevention:** Bot scans last 100 messages to prevent duplicate shift posts
- **Backup alerts:** Sent to #staff-chat at 2 hours, 5 minutes, and shift start time
- **Staff chat required:** Must configure STAFF_CHAT_CHANNEL_ID for backup alerts to work
- **Permission messages:** Error messages now show exactly which roles are required
- **Manual refresh:** Anyone can use `/refresh` to fix embed display issues
- **Shift reposting:** Managers can use `/repost` to bump shifts to top of channel
- **Smart restart:** Bot won't auto-post on restart unless within configured hour window
- **Debug logging:** Comprehensive diagnostics for timezone and auto-posting behavior

---

## 🔧 Troubleshooting

**Bot isn't posting shifts automatically**
- Check that current day is in `openDays` config
- Verify no blackout date is set for today (`/listblackouts`)
- Ensure bot has permission to post in signup channel
- Verify bot is running during the configured `autoPostHour` window
- Check that `timezone` is correctly set in config.json
- Check console logs for "Auto-posted" or skip messages
- Look for "already exists" messages indicating duplicate prevention
- **Check startup logs** - bot logs timezone, config values, and current time on startup
- **Restart during wrong hour** - bot won't post if restarted outside configured hour window

**Backup alerts not being sent**
- Verify `STAFF_CHAT_CHANNEL_ID` is set in `.env` file
- Ensure bot has "View Channel" and "Send Messages" permissions in #staff-chat
- Check console logs for staff chat access verification on startup
- Alerts only trigger for enabled roles with no signups
- Bot logs "backup alert not sent" if channel is misconfigured
- **Manager pings**: Active Manager and Backup Manager both ping @Head Manager and @Manager

**Reactions aren't working**
- Verify bot has "Add Reactions" and "Manage Messages" permissions
- Check that message ID exists in `scheduled_events.json`
- Ensure Message Content Intent is enabled in Developer Portal
- Check if role is disabled using `/disable` command
- Verify bot can send DMs to users
- Try using `/refresh messageid:XXXXXXXXX` to manually update the embed

**Commands not appearing**
- Bot needs "Use Application Commands" permission
- Commands register automatically on startup
- Try re-inviting bot with updated permissions
- Restart bot after permission changes
- Check console for "✅ Slash commands registered" message

**Signup removed immediately after reacting**
- This is normal if the role is disabled
- Check with `/help` or ask a manager to verify role status
- User should receive a DM explaining the role is disabled
- Manager can use `/enable` to re-enable the role

**Event time showing wrong timezone**
- Check `timezone` setting in `config.json`
- Format is always DD-MM-YYYY h:mm AM/PM in configured timezone
- Users will see Discord timestamps in their own local timezone

**Permission denied on status commands**
- Bot status commands require roles listed in `eventCreatorRoles`
- Error message will show: "You need one of the following roles: Owner, Head Manager, Manager"
- Ask a server administrator to add your role to config.json if needed

**Duplicate shifts being posted**
- Bot now scans last 100 messages to prevent this
- If duplicates still occur, check console logs for errors
- Verify bot has "Read Message History" permission
- Check if `scheduled_events.json` has duplicate entries

**Multiple backup alerts for same shift**
- This is expected behavior - alerts sent at 2 hours, 5 minutes, and at start
- Each alert only mentions positions still unfilled at that time
- If position gets filled, it won't appear in subsequent alerts

**Timestamps not updating/showing correctly**
- Discord timestamps update automatically - no bot action needed
- If not showing, verify embed was created/updated with new timestamp code
- Users must have Discord client updated to see dynamic timestamps
- Try using `/refresh messageid:XXXXXXXXX` to regenerate timestamps

**Embed not updating after reactions**
- This is usually temporary - wait a few seconds
- If persist, use `/refresh messageid:XXXXXXXXX` to manually update
- Check bot has "Manage Messages" permission
- Verify bot isn't rate-limited (too many edits at once)

**Shift posted at wrong time**
- Check console logs at bot startup for timezone configuration
- Verify `timezone`, `autoPostHour`, and `shiftStartHour` in config.json
- Look for hourly check logs showing what time bot is looking for
- Check if bot was restarted - it only posts on restart if within configured hour
- Ensure server/container timezone doesn't conflict with bot timezone setting

**Wrong date format errors**
- **All dates must be in DD-MM-YYYY format** (e.g., 25-12-2026, not 12-25-2026)
- This applies to: `/createevent`, `/editeventtime`, `/addblackout`, `/removeblackout`
- Day comes first, then month, then year
- Example: January 15, 2026 = 15-01-2026

---

## 📄 Version History

**Monolithic Update V1** (Current)
- **COMPLETE REWRITE:** Restructured from monolithic single-file to modular architecture
- **NEW:** Organized codebase with separate folders for commands, events, services, and utilities
- **NEW:** Modular command system with individual files for each command
- **NEW:** Centralized constants and configuration management
- **NEW:** Improved error handling and logging throughout
- **CHANGED:** Blackout date format now uses **DD-MM-YYYY** (was YYYY-MM-DD)
  - `/addblackout` now accepts DD-MM-YYYY format
  - `/removeblackout` now accepts DD-MM-YYYY format
  - `/listblackouts` displays dates in DD-MM-YYYY format
  - Internal storage still uses ISO format (YYYY-MM-DD) for consistency
- **IMPROVED:** Better code organization and maintainability
- **IMPROVED:** Enhanced separation of concerns
- **FIXED:** All existing features from V2.3.7.1 maintained
- **FIXED:** Startup auto-post checks configured hour before posting
- **FIXED:** Manager role pings - Active Manager and Backup Manager both ping @Head Manager AND @Manager
- Enhanced debug logging system with detailed diagnostics
- Prevents unexpected shift posts when bot restarts outside configured hour window

**Previous Monolithic Version (V2.3.7.1)**
- Startup auto-post hour checking
- Manager role ping improvements
- `/repost` command
- Enhanced debug logging

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

**Retro Replay Bot - Monolithic Update V1** - Making shift management effortless 🎉

**📅 Universal Date Format: DD-MM-YYYY** - All dates throughout the bot use Day-Month-Year format for consistency.