# 🎮 Retro Replay Discord Bot V1.0.3

A modular, production-hardened Discord bot for managing **shift signups, events, schedules, and staff coordination** for Retro Replay.

This README documents the current stable release.

---

## 📦 Current Version

### **V1.0.3 – Status & Backup Reliability Update**

This release focuses on **stability, clarity, and reliability**, with no breaking changes.

---

## 🆕 What’s New in V1.0.3

### ✅ Status System Improvements

* **NEW**: Centralized `statusManager` – a single source of truth for all bot statuses
* **NEW**: Rotating preset bot statuses (static cycle, non time-based)
* **NEW**: Easy-to-edit `statusPresets.js` file (no Discord enums or logic mixed in)
* **IMPROVED**: `/setstatus` safely pauses automatic status cycling
* **IMPROVED**: `/statusclear` cleanly resumes preset rotation
* **NEW**: `/statusreload` hot-reloads status presets without restarting the bot

### ✅ Backup Alert Fixes

* **FIXED**: Backup alerts now schedule for **newly created events**, not just on startup
* **FIXED**: Disabled roles are sourced **exclusively** from `disabled_roles.json`
* **FIXED**: Silent failures caused by invalid or stale role imports
* **IMPROVED**: Backup pings reliably respect enabled/disabled role state

### ✅ Internal Reliability Improvements

* **REFACTOR**: Removed duplicate timers and conflicting intervals
* **REFACTOR**: Clear separation between editable content and core logic
* **IMPROVED**: Startup order ensures alerts and statuses initialize correctly

➡️ **No migration required. No breaking changes.**

---

## 🧠 Core Features

* 📅 Event & shift creation via slash commands
* 🧾 Reaction-based signup tracking (persistent across restarts)
* 🔁 Event reposting and cancellation
* 🚨 Automatic backup staff alerts for missing roles
* 👥 Role enable/disable system for backup alerts
* 📊 Weekly schedule generation and posting
* 🟢 Rotating bot status system with manual overrides

---

## 🛡️ Data Protection Guarantees

All data systems are designed to be **crash-safe and corruption-resistant**:

* Atomic file writes for all JSON data
* Automatic `.backup` files on every save
* Live-reference storage model (no stale imports)
* Automatic rollback on failed writes
* Graceful shutdown support (`Ctrl + C` safe)
* Auto-save safety net every 5 minutes

These protections were introduced in **V1.0.2** and remain unchanged.

---

## 📁 Project Structure (High-Level)

```
retro-replay-bot/
├── index.js                  # Bot entry point
├── config.json               # Bot configuration
├── disabled_roles.json       # Disabled backup roles (source of truth)
├── scheduled_events.json     # Event storage (atomic)
├── src/
│   ├── commands/             # Slash commands
│   ├── events/               # Discord event handlers
│   ├── services/             # Background services (autoPost, backupAlert)
│   └── utils/                # Storage, helpers, status manager
```

A full, detailed structure is documented separately for contributors.

---

## ⚙️ Status System Overview

* Statuses rotate automatically from `statusPresets.js`
* One interval only (no conflicts)
* Manual override supported

### Commands

* `/setstatus` → Set a manual status (pauses rotation)
* `/statusclear` → Clear manual status (resumes rotation)
* `/statusreload` → Reload preset statuses live

---

## 🚨 Backup Alert System Overview

* Alerts fire when required roles are missing from an event
* Disabled roles are controlled via `/enable` and `/disable`
* State is stored in `disabled_roles.json`
* Alerts schedule:

  * On bot startup
  * On event creation

---

## 🚀 Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env`:

   ```env
   BOT_TOKEN=your_token_here
   SIGNUP_CHANNEL_ID=...
   STAFF_CHAT_CHANNEL_ID=...
   ```

3. Configure `config.json`

4. Start the bot:

   ```bash
   node index.js
   ```

---

## 🧾 Version History

### V1.0.3 (2025-01-18)

* Status system overhaul (static rotating presets)
* Backup alert reliability fixes
* Centralized status manager
* Hot-reloadable status presets

### V1.0.2 (2025-01-17)

* Full data protection overhaul
* Atomic writes and backups
* Persistent signups and events

---

## 🧩 Future Roadmap

* Event-aware statuses
* Countdown-based alerts
* Role ID–based configuration
* Admin diagnostics commands

---

## ✅ Stability Notice

This version is **production-safe** and designed for long-running uptime.

If you encounter issues, enable debug logging or review backup files before restarting.

---

© Retro Replay – Internal Bot System
