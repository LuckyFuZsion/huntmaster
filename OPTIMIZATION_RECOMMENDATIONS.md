# System Optimization Recommendations

## Critical Optimizations (Do These First)

### 1. Missing Database Indexes ⚠️ HIGH IMPACT
**Issue**: The `userWins` table is missing indexes on `createdAt` and `xWin` columns, which are frequently queried.

**Impact**: Slow queries when filtering by date or X win threshold, especially as data grows.

**Fix**: Add composite index for common query patterns:
```sql
CREATE INDEX IF NOT EXISTS idx_userWins_userId_createdAt ON "userWins"("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_userWins_userId_xWin ON "userWins"("userId", "xWin" DESC);
CREATE INDEX IF NOT EXISTS idx_userWins_createdAt ON "userWins"("createdAt" DESC);
```

### 2. No Pagination on Recent Wins Query ⚠️ MEDIUM IMPACT
**Issue**: `findRecentByUser` returns ALL wins without a limit, which could return thousands of rows.

**Impact**: High egress costs and slow responses for users with many wins.

**Fix**: Add pagination with default limit (e.g., 100 wins max).

### 3. Admin API Usage Endpoint - No Pagination ⚠️ MEDIUM IMPACT
**Issue**: `/api/admin/api-usage` fetches ALL users and ALL usage records without pagination.

**Impact**: Expensive queries and slow page loads as user base grows.

**Fix**: Add pagination (e.g., 50 users per page) or lazy loading.

### 4. Empty Cache Implementation ⚠️ LOW-MEDIUM IMPACT
**Issue**: `setCache` and `getCached` functions in `/api/slotslaunch` are empty stubs.

**Impact**: No caching means repeated identical searches hit external APIs every time.

**Fix**: Implement proper in-memory or Redis cache with TTL.

## Medium Priority Optimizations

### 5. Select * Queries
**Issue**: Many queries use `select('*')` which pulls all columns.

**Impact**: Unnecessary data transfer for large tables.

**Fix**: Select only needed columns (e.g., `select('id, username, email')` instead of `select('*')`).

### 6. Wins Dashboard - No Result Limits
**Issue**: The wins dashboard can return unlimited results.

**Impact**: High egress if user has thousands of wins.

**Fix**: Add pagination or limit (e.g., max 500 wins displayed).

## Low Priority (Nice to Have)

### 7. Connection Pooling
**Issue**: Each query creates a new connection (handled by Supabase client, but worth monitoring).

**Impact**: Minimal - Supabase handles this, but monitor connection counts.

### 8. Query Result Caching
**Issue**: Frequently accessed data (like user settings) is re-queried on every request.

**Impact**: Low - queries are fast, but could add edge caching for user settings.

## Already Optimized ✅

- ✅ Realtime subscriptions (no polling)
- ✅ API usage capping and tracking
- ✅ Debounced search inputs
- ✅ Single external API call per search (no exhaustive mode)
- ✅ Removed expensive game verification from win recording
- ✅ Indexes on userId and gameTitle for userWins
- ✅ Indexes on userId for all major tables

## Cost Impact Summary

**Current State**: Good foundation, but missing indexes and pagination could cause issues at scale.

**After Critical Fixes**: 
- 50-80% reduction in query time for recent wins
- 60-90% reduction in egress for users with many wins
- Better scalability as user base grows

