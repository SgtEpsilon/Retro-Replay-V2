# Retro Replay Bot V1.0.2 - Modularized Structure

## 🛡️ What's New in V1.0.2

**Enterprise-Grade Data Protection:**
- All files now use atomic writes with automatic backups
- `.backup` files created automatically for all data files
- Live reference system ensures data consistency
- Immediate persistence for all operations
- Graceful shutdown with complete data preservation

---

## File Structure

```
retro-replay-bot/
├── index.js                          # 🛡️ Main entry point with graceful shutdown & auto-save
├── config.json                       # Bot configuration
├── .env                              # Environment variables (KEEP SECRET!)
├── package.json                      # Dependencies
│
├── scheduled_events.json             # 🛡️ Event data storage (atomic writes)
├── scheduled_events.json.backup      # 🛡️ AUTO-GENERATED: Event backup
├── auto_posted.json                  # 🛡️ Auto-post tracking (atomic writes)
├── auto_posted.json.backup           # 🛡️ AUTO-GENERATED: Auto-post backup
├── blackout_dates.json               # 🛡️ Blackout dates (atomic writes)
├── blackout_dates.json.backup        # 🛡️ AUTO-GENERATED: Blackout backup
├── shift_logs.json                   # 🛡️ Shift history (atomic writes)
├── shift_logs.json.backup            # 🛡️ AUTO-GENERATED: Shift log backup
├── disabled_roles.json               # 🛡️ Disabled roles (atomic writes)
├── disabled_roles.json.backup        # 🛡️ AUTO-GENERATED: Disabled roles backup
│
└── src/
    ├── client.js                     # Discord client initialization
    │
    ├── utils/
    │   ├── constants.js              # Configuration constants
    │   ├── storage.js                # 🛡️ HARDENED: Atomic writes, backups, live references
    │   └── helpers.js                # Helper functions
    │
    ├── services/
    │   ├── autoPost.js               # 🛡️ Auto-posting service (immediate persistence)
    │   └── backupAlert.js            # Backup alert service
    │
    ├── commands/
    │   ├── register.js               # Command registration
    │   ├── createEvent.js            # 🛡️ /createevent (save validation & rollback)
    │   ├── mySignups.js              # 🛡️ /mysignups (live references)
    │   ├── nextShift.js              # 🛡️ /nextshift (live references)
    │   ├── weeklySchedule.js         # 🛡️ /weeklyschedule (live references)
    │   ├── generate.js               # 🛡️ /generate (live references)
    │   ├── post.js                   # 🛡️ /post (atomic saves)
    │   ├── areWeOpen.js              # /areweopen
    │   ├── cancelEvent.js            # 🛡️ /cancelevent (immediate persistence)
    │   ├── editEventTime.js          # 🛡️ /editeventtime (save validation & rollback)
    │   ├── setStatus.js              # /setstatus
    │   ├── statusClear.js            # /statusclear
    │   ├── blackout.js               # /addblackout, /removeblackout, /listblackouts
    │   ├── roleManagement.js         # /enable, /disable
    │   ├── help.js                   # /help
    │   ├── refresh.js                # 🛡️ /refresh (live references)
    │   └── repost.js                 # 🛡️ /repost (atomic saves)
    │
    └── events/
        ├── interactionCreate.js      # Command routing
        ├── reactionAdd.js            # 🛡️ Reaction handler (instant signup persistence)
        └── reactionRemove.js         # 🛡️ Reaction handler (instant removal persistence)
```

---

## Module Descriptions

### Core Files

**index.js** 🛡️
- Application entry point
- Initializes bot and loads all modules
- Registers event handlers
- Starts auto-post scheduler
- **NEW**: Graceful shutdown handlers (SIGINT, SIGTERM)
- **NEW**: Auto-save system (every 5 minutes)
- **NEW**: Uncaught exception handling with data save
- **NEW**: Uses live reference getters from storage.js

