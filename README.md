# 🎉 Retro Replay Bot Rewrite V2.1.3

A comprehensive **Discord.js v14** bot designed for managing bar/club staff scheduling with **emoji-based signups**, **automated shift posting**, **backup alerts**, **role management**, and **detailed analytics**.

Perfect for RP servers, virtual clubs, bars, and any staff-driven community that needs organized shift management.

---

## ✨ Key Features

### 🤖 Automated Shift Management
- **Auto-posting** at 5 PM GMT on configured open days
- Shifts automatically scheduled for 9 PM EST
- Smart blackout date system to skip closed days
- Automatic shift reminders when events start
- Backup alerts 2 hours before understaffed shifts (excludes disabled roles)

### 📅 Event System
- `/createevent` - Create custom events with pre-filled modal forms
- Emoji-based role signups (react to join, unreact to leave)
- Live-updating embeds showing current staff roster
- Multiple role signups per user supported
- Unix timestamps with live countdowns

### 🎛️ Role Management
- `!disable [1-6]` - Globally disable specific roles from signups
- `!enable [1-6]` - Re-enable previously disabled roles
- Disabled roles persist across all events and bot restarts
- Existing signups preserved when roles are disabled
- New signups blocked for disabled roles
- Disabled roles excluded from backup alerts

### 📊 Analytics & Tracking
- `/shiftstats` - View top contributors and role breakdowns
- Automatic shift logging for record-keeping
- Track signup patterns over 7/30 days or all time
- Export historical data for management review

### 🎭 Dynamic Bot Status
- Rotating status: "Watching: Drinking At The Bar" ↔ "Playing: Now Hiring"
- `/setstatus` - Set custom status messages for events
- Temporary or permanent status overrides
- Automatically resumes rotation after timer expires

### 🔐 Permission System
- Role-based access control for management commands
- Separate permissions for event creation and viewing
- Configurable manager roles in `config.json`

---

## 🤖 Command Reference

### 👥 General Commands (All Users)

| Command | Description |
|---------|-------------|
| `/nextshift` | View the next scheduled shift with countdown |
| `/roster [days]` | Display upcoming shifts (default: 7 days) |
| `/shiftstats [period]` | View signup statistics and top contributors |
| `/help` | Display all available commands and bot features |

### ⚙️ Manager Commands (Restricted)

| Command | Description |
|---------|-------------|
| `/createevent` | Manually create a shift event with custom details |
| `/blackout add [date]` | Block a specific date from auto-posting |
| `/blackout remove [date]` | Unblock a date and resume normal scheduling |
| `/blackout list` | View all currently blocked dates |
| `/shiftlogs [count]` | View archived shift records (default: 5) |
| `/setstatus [type] [message] [duration]` | Set custom bot status temporarily |
| `!disable [1-6]` | Disable a role globally (blocks new signups, keeps existing) |
| `!enable [1-6]` | Re-enable a previously disabled role |

---

## 🧑‍💼 Signup Roles

React with these emojis on shift posts to sign up:

| Emoji | Role | Number | Description |
|-------|------|--------|-------------|
| 1️⃣ | Active Manager | 1 | Primary shift leader |
| 2️⃣ | Backup Manager | 2 | Secondary manager on duty |
| 3️⃣ | Bouncer | 3 | Security and door control |
| 4️⃣ | Bartender | 4 | Bar service staff |
| 5️⃣ | Dancer | 5 | Entertainment performer |
| 6️⃣ | DJ | 6 | Music and atmosphere |

**Multi-role signups allowed** - Staff can sign up for multiple positions per shift.

---

## 📁 Project Structure

```
Retro-Replay-V2/
├── bot.js                    # Main bot file
├── config.json               # Server configuration
├── .env                      # Bot credentials
├── scheduled_events.json     # Active events (auto-created)
├── auto_posted.json          # Auto-post tracking (auto-created)
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
```

### `config.json` File
```json
{
  "signupChannelId": "CHANNEL_ID_WHERE_EVENTS_POST",
  "openDays": ["Tuesday", "Friday", "Saturday", "Sunday"],
  "eventCreatorRoles": [
    "Owner",
    "Head Manager",
    "Manager"
  ],
  "barStaffRoleId": "ROLE_ID_TO_PING_FOR_SHIFTS"
}
```

**Configuration Options:**
- `signupChannelId` - Channel where shift signups are posted
- `openDays` - Days of the week the bar operates (auto-posts on these days)
- `eventCreatorRoles` - Discord roles that can manage events and use `!disable`/`!enable`
- `barStaffRoleId` - Role to ping for reminders and alerts

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
- **Message Content Intent** enabled in Discord Developer Portal (required for `!disable`/`!enable` commands)

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
   - Create `.env` file with your bot token and client ID
   - Edit `config.json` with your server's channel/role IDs

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
1. Bot checks every minute if it's 5 PM GMT
2. If today is an "open day" and not blacked out, creates shift event
3. Event is posted for 9 PM EST that same evening
4. Signup emojis are automatically added to the message
5. Disabled roles are marked as `~~*Disabled*~~` in the embed

