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

**src/utils/helpers.js**
- Permission checking
- Time formatting
- Blackout date validation
- Embed building
- Status management

### Services

**src/services/autoPost.js**
- Automated shift posting
- Duplicate detection
- Schedule management
- Open day validation

**src/services/backupAlert.js**
- Backup position alerts
- Role mention logic
- Multi-tier alerting (2hr, 5min, start)

### Commands

Each command file exports a handler function or object:

**createEvent.js** - Modal-based event creation
**mySignups.js** - User signup lookup
**nextShift.js** - Next shift display
**areWeOpen.js** - Open day checker
**cancelEvent.js** - Event cancellation
**editEventTime.js** - Time editing
**setStatus.js** - Custom bot status
**statusClear.js** - Reset to default status
**blackout.js** - Blackout date management
**roleManagement.js** - Enable/disable roles
**help.js** - Command documentation
**refresh.js** - Embed refresh
**repost.js** - Event reposting

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

services/*
  ├── utils/helpers.js
  ├── utils/storage.js
  └── utils/constants.js
```

## Installation

1. Install dependencies: `npm install`
2. Configure `.env` file
3. Configure `config.json`
4. Run: `node index.js`

## Adding New Commands

1. Create command file in `src/commands/`
2. Export handler function
3. Add command definition to `src/commands/register.js`
4. Add route in `src/events/interactionCreate.js`