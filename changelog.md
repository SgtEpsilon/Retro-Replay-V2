# 📜 Changelog

All notable changes to the **Retro Replay Discord Bot** are documented in this file.

This project follows **semantic versioning** in the `V1.0.x` series. There are **no breaking changes** between patch versions unless explicitly stated.

---

## [V1.0.3] – 2025-01-18

### Status & Backup Reliability Update

### ✨ Added

* Centralized **`statusManager`** as the single source of truth for bot statuses
* Static rotating bot status system using editable presets
* **`/statusreload`** command to hot-reload status presets without restart

### 🔧 Improved

* `/setstatus` now safely pauses automatic status rotation
* `/statusclear` reliably resumes status cycling
* Clear separation between editable preset content and logic
* Startup initialization order for services and status handling

### 🐛 Fixed

* Backup alerts now schedule for **newly created events**
* Disabled roles are read **exclusively** from `disabled_roles.json`
* Silent backup alert failures caused by invalid or stale imports
* Duplicate timers and conflicting intervals

### 🛡️ Stability

* No breaking changes
* No migration required
* Fully compatible with all V1.0.2 data files

---

## [V1.0.2] – 2025-01-17

### Data Protection & Persistence Overhaul

### ✨ Added

* Atomic file writes for all JSON storage
* Automatic `.backup` file creation
* Live-reference storage system
* Graceful shutdown saving (`Ctrl + C` safe)
* Auto-save safety net every 5 minutes

### 🐛 Fixed

* Signup persistence across restarts
* Event persistence across crashes
* Message ID retention for reposted events
* Race conditions during file writes

### 🛡️ Stability

* Major reduction in data loss risk
* No breaking changes

---

## [V1.0.1] – 2025-01-15

### Quality & Command Improvements

### ✨ Added

* `/mysignups` command
* `/cancelevent` command
* Event time editing support

### 🐛 Fixed

* Repost command inconsistencies
* Event cancellation edge cases

---

## [V1.0.0] – Initial Release

* Core event creation and signup system
* Reaction-based role signups
* Manual schedule posting

---

## 🔖 Version Alignment Notes

To keep versions aligned across the project:

* **README.md** → Current Version: `V1.0.3`
* **package.json** → Set `version` to `1.0.3`
* **Project Structure docs** → Reference `V1.0.3`
* **Code comments** → Use `V1.0.3` where versioned

---

✅ This changelog reflects the current production state of the bot.
