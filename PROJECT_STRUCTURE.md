# Retro Replay Bot V1.1.0 – Modularized Structure (Updated)

## 🆕 What’s New in V1.1.0

**Status System Improvements (Non Time-Based)**

* Centralized `statusManager` (single source of truth)
* Rotating preset bot statuses (static cycle)
* Easy-to-edit preset file (no logic mixed with content)
* Manual status override with safe pause / resume
* Hot-reload of status presets (`/statusreload`)

**Backup Alert Reliability Fixes**

* Disabled roles are now sourced **exclusively** from `disabled_roles.json`
* Backup alerts schedule for **newly created events** (not just startup)
* Fixed silent failures caused by invalid imports

All existing **🛡️ data-protection guarantees remain unchanged**.

---

## File Structure

```
retro-replay-bot/
├── index.js                          # 🛡️ Main entry point + status init + alert scheduling
├── config.json                       # Bot configuration
├── .env                              # Environment variables (KEEP SECRET!)
├── package.json                      # Dependencies
│
├── scheduled_events.json             # 🛡️ Event data storage (atomic writes)
├── scheduled_events.json.backup      # 🛡️ AUTO-GENERATED
├── auto_posted.json                  # 🛡️ Auto-post tracking
├── auto_posted.json.backup
├── blackout_dates.json               # 🛡️ Blackout dates
├── blackout_dates.json.backup
├── shift_logs.json                   # 🛡️ Shift history
├── shift_logs.json.backup
├── disabled_roles.json               # 🛡️ Disabled roles (SOURCE OF TRUTH)
├── disabled_roles.json.backup
│
└── src/
    ├── client.js                     # Discord client initialization
    │
    ├── utils/
    │   ├── constants.js              # Role config, env exports, file paths
    │   ├── storage.js                # 🛡️ Atomic writes, backups, live references
    │   ├── helpers.js                # Permissions, formatting, embeds
    │   ├── statusManager.js          # ⭐ Central status controller (static cycling)
    │   └── statusPresets.js          # ⭐ Easy-to-edit rotating status presets
    │
    ├── services/
    │   ├── autoPost.js               # 🛡️ Weekly schedule generation & posting
    │   └── backupAlert.js            # 🛡️ Backup pings (fixed disabled role logic)
    │
    ├── commands/
    │   ├── register.js
    │   ├── createEvent.js            # 🛡️ Schedules reminders + backup alerts
    │   ├── setStatus.js              # Manual status override (pauses cycling)
    │   ├── statusClear.js            # Clears override (resumes cycling)
    │   ├── statusReload.js           # ⭐ Hot-reloads status presets
    │   ├── mySignups.js
    │   ├── nextShift.js
    │   ├── weeklySchedule.js
    │   ├── generate.js
    │   ├── post.js
    │   ├── areWeOpen.js
    │   ├── cancelEvent.js
    │   ├── editEventTime.js
    │   ├── blackout.js
    │   ├── roleManagement.js         # /enable, /disable (writes disabled_roles.json)
    │   ├── help.js
    │   ├── refresh.js
    │   └── repost.js
    │
    └── events/
        ├── interactionCreate.js      # Command + modal routing
        ├── reactionAdd.js             # 🛡️ Signup persistence
        └── reactionRemove.js          # 🛡️ Unsignup persistence
```

---

## ⭐ Status System (Current Architecture)

### Runtime Flow

```
Bot Startup
↓
initStatus(client)
├─ Custom status saved?
│   └─ YES → Restore + pause cycling
└─ NO → Start rotating preset cycle
```

### Key Files

**statusManager.js**

* Single interval controller (no duplicates)
* `initStatus`, `pauseCycle`, `resumeCycle`
* Preset hot-reload support

**statusPresets.js**

* Human-editable rotating statuses
* No Discord enums or logic

### Commands

* `/setstatus` → pause cycling, manual override
* `/statusclear` → resume preset cycling
* `/statusreload` → reload presets without restart

---

## 🛡️ Backup Alert System (Fixed)

* Disabled roles loaded **only** via `getDisabledRoles()`
* Source of truth: `disabled_roles.json`
* Alerts schedule:

  * On bot startup
  * On `/createevent`
* No silent failures from bad imports

---

## 🛡️ Data Protection Architecture (Unchanged)

All V1.0.2 guarantees still apply:

* Atomic writes
* Automatic backups
* Live references
* Rollback on failure
* Graceful shutdown with `saveAll()`

---

## Summary of Benefits

1. **Clean status system** – predictable rotating presets
2. **Zero-conflict timers** – one status interval, one source of truth
3. **Live-editable presets** – no restarts required
4. **Reliable backup alerts** – disabled roles respected correctly
5. **Future-proof** – time-based or event-based statuses can be added later

---

✅ **Project structure updated to remove time-based status logic while preserving all fixes.**
