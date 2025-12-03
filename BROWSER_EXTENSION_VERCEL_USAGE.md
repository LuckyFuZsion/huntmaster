# Browser Extension Vercel Usage Analysis

## Flow When Extension Detects a Game

### Step-by-Step Process

1. **Content Script Detects Game** (No Vercel usage)
   - Runs in browser, detects game title from page
   - Sends message to background script

2. **Background Script Validates Game** (Vercel usage: **1-2 API calls**)
   - Calls `/api/slots-suggest?q=GAME_NAME&limit=20`
   - If first search fails, tries fallback search (removes dashes)
   - **This is METERED** - counts toward user's API usage limit
   - Uses external slot provider APIs (costs money)

3. **Update Current Game** (Vercel usage: **1 API call, minimal cost**)
   - Calls `/api/current-game/set` with game title
   - Writes to Supabase `currentGame` table
   - No external API calls, just database write
   - **Not metered** - doesn't count toward usage limit

4. **Widget Reads Data** (No Vercel usage)
   - Widget subscribes to Supabase Realtime
   - Receives update via websocket (no HTTP request)
   - No Vercel function invocation

## Vercel Usage Breakdown

### Per Game Detection:

| Action | Vercel Usage | Metered? | Cost |
|--------|--------------|----------|------|
| Game validation search | 1-2 function invocations | ✅ Yes | ~$0.01-0.02 per search |
| Update current game | 1 function invocation | ❌ No | Minimal (just DB write) |
| Widget reading | 0 function invocations | ❌ No | Free (Realtime) |

### Total Per Game:
- **1-2 metered API calls** (the expensive part)
- **1 unmetered API call** (cheap, just DB write)
- **0 calls for widget** (uses Realtime)

## Cost Impact

### Scenario: User switches games 20 times/day

**Metered calls (expensive):**
- 20 games × 1.5 searches average = 30 API calls/day
- 30 calls × $0.01 = **$0.30/day** = **~$9/month**

**Unmetered calls (cheap):**
- 20 games × 1 DB write = 20 function invocations
- Vercel free tier: 100GB-hours/month
- Each invocation: ~50ms × 128MB = ~0.0017 GB-hours
- 20 × 0.0017 = **0.034 GB-hours** (negligible)

**Widget reads:**
- 0 Vercel usage (uses Supabase Realtime)

### Total Monthly Cost:
- **~$9/month** for the metered slot searches
- **~$0** for Vercel function invocations (well within free tier)
- **~$0** for widget reads (Realtime)

## Optimization Already in Place ✅

1. **Deduplication**: Extension skips update if same game detected
   ```javascript
   if (normalizedCurrent === normalizedLast) {
     return; // Skip duplicate update
   }
   ```

2. **Game Existence Check**: Only updates if game exists in database
   - Prevents unnecessary updates for unknown games

3. **No Exhaustive Mode**: Removed expensive exhaustive search
   - Only searches first page (20 results)
   - Fallback search only if first fails

4. **Caching**: `/api/slots-suggest` has caching
   - Repeated searches for same game hit cache
   - Reduces external API calls

## Reducing Vercel Usage Further

### Option 1: Cache Game Validation (Recommended)
Add caching to skip validation if game was validated recently:

```javascript
// In background.js
const validatedGames = new Map(); // Cache validated games
const VALIDATION_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

async function checkGameExists(gameTitle, apiBaseUrl) {
  // Check cache first
  const cached = validatedGames.get(gameTitle.toLowerCase());
  if (cached && Date.now() - cached.timestamp < VALIDATION_CACHE_TTL) {
    return cached.exists;
  }
  
  // ... existing validation logic ...
  
  // Cache result
  validatedGames.set(gameTitle.toLowerCase(), {
    exists: gameExists,
    timestamp: Date.now()
  });
  
  return gameExists;
}
```

**Impact**: Reduces metered calls by ~70-90% for repeated games

### Option 2: Skip Validation for Known Games
If game was recently updated, skip validation:

```javascript
// If game was updated in last hour, skip validation
if (lastUpdated && Date.now() - lastUpdated.updatedAt < 3600000) {
  // Skip validation, just update
}
```

**Impact**: Reduces metered calls by ~50% for active users

### Option 3: Batch Validation
Validate multiple games at once (if user switches rapidly):

**Impact**: Reduces calls but adds complexity

## Current Status

✅ **Optimized**: Deduplication, existence checks, no exhaustive mode  
⚠️ **Could improve**: Add validation caching to reduce repeated searches  
✅ **Widget**: Zero Vercel usage (uses Realtime)  

## Summary

**Vercel Usage from Extension:**
- **Metered**: 1-2 API calls per new game (the expensive part)
- **Unmetered**: 1 DB write per game (negligible cost)
- **Widget**: 0 calls (uses Supabase Realtime)

**Main Cost**: The metered slot search API calls (~$0.01-0.02 each)

**Recommendation**: Add validation caching to reduce repeated searches for the same games.