### Signup System
1. Users react with role emojis to sign up
2. Bot updates the embed instantly with their username
3. Removing reaction removes user from that role
4. All changes persist across bot restarts
5. Reactions for disabled roles are automatically removed

### Role Management System
1. Managers use `!disable [number]` to block signups for a role
2. Existing signups are preserved, but new signups are blocked
3. Disabled status applies globally to all current and future events
4. Role stays disabled until a manager runs `!enable [number]`
5. All event embeds update to show disabled status

### Reminder & Alert Flow
1. **2 hours before shift** - Backup alert sent if **enabled** roles are empty
2. **At shift start** - Reminder ping sent to all bar staff
3. **After shift starts** - Event archived to shift logs

### Blackout Dates
- Use `/blackout add` to prevent auto-posting on specific dates
- Bot skips blacked-out dates when calculating next shifts
- Useful for holidays, maintenance, or special closures

---

## 📊 Data Files

The bot creates and manages several JSON files:

| File | Purpose | Safe to Delete? |
|------|---------|-----------------|
| `scheduled_events.json` | Active shift events | ❌ No - will lose active signups |
| `auto_posted.json` | Tracks posted dates | ✅ Yes - only prevents duplicates |
| `blackout_dates.json` | Closed dates list | ⚠️ Caution - will resume posting |
| `shift_logs.json` | Historical archives | ⚠️ Caution - will lose stats |
| `disabled_roles.json` | Globally disabled roles | ⚠️ Caution - will re-enable all roles |

---

## 🎯 Usage Examples

### Creating a Special Event
```
/createevent
→ Modal appears with pre-filled next shift
→ Edit title to "Grand Opening Night"
→ Adjust time if needed
→ Submit → Event posted!
```

### Blocking a Holiday
```
/blackout add date:2026-12-25
→ Christmas Day blocked from auto-posting
→ Staff won't see a shift posted that day
```

### Disabling a Role Temporarily
```
!disable 6
→ DJ role disabled globally
→ Existing DJ signups preserved
→ New people can't sign up as DJ
→ All event embeds update to show "DJ: ~~*Disabled*~~"
→ Backup alerts won't ping for missing DJs

!enable 6
→ DJ role re-enabled
→ Staff can sign up as DJ again
```

### Checking Signup Stats
```
/shiftstats period:Last 30 days
→ View top 10 contributors
→ See which roles are most popular
→ Identify reliable staff members
```

### Setting Event Status
```
/setstatus type:Playing message:Anniversary Party Tonight duration:180
→ Status shows "Playing: Anniversary Party Tonight"
→ After 3 hours, returns to normal rotation
```

---

## 📝 Important Notes

- **Timezone:** All times are in EST (America/New_York)
- **Auto-posting:** Happens at 5 PM GMT = 12 PM EST
- **Shift time:** Always 9 PM EST on open days
- **Data persistence:** All files are critical for operation
- **Permissions:** Event creator roles defined in config.json
- **Message Content Intent:** Required for `!disable`/`!enable` commands
- **Disabled roles:** Apply globally and persist across restarts
- **Backup alerts:** Only trigger for enabled roles with no signups

---

## 🔧 Troubleshooting

**Bot isn't posting shifts automatically**
- Check that current day is in `openDays` config
- Verify no blackout date is set for today
- Ensure bot has permission to post in signup channel
- Check bot is running at 5 PM GMT
- Verify bot is online and connected

**Reactions aren't adding users**
- Verify bot has "Add Reactions" permission
- Check that message ID exists in `scheduled_events.json`
- Ensure user isn't already signed up for that role
- Check if role is disabled (`!enable [number]` to fix)

**Commands not appearing**
- Bot needs "Use Application Commands" permission
- Try re-inviting bot with updated permissions
- Restart bot after permission changes

**`!disable` and `!enable` not working**
- Ensure "Message Content Intent" is enabled in Developer Portal
- Verify user has a role listed in `eventCreatorRoles`
- Check bot has permission to read messages in that channel
- Restart bot after enabling Message Content Intent

**Disabled role still allows signups**
- Check `disabled_roles.json` file exists and contains the role
- Verify role name matches exactly (e.g., "DJ" not "Dj")
- Try disabling and re-enabling the role
- Restart bot to reload disabled roles list

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

**Retro Replay Bot Rewrite V2.1.3** - Making shift management effortless 🎉