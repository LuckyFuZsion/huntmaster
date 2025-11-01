# Clean Up Duplicate Slots

## Problem
You have duplicate slots in your database (119 slots for 2 unique games). This is causing:
- Excessive database queries
- Duplicate entries in slot lists
- Higher quota usage

## Solution

### Option 1: Use the Cleanup API (Recommended)
Open your browser console on the dashboard and run:

```javascript
const session = localStorage.getItem("huntmaster_session");
fetch("/api/slots/cleanup-duplicates", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ session })
}).then(r => r.json()).then(console.log);
```

### Option 2: Manual SQL (If you have database access)
Run this in Supabase SQL Editor:

```sql
-- Delete duplicate slots, keeping the most recent one for each game name
WITH ranked_slots AS (
  SELECT 
    id,
    "userId",
    name,
    ROW_NUMBER() OVER (
      PARTITION BY "userId", LOWER(TRIM(name)) 
      ORDER BY "createdAt" DESC, id DESC
    ) as rn
  FROM slots
)
DELETE FROM slots
WHERE id IN (
  SELECT id FROM ranked_slots WHERE rn > 1
);
```

## What Was Fixed

1. **Deduplication before save** - Slots are now deduplicated before being saved to prevent new duplicates
2. **Debounced saves** - Saves wait 1 second after last change to prevent rapid saves
3. **Change detection** - Only saves when slots actually change
4. **Real-time subscriptions** - All components now use push-based updates instead of polling

After cleanup, you should see significantly fewer API calls!

