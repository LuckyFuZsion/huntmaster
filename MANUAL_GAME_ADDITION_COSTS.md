# Manual Game Addition Costs in HuntMaster

## Flow When Adding Games Manually

### Step-by-Step Process

1. **User Types Game Name** (No cost)
   - User types in the `SlotNameAutocomplete` field
   - No API calls triggered while typing
   - Client-side cache checked first

2. **User Searches for Game** (Metered - counts toward API limit)
   - User presses **Enter** or clicks **🔍 search button**
   - Calls `/api/slots-suggest?q=GAME_NAME&limit=8&session=...`
   - **This is METERED** - counts toward user's monthly API usage limit
   - Uses external slot provider APIs (~$0.01-0.02 per search)
   - Results are cached client-side for instant re-searches

3. **User Selects Game** (No cost)
   - User clicks a game from the dropdown
   - No additional API calls
   - Game name populated in the form

4. **User Adds Slot** (Unmetered - minimal cost)
   - User clicks "Add Slot" button
   - Calls `/api/slots` with `action: "save"`
   - **This is NOT METERED** - just writes to Supabase
   - No external API calls, just database write
   - Negligible Vercel function cost

## Cost Breakdown

### Per Game Addition:

| Action | Vercel Usage | Metered? | Cost | Notes |
|--------|--------------|----------|------|-------|
| Typing game name | 0 calls | ❌ No | Free | No API calls while typing |
| Searching (Enter/🔍) | 1 function call | ✅ **Yes** | ~$0.01-0.02 | **The expensive part** |
| Selecting from dropdown | 0 calls | ❌ No | Free | Uses cached results |
| Adding slot to list | 1 function call | ❌ No | Minimal | Just DB write |

### Total Per Game:
- **1 metered API call** (the search)
- **1 unmetered API call** (the save)
- **0 calls for widget updates** (uses Realtime)

## Cost Scenarios

### Scenario 1: User adds 20 games to hunt list

**Searches (metered):**
- 20 games × 1 search = 20 API calls
- 20 calls × $0.01 = **$0.20** (one-time)

**Saves (unmetered):**
- 20 games × 1 DB write = 20 function invocations
- ~0.034 GB-hours (negligible, well within free tier)

**Total: ~$0.20** for adding 20 games

### Scenario 2: User searches but doesn't add

**Searches (metered):**
- Each search = 1 API call = ~$0.01
- If user searches 10 times but only adds 5 games = 10 metered calls

**Saves:**
- Only when user clicks "Add Slot"
- No save = no additional cost

### Scenario 3: User re-searches same game

**First search:**
- 1 metered API call = ~$0.01

**Subsequent searches (same query):**
- 0 API calls (uses client-side cache)
- Free

## Optimizations Already in Place ✅

1. **No Auto-Search While Typing**
   - User must explicitly press Enter or click search button
   - Prevents accidental API calls

2. **Client-Side Caching**
   - Search results cached in browser memory
   - Re-searching same query = instant, no API call

3. **Debounced Input**
   - No API calls triggered on every keystroke
   - Only on explicit search action

4. **Deduplication**
   - Results deduplicated before showing
   - Prevents duplicate entries

5. **Limit Parameter**
   - Only fetches 8 results (not all)
   - Reduces data transfer

6. **Usage Tracking**
   - API calls tracked and limited per user
   - Prevents runaway costs

## Cost Comparison

### Manual Addition vs Browser Extension

| Method | Searches | Saves | Total Cost |
|--------|----------|-------|------------|
| **Manual (HuntMaster)** | 1 per game | 1 per game | ~$0.01-0.02 per game |
| **Browser Extension** | 1-2 per game | 1 per game | ~$0.01-0.04 per game |

**Manual addition is cheaper** because:
- User explicitly searches (no fallback searches)
- No validation step needed (user already selected from results)
- Single search vs 1-2 searches in extension

## Reducing Costs Further

### Option 1: Pre-populate Common Games (Recommended)
Create a list of popular games that don't require search:

```typescript
const POPULAR_GAMES = [
  "Book of Dead",
  "Gates of Olympus",
  "Sweet Bonanza",
  // ... top 100 games
]

// Check popular games first before API search
if (POPULAR_GAMES.includes(normalizedQuery)) {
  return cachedResults; // No API call
}
```

**Impact**: Reduces searches by ~30-50% for common games

### Option 2: Server-Side Search Cache
Cache search results server-side (already implemented in `/api/slotslaunch`):
- Same game searched by multiple users = cache hit
- Reduces external API calls

**Impact**: Reduces external API calls by ~70-90% for repeated searches

### Option 3: Allow Manual Entry Without Search
Let users type game name directly without searching:
- No API call if user just types and adds
- Only search if user wants autocomplete

**Impact**: Reduces searches by ~20-30% (users who know exact game name)

## Current Status

✅ **Optimized**: No auto-search, client-side caching, usage limits  
⚠️ **Could improve**: Pre-populate popular games, allow manual entry without search  

## Summary

**Cost per game added manually:**
- **~$0.01-0.02** for the search (metered)
- **~$0** for the save (unmetered, within free tier)

**Total for 20 games: ~$0.20**

The main cost is the search API call, which is necessary for autocomplete functionality. The save operation is free (just a database write).

