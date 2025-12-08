# Biggest Win Only Implementation ✅

## Changes Made

### 1. Updated `userWins.create()` Method
**File**: `lib/supabase-admin.ts`

- Changed from `INSERT` to `UPSERT` logic
- Checks if win exists for user+game combination
- Only updates if new win is bigger (by `winAmount` or `xWin`)
- Returns existing win if new win is smaller (doesn't save)

**Logic:**
```typescript
1. Check if win exists for user+game
2. If exists:
   - Compare new win vs existing
   - Update only if new win is bigger
   - Return existing if new win is smaller
3. If doesn't exist:
   - Create new record (first win for this game)
```

### 2. Database Constraint
**File**: `SUPABASE_BIGGEST_WIN_CONSTRAINT.sql`

- Adds unique constraint on `(userId, gameTitle)`
- Ensures only one win record per user per game
- Prevents duplicate entries at database level

**Action Required**: Run `SUPABASE_BIGGEST_WIN_CONSTRAINT.sql` in Supabase SQL Editor

## How It Works

### When User Records a Win:

1. **User enters win in bonus hunt** → Saved to `slots` table (all wins tracked)
2. **System checks `userWins` table**:
   - If no win exists for this game → Create new record
   - If win exists:
     - New win is bigger → Update record
     - New win is smaller → Keep existing (don't save)

### Example:

**User plays "Book of Dead" 10 times:**
- Win 1: $50 → Saved (first win)
- Win 2: $30 → Not saved (smaller)
- Win 3: $100 → Saved (bigger, updates record)
- Win 4: $75 → Not saved (smaller)
- Win 5: $200 → Saved (bigger, updates record)
- ... (wins 6-10 all smaller, not saved)

**Result**: Only 1 record in `userWins` table (the $200 win)

## Cost Savings

### Before (All Wins):
- User with 500 wins across 30 games = **500 rows**
- Storage: ~100 KB
- Egress per query: ~100 KB

### After (Biggest Win Only):
- Same user = **30 rows** (one per game)
- Storage: ~6 KB (**94% reduction**)
- Egress per query: ~6 KB (**94% reduction**)

## Features Still Work

✅ **Bonus Hunt Tracking**: All wins still saved in `slots` table  
✅ **Best Win Per Game**: Perfect, that's what we store  
✅ **Overall Best Win**: Easy to find from biggest wins  
✅ **Widgets**: Show best wins, works perfectly  
✅ **Win Recording**: Still works, just only saves biggest  

## Features Removed

❌ **Wins Dashboard**: Can't show all wins over time (only biggest)  
❌ **Recent Wins Query**: Can't show wins from last 7/30 days  
❌ **Win History**: Can't track progression over time  

**Note**: Bonus hunt wins are still tracked in the `slots` table, so you can still see all wins during a hunt. The `userWins` table now only stores the biggest win per game.

## Migration

### Existing Data:
- Current `userWins` table may have multiple wins per game
- Run this SQL to keep only biggest wins:

```sql
-- Keep only biggest win per user per game
WITH ranked_wins AS (
  SELECT 
    *,
    ROW_NUMBER() OVER (
      PARTITION BY "userId", "gameTitle" 
      ORDER BY "winAmount" DESC, "xWin" DESC
    ) as rn
)
DELETE FROM "userWins"
WHERE id NOT IN (
  SELECT id FROM ranked_wins WHERE rn = 1
);
```

**Then run** `SUPABASE_BIGGEST_WIN_CONSTRAINT.sql` to add the unique constraint.

## Summary

✅ **Implemented**: Biggest win only per game per user  
✅ **Cost Reduction**: ~94% reduction in storage and egress  
✅ **Bonus Hunts**: Still track all wins in `slots` table  
✅ **Functionality**: Best wins features still work  

The system now saves only the biggest win per game, dramatically reducing costs while maintaining core functionality!

