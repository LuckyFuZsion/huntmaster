# Real-Time Migration Guide: From Polling to Push-Based Updates

## Overview

We're migrating from polling-based updates (checking every 8 seconds) to Supabase real-time subscriptions. This will:
- **Reduce API calls by 90%+** - Only queries when data actually changes
- **Improve responsiveness** - Updates appear instantly when changes occur
- **Reduce database load** - No unnecessary queries when nothing has changed
- **Stay within Supabase free tier** - Much more efficient use of quota

## Setup Steps

### 1. Enable Real-Time in Supabase

Run the SQL script in your Supabase SQL Editor:

```sql
-- File: SUPABASE_REALTIME_SETUP.sql
-- This enables real-time replication for slots, userSettings, currentGame, and userWins
```

### 2. Verify Real-Time is Enabled

```sql
SELECT 
  schemaname,
  tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;
```

You should see: `slots`, `userSettings`, `currentGame`, `userWins`

## Migration Pattern

### Before (Polling):
```typescript
useEffect(() => {
  const loadData = async () => {
    const response = await fetch('/api/slots')
    // ... process data
  }
  
  loadData()
  const interval = setInterval(loadData, 8000) // Poll every 8 seconds
  return () => clearInterval(interval)
}, [username])
```

### After (Real-Time):
```typescript
import { useSupabaseSlotsByUsername } from '@/lib/hooks/useSupabaseSlotsByUsername'

const { slots, loading } = useSupabaseSlotsByUsername(username)
// No polling needed! Updates automatically when data changes
```

## Available Hooks

### 1. `useSupabaseSlots(userId)`
For dashboard/main app (when you have userId from session)

```typescript
import { useSupabaseSlots } from '@/lib/hooks/useSupabaseSlots'

const { slots, loading, error, refetch } = useSupabaseSlots(userId)
```

### 2. `useSupabaseSlotsByUsername(username)`
For OBS browser sources and widgets (when you only have username)

```typescript
import { useSupabaseSlotsByUsername } from '@/lib/hooks/useSupabaseSlotsByUsername'

const { slots, loading, error, refetch } = useSupabaseSlotsByUsername(username)
```

### 3. `useSupabaseUserSettings(userId)`
For user settings updates

```typescript
import { useSupabaseUserSettings } from '@/lib/hooks/useSupabaseUserSettings'

const { settings, loading, error } = useSupabaseUserSettings(userId)
```

## Components to Migrate

### High Priority (Most Polling):
1. ✅ `components/bonus-hunt-tracker.tsx` - Main dashboard
2. ✅ `components/obs-browser-source.tsx` - Main OBS source
3. ✅ `components/obs-browser-source-2.tsx` through `obs-browser-source-8.tsx`
4. ✅ `components/spider-browser-source.tsx`
5. ✅ `app/widgets/*/page.tsx` - All widget pages

### Medium Priority:
- `components/CurrentGameWidget.tsx`
- `components/ExtensionGameWidget.tsx`
- `components/BonusHuntGameWidget.tsx`

## Example Migration: OBS Browser Source

### Before:
```typescript
useEffect(() => {
  const loadSlotsFromFirestore = async () => {
    const response = await fetch(`/api/slots/by-username?username=${username}`)
    // ... process
  }
  
  loadSlotsFromFirestore()
  const interval = setInterval(loadSlotsFromFirestore, 8000) // ❌ Polling
  return () => clearInterval(interval)
}, [username])
```

### After:
```typescript
import { useSupabaseSlotsByUsername } from '@/lib/hooks/useSupabaseSlotsByUsername'

const { slots, loading } = useSupabaseSlotsByUsername(username) // ✅ Real-time
// Updates automatically when slots change in database!
```

## Benefits

### Before (Polling):
- Every 8 seconds: 450 API calls/hour per component
- 10 OBS sources = 4,500 API calls/hour
- Constant load even when nothing changes

### After (Real-Time):
- Initial load: 1 API call
- Only queries again when data actually changes
- 10 OBS sources = ~10-50 API calls/hour (only when data updates)

## Testing

After migration:
1. Open the component
2. Make a change in another window/tab
3. Verify the change appears **instantly** (no 8-second wait)
4. Check browser console for subscription status messages
5. Monitor Supabase dashboard for query counts (should be much lower)

## Fallback Behavior

If real-time subscription fails:
- Hooks will still load initial data via API
- You can manually call `refetch()` if needed
- Errors are logged to console
- Components continue to work (just without real-time updates)

## Notes

- Real-time subscriptions only work when Supabase real-time is enabled
- Each subscription uses a small amount of memory (negligible)
- Subscriptions are automatically cleaned up when components unmount
- Multiple components can subscribe to the same data without issues












