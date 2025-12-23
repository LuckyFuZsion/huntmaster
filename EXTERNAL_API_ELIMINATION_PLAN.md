# External API Elimination Plan

## Current Status: Still Using External APIs ❌

### Routes Still Making External API Calls

1. **`/api/slotslaunch/[...path]/route.ts`** ⚠️ CRITICAL
   - **Status**: Still makes external API calls
   - **Cost**: $0.01-0.02 per call
   - **Usage**: Catch-all proxy route for SlotsLaunch API
   - **Action**: Disable or migrate to database

2. **`/api/slot-streamers/suggest-games/route.ts`** ⚠️ CRITICAL
   - **Status**: Still makes external API calls to `slot-streamers.com`
   - **Cost**: $0.01-0.02 per call
   - **Usage**: Used by autocomplete/search
   - **Action**: Migrate to use `game_reviews` table from database

3. **`/api/slot-streamers/search-game/route.ts`** ⚠️ CRITICAL
   - **Status**: Still makes external API calls via `lib/slot-streamers-api.ts`
   - **Cost**: $0.01-0.02 per call
   - **Usage**: Used for game search
   - **Action**: Migrate to use `game_reviews` table from database

4. **`components/SlotNameAutocomplete.tsx`** ⚠️ MEDIUM
   - **Status**: Comment says "Always make external API call"
   - **Usage**: Calls `/api/slots-suggest` which should use database
   - **Action**: Verify it's using database, not external APIs

### Test Routes (Can Keep or Remove)

These are test routes and can be kept for debugging, but should be clearly marked:
- `/api/test/slot-streamers-api/route.ts`
- `/api/test/slotslaunch/route.ts`
- `/api/test/oracle-of-gold/route.ts`

## Migration Plan

### Phase 1: Disable Unused Routes (Immediate)

1. **Disable `/api/slotslaunch/[...path]/route.ts`**
   - Add check to return 410 Gone or 501 Not Implemented
   - This route is a catch-all proxy that shouldn't be used

2. **Check if slot-streamers routes are being used**
   - Search codebase for references
   - If not used, disable them

### Phase 2: Migrate Active Routes (High Priority)

1. **Migrate `/api/slot-streamers/suggest-games`**
   - Replace external API call with database query to `game_reviews` table
   - Use same logic as `/api/slots-suggest` route

2. **Migrate `/api/slot-streamers/search-game`**
   - Replace external API call with database query
   - Use `game_reviews` table

3. **Verify `/api/slots-suggest` is database-only**
   - Already migrated, but verify no external API fallbacks

### Phase 3: Cleanup (Low Priority)

1. **Remove or mark test routes**
   - Either remove test routes or clearly mark them as test-only
   - Add authentication to prevent accidental usage

2. **Remove unused library**
   - `lib/slot-streamers-api.ts` - Remove if no longer needed

## Verification Steps

1. **Search for external API calls**:
   ```bash
   grep -r "slot-streamers.com" app/
   grep -r "SLOT_STREAMERS_API" app/
   grep -r "SLOTSLAUNCH_API" app/
   ```

2. **Check Vercel logs**:
   - Look for external API URLs in logs
   - Monitor function invocations

3. **Test routes**:
   - Test autocomplete/search functionality
   - Verify no external API calls are made

## Expected Impact

After migration:
- **Zero external API costs** - All queries use database
- **Faster responses** - Database queries are faster than external APIs
- **No rate limits** - No external API rate limits
- **Better reliability** - No dependency on external services


