# Clean Up Duplicate User Wins

## Problem
You have duplicate win entries in the `userWins` table for the same user+game combinations. This cleanup will:
- Keep the entry with the **highest winAmount** (value)
- Keep the entry with the **highest xWin** (multiplier)
- Delete all other duplicate entries

**Note:** These could be the same entry if one record has both the highest winAmount and highest xWin, or they could be two different entries.

## Solution

### Option 1: Use the Cleanup API (Recommended)
Open your browser console on the dashboard and run:

```javascript
const session = localStorage.getItem("huntmaster_session");
fetch("/api/user-wins/cleanup-duplicates", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ session })
}).then(r => r.json()).then(console.log);
```

This will:
- Find all duplicate entries per user+game
- Keep the highest winAmount entry
- Keep the highest xWin entry
- Delete all other duplicates
- Return a summary of what was cleaned up

### Option 2: Manual SQL (If you have database access)
Run the SQL script in Supabase SQL Editor:

Open `CLEANUP_USERWINS_DUPLICATES.sql` and copy the contents into the Supabase SQL Editor, then run it.

The script will:
1. Show you duplicates before cleanup
2. Delete all entries except:
   - The entry with highest winAmount for each user+game
   - The entry with highest xWin for each user+game
3. Show remaining duplicates after cleanup (should be 0 or minimal)

## What This Does

### Before Cleanup
- Multiple entries per user+game combination
- May have 3+ entries for the same game

### After Cleanup
- Maximum 2 entries per user+game:
  - One entry for highest winAmount (if exists)
  - One entry for highest xWin (if exists)
  - If they're the same entry, only 1 entry remains

## Future Prevention

The `createOrUpdateBest` method has been implemented to prevent new duplicates:
- When saving a new win, it checks if an entry exists for that user+game
- If exists and new win is higher, it updates the entry
- If exists but new win is lower, it keeps the existing entry
- This ensures only one entry per user+game going forward (based on highest winAmount)

**Note:** The cleanup allows 2 entries (highest winAmount + highest xWin), but new saves will only update/create based on highest winAmount. If you want to track both separately going forward, you may need to adjust the `createOrUpdateBest` logic.





