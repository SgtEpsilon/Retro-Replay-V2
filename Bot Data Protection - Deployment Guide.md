# 🛡️ Bot Data Protection - Deployment Guide

## 📋 Pre-Deployment Checklist

### 1. **Create Backups** (CRITICAL - Do this first!)
```bash
# Backup all source files
cp -r src src.backup.$(date +%Y%m%d_%H%M%S)

# Backup all data files
cp scheduled_events.json scheduled_events.json.backup.$(date +%Y%m%d_%H%M%S)
cp auto_posted.json auto_posted.json.backup.$(date +%Y%m%d_%H%M%S)

# Or use this one-liner for everything
tar -czf backup_$(date +%Y%m%d_%H%M%S).tar.gz src/ *.json
```

### 2. **Verify You Have All Files**
- ✅ storage.js (updated)
- ✅ index.js (updated)
- ✅ createEvent.js (updated)
- ✅ cancelEvent.js (updated)
- ✅ editEventTime.js (updated)
- ✅ autoPost.js (updated)
- ✅ reactionAdd.js (updated)
- ✅ reactionRemove.js (updated)
- ✅ post.js (updated)
- ✅ repost.js (updated)
- ✅ refresh.js (updated)
- ✅ nextShift.js (updated)

---

## 🚀 Deployment Steps

### Step 1: Update Core Storage Module
Replace `src/utils/storage.js` with the new version.

**Key Changes:**
- Atomic file writes with `.tmp` files
- Automatic backup creation (`.backup` files)
- Backup recovery on load failure
- `saveAll()` function for emergency saves
- Getter functions instead of static exports

### Step 2: Update Main Entry Point
Replace `index.js` with the new version.

**Key Changes:**
- Graceful shutdown handlers (SIGINT, SIGTERM)
- Auto-save every 5 minutes
- Error handling for uncaught exceptions
- Updated imports to use getter functions

### Step 3: Update All Command Files

Replace these files in `src/commands/`:
- `createEvent.js`
- `cancelEvent.js`
- `editEventTime.js`
- `post.js`
- `repost.js`
- `refresh.js`
- `nextShift.js`

### Step 4: Update Event Handlers

Replace these files in `src/events/`:
- `reactionAdd.js`
- `reactionRemove.js`

### Step 5: Update Service Files

Replace these files in `src/services/`:
- `autoPost.js`

---

## 🧪 Testing Procedure

### Test 1: Basic Event Creation
```
1. Run the bot
2. Use /createevent to create a test shift
3. Check that scheduled_events.json was created/updated
4. Verify scheduled_events.json.backup was created
5. Stop the bot with Ctrl+C
6. Check logs for "✅ All data saved successfully"
7. Restart the bot
8. Verify the event is still there
```

### Test 2: Signup Persistence
```
1. Create and post a test event (use /post)
2. React to sign up for a role
3. Immediately restart the bot (Ctrl+C)
4. Check that the signup was saved
5. Verify the embed shows your signup
```

### Test 3: Auto-Post System
```
1. Use /generate to create weekly schedule
2. Check scheduled_events.json for new events
3. Use /post to post one event
4. Restart bot
5. Verify posted event has proper messageId
6. Verify scheduled events are still scheduled
```

### Test 4: Data Recovery
```
1. Stop the bot
2. Corrupt scheduled_events.json (add invalid JSON)
3. Start the bot
4. Check logs - should see "Attempting to restore from backup"
5. Verify data was restored from .backup file
```

### Test 5: Graceful Shutdown
```
1. Create an event
2. Sign up for it
3. Press Ctrl+C to stop bot
4. Check logs for:
   - "Received SIGINT, shutting down gracefully..."
   - "💾 Saved X events"
   - "✅ All data saved successfully"
5. Restart and verify everything persisted
```

---

## 🔍 Monitoring After Deployment

### Watch for These Log Messages

**✅ Good Signs:**
```
✅ Logged in as [Bot Name]
📂 Loading data files...
   ✅ Loaded X events
💾 Auto-save enabled (every 5 minutes)
✅ Signup channel access verified
💾 Saved X events (appears after changes)
```

