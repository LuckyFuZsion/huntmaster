# Testing API Cost Fixes

## What We Fixed

1. **API Usage Tracking**: Browser extension requests now use cache and don't incorrectly increment usage
2. **External API Elimination**: `/api/slotslaunch` now uses database instead of external API
3. **Cache Behavior**: All requests (including browser extension) now use cache

## Test Plan

### 1. Test Database-Only Queries (No External API Calls)

#### Test `/api/slots-suggest` (should use database)
```bash
# Test with a common game search
curl "http://localhost:3000/api/slots-suggest?q=book%20of%20dead&limit=10"

# Check logs - should see:
# ✅ "Database Query #X for slots-suggest"
# ✅ "Searching game_reviews table"
# ❌ Should NOT see any external API URLs or "fetch" to slot-streamers.com
```

#### Test `/api/slotslaunch` (should use database now)
```bash
# Test the migrated route
curl "http://localhost:3000/api/slotslaunch?search=book%20of%20dead&limit=10"

# Check logs - should see:
# ✅ "Database query for slotslaunch: ... returned X results (FREE - no external API cost!)"
# ❌ Should NOT see any fetch to external SlotsLaunch API
```

### 2. Test Cache Behavior

#### Test that cached requests don't increment API usage
```bash
# First request (should hit database and increment usage)
curl "http://localhost:3000/api/slots-suggest?q=test%20game&limit=10&session=YOUR_SESSION_TOKEN"

# Second request (same query - should use cache, NOT increment usage)
curl "http://localhost:3000/api/slots-suggest?q=test%20game&limit=10&session=YOUR_SESSION_TOKEN"

# Check logs:
# First: Should see database query + API usage increment
# Second: Should see "✅ Cache hit" and NO API usage increment
```

### 3. Test Browser Extension Cache Fix

#### Before the fix:
- Browser extension requests skipped cache
- Every request incremented API usage
- Result: 2000+ requests in 10 minutes

#### After the fix:
1. Open browser extension
2. Make a game search
3. Make the same search again immediately
4. Check API usage dashboard - should only increment once

**Expected behavior:**
- First search: Increments usage (hits database)
- Second search: Uses cache, does NOT increment usage

### 4. Monitor External API Calls

#### Check Vercel/Server Logs
Look for these patterns that indicate external API calls:
```bash
# ❌ BAD - External API calls (should NOT see these):
"fetch.*slot-streamers.com"
"fetch.*slotslaunch.*api"
"x-api-key.*SLOTSLAUNCH_API_KEY"
"Upstream request"
"External API"

# ✅ GOOD - Database queries (should see these):
"Database Query"
"game_reviews table"
"slotslaunch_games table"
"FREE - no external API cost"
```

### 5. Test API Usage Tracking

#### Check user's API usage before and after
```bash
# Get current usage
curl "http://localhost:3000/api/user-usage?session=YOUR_SESSION_TOKEN"

# Make a search
curl "http://localhost:3000/api/slots-suggest?q=test&limit=10&session=YOUR_SESSION_TOKEN"

# Check usage again - should increment by 1
curl "http://localhost:3000/api/user-usage?session=YOUR_SESSION_TOKEN"

# Make same search again (should use cache)
curl "http://localhost:3000/api/slots-suggest?q=test&limit=10&session=YOUR_SESSION_TOKEN"

# Check usage - should NOT increment (still same as before)
curl "http://localhost:3000/api/user-usage?session=YOUR_SESSION_TOKEN"
```

### 6. Test in Production

#### Deploy and monitor
1. Deploy to Vercel
2. Monitor Vercel logs for external API calls
3. Check billing/usage dashboard
4. Test with browser extension
5. Verify no charges for database queries

### 7. Quick Verification Script

Create a test script to verify no external API calls:

```javascript
// test-no-external-api.js
const testQueries = [
  'book of dead',
  'gates of olympus',
  'sweet bonanza'
];

async function test() {
  for (const query of testQueries) {
    console.log(`Testing: ${query}`);
    const url = `http://localhost:3000/api/slots-suggest?q=${encodeURIComponent(query)}&limit=10`;
    
    const start = Date.now();
    const response = await fetch(url);
    const data = await response.json();
    const duration = Date.now() - start;
    
    console.log(`  Results: ${data.data?.length || 0}`);
    console.log(`  Duration: ${duration}ms`);
    console.log(`  From cache: ${data.metadata?.fromCache || false}`);
    console.log('');
  }
}

test();
```

## Expected Results

### ✅ Success Indicators:
- No external API calls in logs
- Cached requests don't increment API usage
- Database queries are fast (< 100ms typically)
- API usage only increments for actual database queries
- No charges for cached requests

### ❌ Failure Indicators:
- External API URLs in logs
- API usage increments on every request (even cached)
- Slow responses (> 500ms) indicating external API calls
- Charges appearing for database queries

## Monitoring in Production

### Check Vercel Logs:
```bash
# Filter for external API calls
vercel logs --filter "slot-streamers"
vercel logs --filter "slotslaunch"
vercel logs --filter "x-api-key"

# Should return NO results if fix is working
```

### Check API Usage Dashboard:
- Navigate to `/admin/api-usage`
- Monitor user's monthly searches
- Should only increment for non-cached requests
- Should NOT increment rapidly (like 2000 in 10 minutes)

## Troubleshooting

If you still see external API calls:

1. **Check which route is being called:**
   - Look at request URLs in logs
   - Verify it's `/api/slots-suggest` or `/api/slotslaunch`, not `/api/slotslaunch/[...path]`

2. **Check environment variables:**
   - Ensure `SLOTSLAUNCH_API_KEY` is not being used
   - Database queries don't need API keys

3. **Verify database tables exist:**
   - `game_reviews` table should exist
   - `slotslaunch_games` table should exist

4. **Check cache behavior:**
   - First request should hit database
   - Second identical request should use cache
   - Cache should work for browser extension too