**config.json**
- Open days configuration (days the bar is open)
- Event creator roles (permissions for manual event management)
- Timezone settings
- Auto-post hour (when to generate weekly schedule)
- Shift start hour (what time shifts begin)

**src/client.js**
- Creates and exports Discord client instance
- Configures intents and partials

---

### Utils

**src/utils/constants.js**
- Centralized configuration
- Environment variable exports
- Role configuration
- File paths

**src/utils/storage.js** 🛡️ **COMPLETELY REWRITTEN**
- **Atomic file writes** - Write to `.tmp` files first, then rename
- **Automatic backups** - Creates `.backup` files before every save
- **Backup recovery** - Auto-restores from backup if main file corrupted
- **Live reference system** - Exports getter functions instead of static objects:
  - `getEvents()` - Returns live reference to events
  - `getAutoPosted()` - Returns live reference to auto-posted tracking
  - `getBlackoutDates()` - Returns live reference to blackout dates
  - `getShiftLogs()` - Returns live reference to shift logs
  - `getDisabledRoles()` - Returns live reference to disabled roles
- **Save validation** - All save functions return success/failure status
- **Emergency save** - `saveAll()` function saves all data files at once
- **Error logging** - Detailed console output for troubleshooting
- Timer management (reminders, alerts)
- CRUD operations for events

**src/utils/helpers.js**
- Permission checking (`hasEventPermission`)
- Time formatting
- Blackout date validation
- Embed building
- Status management

---

### Services

**src/services/autoPost.js** 🛡️
- **Weekly schedule data generation** - Creates event data for the entire week (Monday 00:00)
- **Scheduled event posting** - Posts scheduled events to Discord (Daily 4 PM EST)
- **Open day filtering** - Only creates shifts for days in config.json openDays
- **Hourly checks** - Verifies schedule exists, generates if missing, posts scheduled events
- Duplicate detection
- Blackout date validation
- **NEW**: Uses live reference getters (`getEvents()`, `getAutoPosted()`)
- **NEW**: Immediate save after schedule generation with validation
- **NEW**: Immediate save after posting events with validation
- **NEW**: Returns event count for verification
- **NEW**: Detailed logging of all operations

**src/services/backupAlert.js**
- Backup position alerts
- Role mention logic
- Multi-tier alerting (2hr, 5min, start)

---

### Commands

Each command file exports a handler function or object. **V1.0.2 changes marked with 🛡️**

**createEvent.js** 🛡️
- Modal-based event creation (saves as scheduled, not posted immediately)
- **NEW**: Uses `getEvents()` for live reference
- **NEW**: Immediate save after creation with validation
- **NEW**: Rollback on save failure
- **NEW**: User notification on save failure
- **NEW**: Detailed logging of created events

**mySignups.js** 🛡️
- User signup lookup
- **NEW**: Uses `getEvents()` for live reference
- **UPDATED**: Now reads from live data ensuring accurate signup display

**nextShift.js** 🛡️
- Next shift display
- **NEW**: Uses `getEvents()` for live reference
- **FIXED**: Removed duplicate declaration error

**weeklySchedule.js** 🛡️
- View all events for the next 7 days (shows both scheduled and posted)
- **NEW**: Uses `getEvents()` for live reference
- **UPDATED**: Displays live event data with accurate status

**generate.js** 🛡️
- Manually generate weekly schedule data (saves to scheduled_events.json)
- **NEW**: Uses `getEvents()` for live reference in all helper functions
- **UPDATED**: Shows accurate event counts and status

**post.js** 🛡️
- Manually post scheduled events to Discord (interactive select menu, restricted to eventCreatorRoles)
- **NEW**: Uses `getEvents()` for live reference
- **NEW**: Immediate save after posting with validation
- **NEW**: Batch save optimization for "Post All"
- **NEW**: User notification on save failure
- **NEW**: Detailed logging with message IDs

**areWeOpen.js**
- Open day checker

