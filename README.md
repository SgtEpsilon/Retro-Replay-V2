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

