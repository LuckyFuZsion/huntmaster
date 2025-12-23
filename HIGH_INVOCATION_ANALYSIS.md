# High Invocation Analysis

## Current Situation
- **13,000 function invocations** today (while idle)
- **9,876 edge middleware invocations** today

## Root Causes

### 1. Edge Middleware (9,876 invocations)
**Location**: `middleware.ts`

**Issue**: Middleware runs on **EVERY request** to your site, including:
- Static assets (images, CSS, JS files)
- API routes
- Page loads
- Favicon requests
- Browser preflight requests
- Bot/crawler requests
- Health checks

**Current Code**:
```typescript
export function middleware(request: NextRequest) {
  // Allow all requests to proceed normally
  return NextResponse.next()
}
```

**Impact**: Even though it's just passing through, Vercel counts every request as a middleware invocation.

**Solution**: Add path filtering to exclude static assets and unnecessary routes:
```typescript
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // Skip middleware for static assets
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.match(/\.(ico|png|jpg|jpeg|gif|svg|css|js|woff|woff2|ttf|eot)$/)
  ) {
    return NextResponse.next()
  }
  
  // Only run middleware for actual page requests
  return NextResponse.next()
}

// Configure which paths should run middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
```

### 2. Function Invocations (13,000)
**Likely Sources**:

#### A. OBS Browser Sources & Widgets
Each open OBS browser source/widget makes:
1. **Initial API call** when it loads (`/api/slots/by-username`, `/api/user-settings/by-username`, etc.)
2. **Real-time subscription** setup (WebSocket connection, not counted as function invocation)
3. **Refetch calls** when subscriptions fail/timeout

**If you have 10 OBS sources open**:
- 10 initial API calls per source = 10+ function invocations
- If they reload/refresh = more invocations
- If subscriptions timeout and retry = more invocations

#### B. Real-Time Subscription Retries
When real-time subscriptions fail or timeout, the hooks retry by making API calls:
- `useSupabaseSlotsByUsername` - retries on subscription errors
- `useSupabaseUserWins` - retries on subscription errors
- Each retry = 1 function invocation

#### C. Bot/Crawler Traffic
Bots crawling your site will trigger:
- Page loads = middleware invocations
- API calls = function invocations
- Static asset requests = middleware invocations

#### D. Health Checks
If you have any monitoring services (UptimeRobot, Pingdom, etc.) checking your site:
- Each check = middleware + function invocation

## Solutions

### Immediate Actions

1. **Filter Middleware Paths** (Reduces ~70-80% of middleware invocations)
   - Update `middleware.ts` to skip static assets
   - This alone should reduce from 9,876 to ~2,000-3,000

2. **Check Open OBS Sources**
   - Close any OBS browser sources that aren't actively being used
   - Each open source = continuous API calls

3. **Check for Bots/Crawlers**
   - Review Vercel analytics for unusual traffic patterns
   - Check if bots are hitting your API endpoints

4. **Disable Unnecessary Real-Time Retries**
   - The hooks retry on subscription errors, which can cause excessive API calls
   - Consider reducing retry frequency or disabling auto-retry

### Long-Term Optimizations

1. **Add Request Rate Limiting**
   - Limit API calls per IP/user
   - Prevent abuse

2. **Cache Static Responses**
   - Add caching headers to reduce repeated requests

3. **Monitor Real-Time Subscriptions**
   - Log when subscriptions fail/timeout
   - Investigate why they're failing

4. **Add Health Check Endpoint**
   - Create a lightweight `/api/health` endpoint
   - Exclude it from middleware
   - Use this for monitoring instead of full page loads

## How to Investigate Further

1. **Check Vercel Analytics**:
   - Go to Vercel dashboard → Analytics
   - See which routes are being hit most
   - Check for unusual traffic patterns

2. **Check Logs**:
   - Review Vercel function logs
   - Look for repeated API calls from same IPs
   - Check for subscription errors

3. **Count Open OBS Sources**:
   - How many OBS browser sources are currently open?
   - Each one makes API calls

4. **Check for Monitoring Services**:
   - Do you have any uptime monitoring services?
   - How often do they check?

## Expected Reduction

After implementing middleware filtering:
- **Middleware invocations**: 9,876 → ~2,000-3,000 (70-80% reduction)
- **Function invocations**: Depends on active OBS sources and real-time retries

If you have 5 OBS sources open and they each make 1 API call per minute:
- 5 sources × 60 minutes × 24 hours = 7,200 invocations/day
- This is normal and expected for active usage

If the site is truly idle, function invocations should be near zero.


