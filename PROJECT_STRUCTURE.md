# Retro Replay Bot - Modularized Structure

## File Structure

```
retro-replay-bot/
├── index.js                          # Main entry point
├── config.json                       # Bot configuration
├── .env                              # Environment variables
├── package.json                      # Dependencies
│
├── scheduled_events.json             # Event data storage
├── auto_posted.json                  # Auto-post tracking
├── blackout_dates.json              # Blackout dates
├── shift_logs.json                  # Shift history
├── disabled_roles.json              # Disabled roles
│
└── src/
    ├── client.js                    # Discord client initialization
    │
    ├── utils/
    │   ├── constants.js             # Configuration constants
    │   ├── storage.js               # Data persistence & timers
    │   └── helpers.js               # Helper functions
    │
    ├── services/
    │   ├── autoPost.js              # Auto-posting service
    │   └── backupAlert.js           # Backup alert service
    │
    ├── commands/
    │   ├── register.js              # Command registration
    │   ├── createEvent.js           # /createevent
    │   ├── mySignups.js             # /mysignups
    │   ├── nextShift.js             # /nextshift
    │   ├── weeklySchedule.js        # /weeklyschedule
    │   ├── generate.js              # /generate
    │   ├── post.js                  # /post
    │   ├── areWeOpen.js             # /areweopen
    │   ├── cancelEvent.js           # /cancelevent
    │   ├── editEventTime.js         # /editeventtime
    │   ├── setStatus.js             # /setstatus
    │   ├── statusClear.js           # /statusclear
    │   ├── blackout.js              # /addblackout, /removeblackout, /listblackouts
    │   ├── roleManagement.js        # /enable, /disable
    │   ├── help.js                  # /help
    │   ├── refresh.js               # /refresh
    │   └── repost.js                # /repost
    │
    └── events/
        ├── interactionCreate.js     # Command routing
        ├── reactionAdd.js           # Reaction handler (signup)
        └── reactionRemove.js        # Reaction handler (unsignup)
```

## Module Descriptions

### Core Files

**index.js**
- Application entry point
- Initializes bot and loads all modules
- Registers event handlers
- Starts auto-post scheduler

**config.json**
- Open days configuration (days the bar is open)
- Event creator roles (permissions for manual event management)
- Timezone settings
- Auto-post hour (when to generate weekly schedule)
- Shift start hour (what time shifts begin)

**src/client.js**
- Creates and exports Discord client instance
- Configures intents and partials

### Utils

**src/utils/constants.js**
- Centralized configuration
- Environment variable exports
- Role configuration
- File paths

**src/utils/storage.js**
- Data persistence (JSON files)
- Timer management (reminders, alerts)
- CRUD operations for events
- Load/save functions
- In-memory storage objects (events, autoPosted, blackoutDates, etc.)

**src/utils/helpers.js**
- Permission checking (`hasEventPermission`)
- Time formatting
- Blackout date validation
- Embed building
- Status management

### Services

**src/services/autoPost.js**
- **Weekly schedule data generation** - Creates event data for the entire week (Monday 00:00)
- **Scheduled event posting** - Posts scheduled events to Discord (Daily 4 PM EST)
- **Open day filtering** - Only creates shifts for days in config.json openDays
- **Hourly checks** - Verifies schedule exists, generates if missing, posts scheduled events
- Duplicate detection
- Blackout date validation

**src/services/backupAlert.js**
- Backup position alerts
- Role mention logic
- Multi-tier alerting (2hr, 5min, start)

### Commands

Each command file exports a handler function or object:

**createEvent.js** - Modal-based event creation (saves as scheduled, not posted immediately)
**mySignups.js** - User signup lookup
**nextShift.js** - Next shift display
**weeklySchedule.js** - View all events for the next 7 days (shows both scheduled and posted)
**generate.js** - Manually generate weekly schedule data (saves to scheduled_events.json)
**post.js** - Manually post scheduled events to Discord (interactive select menu, restricted to eventCreatorRoles)
**areWeOpen.js** - Open day checker
**cancelEvent.js** - Event cancellation
**editEventTime.js** - Time editing
**setStatus.js** - Custom bot status
**statusClear.js** - Reset to default status
**blackout.js** - Blackout date management
**roleManagement.js** - Enable/disable roles
**help.js** - Command documentation
**refresh.js** - Embed refresh
**repost.js** - Event reposting (only works with posted events, restricted to eventCreatorRoles)