**⚠️ Warnings (Need Attention):**
```
⚠️ Error loading scheduled_events.json
🔄 Attempting to restore from backup
⚠️ Warning: Failed to save auto-posted tracking
```

**❌ Critical Errors (Immediate Action Required):**
```
❌ CRITICAL: Failed to save event cancellation!
❌ CRITICAL: Failed to save signup change!
❌ CRITICAL: Failed to save posted events!
```

### Check Files After Deployment
```bash
# Verify backup files exist
ls -lh *.backup

# Check file sizes are reasonable
ls -lh scheduled_events.json

# View recent changes
tail -f logs/bot.log  # If you have logging to file
```

---

## 🆘 Rollback Procedure (If Something Goes Wrong)

```bash
# Stop the bot immediately
# Find your backup
ls -lt src.backup* | head -1

# Restore from backup
rm -rf src
cp -r src.backup.YYYYMMDD_HHMMSS src

# Restore data files
cp scheduled_events.json.backup.YYYYMMDD_HHMMSS scheduled_events.json

# Restart bot
npm start
```

---

## 📊 What Was Fixed - Summary

### Critical Data Loss Issues (🔴 High Priority)
| File | Issue | Impact |
|------|-------|--------|
| storage.js | Static exports instead of live references | All modules reading stale data |
| storage.js | No atomic writes | File corruption on crash |
| storage.js | No backups | Permanent data loss on corruption |
| autoPost.js | Events created/posted without saving | Lost scheduled events |
| reactionAdd.js | Signups not saved | Lost user signups |
| reactionRemove.js | Signup removals not saved | Ghost signups |
| post.js | Posted events not saved | Events appear posted but aren't tracked |
| repost.js | Reposted events not saved | Lost message ID mapping |
| createEvent.js | Created events not saved | Events vanish on restart |
| cancelEvent.js | Cancellations not saved | Cancelled events reappear |
| editEventTime.js | Time changes not saved | Events revert to old time |

### Minor Issues (🟡 Low Priority)
| File | Issue | Impact |
|------|-------|--------|
| refresh.js | Static reference | Works but not future-proof |
| nextShift.js | Static reference | Works but not future-proof |

---

## 🛡️ New Protection Features

1. **Atomic Writes**
   - Write to `.tmp` file first
   - Only rename to real file on success
   - Prevents partial/corrupted writes

2. **Automatic Backups**
   - Every save creates a `.backup` file
   - Backup is the previous good state
   - Auto-recovery on load failure

3. **Graceful Shutdown**
   - Catches SIGINT (Ctrl+C) and SIGTERM
   - Saves all data before exit
   - Prevents mid-operation crashes

4. **Auto-Save Safety Net**
   - Saves every 5 minutes automatically
   - Backup in case manual saves fail
   - Configurable interval

5. **Save Validation**
   - Checks return values from save operations
   - Logs critical failures
   - Notifies users when saves fail

6. **Error Recovery**
   - Rollback on save failure
   - User notifications on errors
   - Detailed error logging

---

## 🎯 Expected Behavior After Fix

### Before (❌ Broken):
```
1. User creates event
2. Event stored in memory
3. Bot crashes
4. Event is LOST ❌
```

### After (✅ Fixed):
```
1. User creates event
2. Event stored in memory
3. Event IMMEDIATELY saved to disk with backup ✅
4. Bot crashes
5. On restart, event loads from file ✅
6. If file corrupted, restores from backup ✅
```

---

## 📞 Support

If you encounter issues:

1. Check the logs for "CRITICAL" errors
2. Verify `.backup` files exist
3. Check file permissions on data files
4. Look for detailed error messages in console
5. Use the rollback procedure if needed

All error messages now include context about:
- What operation failed
- Which event/user was affected
- The exact error message
- Whether data was saved or lost

---

## ✅ Final Verification

After deployment, confirm:
- [ ] Bot starts without errors
- [ ] Old events are still loaded
- [ ] New events can be created
- [ ] Signups are saved immediately
- [ ] Ctrl+C shutdown saves data
- [ ] Backup files are created
- [ ] Auto-save logs appear every 5 minutes
- [ ] All data persists across restarts

**If all checks pass, deployment is successful! 🎉**