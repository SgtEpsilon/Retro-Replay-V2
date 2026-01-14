# Retro Replay V2

# 🎉 Discord Event Signup Bot

A feature-rich **Discord.js v14** bot for managing staff signups for events using **reaction roles**, **embeds**, and **modals**. Designed for clubs, bars, RP servers, or any community that needs organized event scheduling and role signups.

---

## ✨ Features

- 📅 **Event Creation via Modal**
  - Create events with title & date/time (EST)
  - Uses Discord buttons + modals for clean UX

- ✅ **Reaction-Based Signups**
  - Users sign up by reacting with role emojis
  - Automatic embed updates when reactions change

- 👥 **Role-Based Permissions**
  - Only approved roles can create or repost events

- 🔁 **Event Reposting**
  - Quickly repost the most recent event

- 🕒 **Timezone-Aware**
  - Events stored in EST
  - Displays relative countdown to bar opening

- 💾 **Persistent Storage**
  - Events are saved in `events.json`
  - Automatically reloads on restart

- 🎮 **Rotating Rich Presence**
  - Alternates bot status messages every 30 seconds

- ⚡ **Prefix + Slash Commands**
  - Supports both `!commands` and `/commands`

---

## 🧠 How It Works

- Events are posted as **embeds**
- Users react with emojis to sign up for staff roles
- The embed updates live to reflect signups
- All data is persisted locally in a JSON file

---

## 📦 Requirements

- **Node.js** v18+
- **Discord.js** v14+
- A Discord bot token

---

## 📁 Project Structure

```text
.
├── bot.js              # Main bot file
├── config.json         # Bot configuration
├── events.json         # Stored events (auto-generated)
├── package.json
└── README.md
```
⚙️ Setup & Installation
1️⃣ Clone the Repository
```text
git clone https://github.com/yourusername/discord-event-bot.git
cd discord-event-bot
```
2️⃣ Install Dependencies
```text
npm install discord.js
```
3️⃣ Create config.json
```text
{
  "token": "YOUR_BOT_TOKEN",
  "signupChannelId": "CHANNEL_ID_FOR_EVENTS",
  "openDays": ["Friday", "Saturday"],
  "eventCreatorRoles": [
    "Owwner"
    "Head Manager",
    "Manager"
  ]
}
```
4️⃣ Run the Bot
```text
node bot.js
```
🧾 Commands
Prefix Commands (!)
```text
| Command        | Description               |
| -------------- | ------------------------- |
| `!help`        | Show available commands   |
| `!opendays`    | Display open days         |
| `!createevent` | Open event creation modal |
| `!repost`      | Repost most recent event  |
```

=======
=======
>>>>>>> Stashed changes
# Retro Replay Bot

![Retro Replay Bot Cheat Sheet](./Retro_Rep.png)

Retro Replay Bot is a Discord bot designed for managing events, staff signups, and open day notifications. It supports both **text commands** and **slash commands** with full modals for event creation.

---

## **Quick Command Cheat Sheet**

### **1️⃣ Text Commands (`!`)**

| Command | Description |
|---------|-------------|
| `!help` / `!h` | Shows all available commands. |
| `!opendays` | Displays open days, today’s status (OPEN/CLOSED), and the next open day countdown. |
| `!createevent` | Opens a form to create a new event (restricted to `eventCreatorRoles`). |

### **2️⃣ Slash Commands (`/`)**

| Command | Description |
|---------|-------------|
| `/help` | Shows all commands. |
| `/opendays` | Shows open days, today’s status, and the next open day. |
| `/createevent` | Opens a modal to create a new event (restricted to `eventCreatorRoles`). |

### **3️⃣ Event Creation (Modal Form)**

Only members with roles in `eventCreatorRoles` can create events.

**Steps:**

1. Run `/createevent` or `!createevent`.
2. Fill in the modal fields:
   - **Event Title:** Name of your event.
   - **Event Date:** Use `DD-MM-YYYY HH:MM` format (Example: `14-01-2026 18:30`).
3. Submit → The bot posts the event in the **Signup Channel**.

### **4️⃣ Event Signup**

- The bot automatically adds reaction emojis for each role:

| Emoji | Role |
|-------|------|
| 1️⃣ | Active Manager |
| 2️⃣ | Backup Manager |
| 3️⃣ | Bouncer |
| 4️⃣ | Bartender |
| 5️⃣ | Dancer |
| 6️⃣ | DJ |

- Users react to sign up. The embed updates automatically.

### **5️⃣ Cancel Event**

- Only `eventCreatorRoles` can cancel an event.
- Click the **Cancel Event** button in the embed.
- Once canceled:
  - Embed turns red.
  - Button is disabled.
  - Signups are frozen.

### **6️⃣ Open Days**

- Shows if today is open or closed.
- Displays countdown to next open day.

Example:

📅 Open Days: Tuesday, Friday, Saturday, Sunday
🕒 Today is: <t:1705183200:F>
❌ CLOSED TODAY
⏳ Next Open Day: <t:1705442400:R> (<t:1705442400:F>)


### **7️⃣ Notes**

- All times are in **EST** (America/New_York).  
- Event embeds **update automatically** with signups.  
- Date format for events: **DD-MM-YYYY HH:MM**.

---

## **Installation & Setup**

1. Clone this repository.
2. Install dependencies:
3. create .env file
```
BOT_TOKEN=YOUR_BOT_TOKEN
CLIENT_ID=BOT_ID
```
4.
```bash
npm install discord.js
```
5. Run the bot:
```
node bot.js
```
