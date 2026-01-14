# 🎉 Retro Replay V2 — Discord Event Signup Bot

Retro Replay V2 is a **Discord.js v14** bot built for managing staff events with **emoji-based signups**, **modals (forms)**, **automatic scheduling**, and **persistent storage**.  
Designed for clubs, bars, RP servers, and staff-driven communities.

---

## ✨ Features

### 📅 Event Management
- `/createevent` opens a **Discord modal (form)**
- Date & time are **pre-filled for 9:00 PM EST on the next open day**
- Auto-generated event titles
- Events persist across restarts

### 🧾 Emoji-Based Signups
- React with emojis to sign up
- Your **username is added to the signup list**
- Removing a reaction **removes you from the signup**
- One user can sign up for **multiple roles**
- Embed updates live

### ⏳ Time Awareness
- Displays **Unix timestamp** for the event
- Displays **live Unix countdown**
- All times handled in **America/New_York (EST)**

### 🔔 Automated Reminders
- Automatically pings the **Bar Staff role**
- Ping happens **at event start time**
- Cancelled events do not trigger reminders

### 🗓 Open Day Logic
- Open days defined in `config.json`
- Bot knows whether the bar is **OPEN or CLOSED today**
- Used for `/nextshift` and `/createevent`

### 🔐 Permissions
- Only users with roles listed in `eventCreatorRoles` can:
  - Create events
  - Cancel events
  - Repost events

---

## 🤖 Slash Commands

| Command | Description |
|-------|------------|
| `/createevent` | Open a modal to create a new event |
| `/cancelevent` | Cancel an existing event |
| `/listevents` | List all or upcoming events |
| `/repostevent` | Repost the next upcoming event |
| `/nextshift` | Shows next shift time, countdown, and open status |

---

## 🧑‍💼 Signup Roles (Emoji Reactions)

| Emoji | Role |
|------|-----|
| 1️⃣ | Active Manager |
| 2️⃣ | Backup Manager |
| 3️⃣ | Bouncer |
| 4️⃣ | Bartender |
| 5️⃣ | Dancer |
| 6️⃣ | DJ |

Users may sign up for **any combination of roles**.

---

## 📁 Project Structure

```text
Retro-Replay-V2/
├── bot.js
├── config.json
├── .env
├── scheduled_events.json   # Auto-created (DO NOT DELETE)
├── handlers/
│   ├── interactionHandler.js
│   ├── reactionHandler.js
├── services/
│   ├── eventStore.js
│   ├── eventHelpers.js
│   ├── updateEmbed.js
│   ├── signupRules.js
└── README.md


⚙️ Configuration
.env
```text
BOT_TOKEN=YOUR_BOT_TOKEN
CLIENT_ID=YOUR_APPLICATION_ID
```
config.json
```text
{
  "signupChannelId": "CHANNEL_ID_FOR_EVENTS",
  "openDays": ["Tuesday", "Friday", "Saturday", "Sunday"],
  "eventCreatorRoles": [
    "Owner",
    "Head Manager",
    "Manager"
  ],
  "barStaffRoleId": "ROLE_ID_FOR_BAR_STAFF"
}
```

🧠 How It Works

Events are posted as rich embeds
Emojis act as signup toggles
The embed reflects current signups instantly
Data is saved to scheduled_events.json
Reminders are scheduled when the event is created

📦 Requirements

Node.js v18+
discord.js v14
luxon
dotenv
Install dependencies:
```
npm install
```
Run the bot:
```
node bot.js
```

📝 Notes

All times are EST

Emoji removal = signup removal

Cancelled events are visually marked and frozen

scheduled_events.json must remain in the root directory