### Events

**interactionCreate.js**
- Routes slash commands to handlers
- Handles modals
- Error handling

**reactionAdd.js**
- Signup reaction handling
- Role conflict resolution
- Disabled role checking

**reactionRemove.js**
- Unsignup reaction handling
- Embed updates

## Benefits of This Structure

1. **Separation of Concerns**: Each module has a single, clear responsibility
2. **Maintainability**: Easy to locate and modify specific functionality
3. **Testability**: Individual modules can be tested in isolation
4. **Scalability**: New commands/features can be added without touching existing code
5. **Readability**: Smaller files are easier to understand and navigate
6. **Reusability**: Utility functions can be shared across commands

## Dependencies Between Modules

```
index.js
  ├── client.js
  ├── commands/register.js
  ├── utils/storage.js
  ├── services/autoPost.js
  ├── utils/helpers.js
  └── events/* (auto-imported)

events/interactionCreate.js
  └── commands/* (all command handlers)

commands/*
  ├── utils/helpers.js
  ├── utils/storage.js
  ├── utils/constants.js
  └── client.js

services/autoPost.js
  ├── config.json (direct import)
  ├── utils/constants.js
  ├── utils/storage.js
  └── utils/helpers.js

services/backupAlert.js
  ├── utils/helpers.js
  ├── utils/storage.js
  └── utils/constants.js
```

## How The System Works

### Event Scheduling Flow

1. **Schedule Generation (Monday 00:00)**
   - Bot creates event data for the entire week
   - Events saved to `scheduled_events.json` with `scheduled: true` flag
   - Events have no `messageId` (not posted to Discord yet)
   - Events appear in `/weeklyschedule` command

2. **Event Posting (Daily 4 PM EST)**
   - Bot checks for events with `scheduled: true` and no `messageId`
   - Posts those events to Discord channel
   - Updates events with Discord `messageId`
   - Sets `scheduled: false`
   - Sets up reactions and timers

3. **Manual Operations**
   - `/createevent` - Creates a single scheduled event (not posted immediately)
   - `/generate` - Manually triggers weekly schedule generation
   - `/post` - Manually posts scheduled events before 4 PM (interactive menu)
   - `/weeklyschedule` - View all upcoming events (scheduled and posted)
   - `/repost` - Reposts an already-posted event (creates new message)

### Event States

- **Scheduled** - `scheduled: true`, `messageId: null` (in JSON, not in Discord)
- **Posted** - `scheduled: false`, `messageId: "123456"` (in Discord with reactions)
- **Cancelled** - `cancelled: true` (soft delete)

### Permissions

Commands restricted to `eventCreatorRoles` (Owner, Head Manager, Manager):
- `/createevent`
- `/generate`
- `/post`
- `/cancelevent`
- `/editeventtime`
- `/repost`
- `/setstatus`
- `/statusclear`
- `/addblackout`
- `/removeblackout`
- `/enable`
- `/disable`
- `/refresh`

Public commands (any user):
- `/mysignups`
- `/nextshift`
- `/weeklyschedule`
- `/areweopen`
- `/listblackouts`
- `/help`

## Installation

1. Install dependencies: `npm install`
2. Configure `.env` file with Discord tokens and channel IDs
3. Configure `config.json` with open days, timezone, and hours
4. Run: `node index.js`

## Adding New Commands

1. Create command file in `src/commands/`
2. Export handler function
3. Add command definition to `src/commands/register.js`
4. Add route in `src/events/interactionCreate.js`

## Configuration

### config.json
```json
{
  "openDays": ["Tuesday", "Friday", "Saturday", "Sunday"],
  "eventCreatorRoles": ["Owner", "Head Manager", "Manager"],
  "timezone": "America/New_York",
  "autoPostHour": 0,
  "shiftStartHour": 21
}
```

- **openDays**: Days when the bar is open (shifts will only be created for these days)
- **eventCreatorRoles**: Roles allowed to manually create/manage events
- **timezone**: Timezone for all date/time operations
- **autoPostHour**: Hour (0-23) when weekly schedule data is generated (0 = midnight)
- **shiftStartHour**: Hour (0-23) when shifts begin each day (21 = 9 PM)

### Automated Schedule

- **Monday 00:00** - Generate event data for the week
- **Daily 16:00 (4 PM EST)** - Post scheduled events to Discord
- **Every 10 minutes** - Check if schedule generation or posting is needed