**cancelEvent.js** 🛡️
- Event cancellation
- **NEW**: Uses `getEvents()` for live reference
- **NEW**: Immediate save after cancellation with validation
- **NEW**: User notification on save failure
- **NEW**: Component cleanup (removes buttons)
- **NEW**: Detailed logging

**editEventTime.js** 🛡️
- Time editing
- **NEW**: Uses `getEvents()` for live reference
- **NEW**: Immediate save after edit with validation
- **NEW**: Rollback on save failure (reverts to old time)
- **NEW**: User notification on save failure
- **NEW**: Detailed logging showing old and new times

**setStatus.js**
- Custom bot status

**statusClear.js**
- Reset to default status

**blackout.js**
- Blackout date management

**roleManagement.js**
- Enable/disable roles

**help.js**
- Command documentation

**refresh.js** 🛡️
- Embed refresh
- **NEW**: Uses `getEvents()` for live reference
- **FIXED**: Removed duplicate declaration error

**repost.js** 🛡️
- Event reposting (only works with posted events, restricted to eventCreatorRoles)
- **NEW**: Uses `getEvents()` for live reference
- **NEW**: Immediate save after reposting with validation
- **NEW**: User notification on save failure
- **NEW**: Detailed logging showing old and new message IDs

---

### Events

**interactionCreate.js**
- Routes slash commands to handlers
- Handles modals
- Error handling

**reactionAdd.js** 🛡️
- Signup reaction handling
- Role conflict resolution
- Disabled role checking
- **NEW**: Uses `getEvents()` and `getDisabledRoles()` for live references
- **NEW**: Immediate save after signup with validation
- **NEW**: User DM notification on save failure
- **NEW**: Detailed error logging with context
- **NEW**: Embed update doesn't fail operation if save succeeded

**reactionRemove.js** 🛡️
- Unsignup reaction handling
- Embed updates
- **NEW**: Uses `getEvents()` for live reference
- **NEW**: Immediate save after removal with validation
- **NEW**: User DM notification on save failure
- **NEW**: Detailed error logging with context
- **NEW**: Embed update doesn't fail operation if save succeeded

---

## 🛡️ Data Protection Architecture

### How Data is Protected

```
User Action (e.g., signup)
    ↓
Update in-memory object (e.g., events[id].signups)
    ↓
saveEvents() called immediately
    ↓
Write to scheduled_events.json.tmp (temporary file)
    ↓
Copy scheduled_events.json → scheduled_events.json.backup
    ↓
Rename scheduled_events.json.tmp → scheduled_events.json (atomic)
    ↓
Return success/failure status
    ↓
On failure: Rollback in-memory changes, notify user
On success: Operation complete, data persisted
```

### Recovery Process

```
Bot starts
    ↓
Load scheduled_events.json
    ↓
Parse JSON
    ↓
Success? → Use data
    ↓
Failure? → Load scheduled_events.json.backup
    ↓
Parse backup JSON
    ↓
Success? → Restore from backup, replace main file
    ↓
Failure? → Use fallback (empty object), log error
```

### Graceful Shutdown

```
User presses Ctrl+C (SIGINT)
    ↓
Bot receives signal
    ↓
saveAll() called
    ↓
Save all data files atomically with backups
    ↓
Destroy Discord client
    ↓
Exit process cleanly
```

---

## Benefits of This Structure

1. **Separation of Concerns**: Each module has a single, clear responsibility
2. **Maintainability**: Easy to locate and modify specific functionality
3. **Testability**: Individual modules can be tested in isolation
4. **Scalability**: New commands/features can be added without touching existing code
5. **Readability**: Smaller files are easier to understand and navigate
6. **Reusability**: Utility functions can be shared across commands
7. **🛡️ Data Integrity**: Atomic writes prevent corruption
8. **🛡️ Disaster Recovery**: Automatic backups enable instant recovery
9. **🛡️ Zero Data Loss**: Immediate persistence ensures no lost changes
10. **🛡️ Error Transparency**: Users and admins notified of save failures

---