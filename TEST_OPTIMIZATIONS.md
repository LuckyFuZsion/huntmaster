# Testing Optimization Improvements

## 1. Verify Indexes Are Created

Run this in Supabase SQL Editor to confirm indexes exist:

```sql
-- Check userWins indexes
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'userWins'
ORDER BY indexname;

-- Check slots indexes
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'slots'
ORDER BY indexname;
```

You should see:
- `idx_userWins_userId_createdAt`
- `idx_userWins_userId_xWin`
- `idx_userWins_createdAt`
- `idx_userWins_userId_winAmount`
- `idx_slots_userId_createdAt`

## 2. Test Query Performance

### Test Recent Wins Query (Should be fast with indexes)

**Before indexes**: Full table scan, slow
**After indexes**: Index scan, fast

Test in Supabase SQL Editor:

```sql
-- Test query that uses the new indexes
EXPLAIN ANALYZE
SELECT *
FROM "userWins"
WHERE "userId" = (SELECT id FROM users LIMIT 1)
  AND "createdAt" >= NOW() - INTERVAL '7 days'
  AND "xWin" >= 100
ORDER BY "winAmount" DESC
LIMIT 500;
```

Look for:
- ✅ `Index Scan using idx_userWins_userId_createdAt` or similar
- ✅ Execution time should be < 50ms for typical data
- ❌ If you see `Seq Scan` (sequential scan), indexes aren't being used

### Test Slots Query Performance

```sql
-- Test slots query that uses the new index
EXPLAIN ANALYZE
SELECT *
FROM slots
WHERE "userId" = (SELECT id FROM users LIMIT 1)
ORDER BY "createdAt" ASC;
```

Should show: `Index Scan using idx_slots_userId_createdAt`

## 3. Test API Endpoints

### Test Recent Wins with Limit

```bash
# Test with default limit (500)
curl "http://localhost:3000/api/user-wins/recent?username=YOUR_USERNAME&days=7&minXWin=100"

# Test with custom limit
curl "http://localhost:3000/api/user-wins/recent?username=YOUR_USERNAME&days=7&minXWin=100&limit=100"

# Should return max 500 wins (or your limit), not all wins
```

### Test Admin API Usage Pagination

1. Navigate to `/admin/api-usage`
2. Check pagination controls appear if you have > 100 users
3. Click "Next" to verify pagination works
4. Check network tab - should see `?page=2&limit=100` in URL

### Test Caching

```bash
# First request - should hit database
time curl "http://localhost:3000/api/slotslaunch?search=book%20of%20dead&limit=20"

# Second request (within 24 hours) - should hit cache (much faster)
time curl "http://localhost:3000/api/slotslaunch?search=book%20of%20dead&limit=20"
```

Cache hit should be < 10ms, database query will be 100-500ms.

## 4. Monitor Supabase Dashboard

### Check Query Performance

1. Go to Supabase Dashboard → Database → Query Performance
2. Look for queries on `userWins` and `slots` tables
3. Should see faster execution times after indexes

### Check Database Size

1. Go to Supabase Dashboard → Database → Database Size
2. Indexes add minimal storage (~1-5% of table size)
3. Verify storage hasn't increased significantly

## 5. Load Testing (Optional)

### Test with Large Dataset

If you have a user with many wins:

```sql
-- Count wins for a user
SELECT COUNT(*) FROM "userWins" WHERE "userId" = 'YOUR_USER_ID';
```

Then test the API:
```bash
# Should still be fast even with 1000+ wins (limited to 500)
curl "http://localhost:3000/api/user-wins/recent?username=USERNAME&days=30"
```

Response should be fast (< 200ms) even with large datasets.

## 6. Check Logs

### Verify Cache Hits

Check your server logs for:
```
✅ Cache hit for slotslaunch: "book of dead"
```

### Verify Pagination

Check network requests show pagination parameters:
```
GET /api/admin/api-usage?page=1&limit=100
```

## 7. Performance Comparison

### Before vs After Metrics

| Metric | Before | After (Expected) |
|-------|--------|------------------|
| Recent wins query (1000 wins) | 200-500ms | 20-50ms |
| Slots query (100 slots) | 50-100ms | 10-20ms |
| Admin dashboard load (200 users) | 2-5s | 200-500ms |
| Cache hit response | N/A | < 10ms |

## 8. Real-World Test

1. **Load the wins dashboard** (`/wins-dashboard`)
   - Should load quickly even with many wins
   - Check browser DevTools Network tab for response time

2. **Use the admin dashboard** (`/admin/api-usage`)
   - Should load quickly with pagination
   - Test pagination controls

3. **Search for slots** (autocomplete)
   - First search: hits external API
   - Second identical search: should hit cache (faster)

## Troubleshooting

### Indexes Not Being Used

If you see `Seq Scan` instead of `Index Scan`:

1. **Check table statistics are up to date:**
   ```sql
   ANALYZE "userWins";
   ANALYZE slots;
   ```

2. **Force index usage (if needed):**
   ```sql
   SET enable_seqscan = off;
   -- Run your query
   SET enable_seqscan = on;
   ```

### Slow Queries Still

1. Check if you're filtering on non-indexed columns
2. Verify indexes are actually created (step 1)
3. Check table size - very small tables might use sequential scans anyway

### Cache Not Working

1. Check cache TTL settings in code
2. Verify cache key includes all relevant parameters
3. Check server logs for cache hits/misses

## Success Criteria

✅ All indexes created and visible in pg_indexes  
✅ Queries use Index Scan (not Seq Scan)  
✅ API responses are fast (< 200ms for typical queries)  
✅ Pagination works correctly  
✅ Cache hits show in logs  
✅ No memory leaks (cache size stays under limit)  

If all these pass, optimizations are working! 🎉

