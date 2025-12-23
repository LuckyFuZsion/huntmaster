# API Usage Tracking Summary

## What Gets Tracked in `/admin/api-usage`

The admin API usage dashboard tracks **only one type of API call**:

### ✅ Tracked: `/api/slots-suggest` Route

**When it's tracked:**
- ✅ User provides a session token (`session` parameter or header)
- ✅ Request is NOT cached (actual database query was made)
- ✅ Request successfully completes

**When it's NOT tracked:**
- ❌ No session token provided (anonymous requests)
- ❌ Request was served from cache (cached requests are free)
- ❌ Request failed or errored

### What the Dashboard Shows

The `/admin/api-usage` dashboard displays:

1. **Monthly Searches** - Count of tracked `/api/slots-suggest` calls for the current month
2. **Monthly Limit** - User's limit (from `users.apiMonthlyLimit` or default 2000)
3. **Remaining** - How many searches left this month
4. **Status** - healthy/warning/exhausted/unlimited/inactive
5. **Percentage Used** - How much of their limit they've used

## Detailed Breakdown

### Route: `/api/slots-suggest`

**Location:** `app/api/slots-suggest/route.ts`

**Tracking Logic:**
```typescript
// Line 79: Check cache first
const cached = getCached(cacheKey)
if (cached) {
  // Returns early - NO usage increment
  return NextResponse.json(filteredCachedResponse)
}

// Line 464-483: Only increments if:
// 1. We didn't return early from cache (actual query was made)
// 2. userId is provided (session token exists)
if (userId) {
  const usage = await supabaseAdmin.apiUsage.increment(userId);
  // Usage incremented here
}
```

**What counts as 1 search:**
- One unique database query to `game_reviews` or `slotslaunch_games` table
- Only if session token is provided
- Only if NOT served from cache

**What doesn't count:**
- Cached requests (served from in-memory cache)
- Requests without session token (anonymous)
- Failed requests
- Requests that return early

## Routes That Do NOT Track Usage

These routes are **NOT tracked** in the API usage dashboard:

1. ❌ `/api/slotslaunch` - No usage tracking (was external API, now database)
2. ❌ `/api/slots` - User's bonus hunt slots (not a search)
3. ❌ `/api/user-wins/*` - Win recording (not a search)
4. ❌ `/api/current-game/*` - Current game updates (not a search)
5. ❌ `/api/user-settings/*` - Settings management (not a search)
6. ❌ `/api/user-usage` - Usage query endpoint (not a search)
7. ❌ Any other routes - Only `/api/slots-suggest` is tracked

## Example Scenarios

### Scenario 1: First Search (Counts)
```
User searches: "book of dead"
- Cache miss → Database query → Usage incremented ✅
Result: +1 to monthly searches
```

### Scenario 2: Same Search Again (Doesn't Count)
```
User searches: "book of dead" (again, within cache TTL)
- Cache hit → Returns cached data → NO usage increment ❌
Result: +0 to monthly searches (free!)
```

### Scenario 3: Anonymous Search (Doesn't Count)
```
Anonymous user searches: "gates of olympus"
- No session token → No userId → NO usage increment ❌
Result: +0 to monthly searches
```

### Scenario 4: Different Search (Counts)
```
User searches: "sweet bonanza" (different from cached query)
- Cache miss → Database query → Usage incremented ✅
Result: +1 to monthly searches
```

## Database Structure

The tracking data is stored in:

**Table:** `user_api_usage`
- `userId` - User ID
- `monthlySearches` - Count of searches this month
- `monthlyLimit` - User's limit (from `users.apiMonthlyLimit`)
- `currentMonth` - Month key (e.g., "2025-01")
- `updatedAt` - Last update timestamp

**Source:** `users.apiMonthlyLimit`
- Default: 2000 searches/month
- NULL = unlimited
- Can be set per user

## Monthly Reset

Usage automatically resets each month:
- Month key format: `YYYY-MM` (e.g., "2025-01")
- New month = new record created
- Old records can be cleaned up via `reset_monthly_api_usage()` function

## Summary

**Only `/api/slots-suggest` calls are tracked**, and only when:
1. ✅ Session token is provided
2. ✅ Request hits the database (not cached)
3. ✅ Request succeeds

**Everything else is free and not tracked:**
- Cached requests
- Anonymous requests
- All other API routes
- Database queries that don't go through `/api/slots-suggest`

This means users only pay/use their quota for **actual unique game searches** that hit the database, not for cached results or other operations.


