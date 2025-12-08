# API Usage Capping Guide

## Overview

HuntMaster now supports per-user API call capping to control costs. Each user can have a monthly limit on API searches, and the system will automatically track and enforce these limits.

## Setup

### 1. Run the Database Migration

Run `SUPABASE_API_USAGE_SETUP.sql` in your Supabase SQL Editor. This creates:
- `user_api_usage` table - Tracks monthly usage per user
- `apiMonthlyLimit` column on `users` table - Per-user limits
- Database functions for checking and incrementing usage

### 2. Set User Limits

#### Set limit for a specific user:
```sql
UPDATE users 
SET "apiMonthlyLimit" = 2000  -- 2000 searches/month
WHERE username = 'username_here';
```

#### Set unlimited (no cap):
```sql
UPDATE users 
SET "apiMonthlyLimit" = NULL  -- NULL = unlimited
WHERE username = 'username_here';
```

#### Set different limits for different tiers:
```sql
-- Free tier: 200 searches/month
UPDATE users 
SET "apiMonthlyLimit" = 200
WHERE subscription_tier = 'free';

-- Pro tier: 2000 searches/month
UPDATE users 
SET "apiMonthlyLimit" = 2000
WHERE subscription_tier = 'pro';

-- Premium tier: Unlimited
UPDATE users 
SET "apiMonthlyLimit" = NULL
WHERE subscription_tier = 'premium';
```

## How It Works

### 1. Usage Tracking
- **Cached requests don't count** - Only actual API calls are tracked
- **Monthly reset** - Usage resets automatically each month
- **Per-user tracking** - Each user has their own limit

### 2. Limit Enforcement
- When a user makes an API call, the system checks their limit
- If limit exceeded: Returns `429 Too Many Requests` with usage info
- If under limit: API call proceeds and usage is incremented

### 3. Response Format

**Success (under limit):**
```json
{
  "success": true,
  "data": [...],
  "metadata": {
    "apiUsage": {
      "monthlySearches": 150,
      "monthlyLimit": 2000,
      "remaining": 1850
    }
  }
}
```

**Limit Exceeded:**
```json
{
  "success": false,
  "error": "Monthly API limit exceeded",
  "limitExceeded": true,
  "monthlySearches": 2000,
  "monthlyLimit": 2000,
  "remaining": 0,
  "message": "You've reached your monthly limit of 2000 searches..."
}
```

## Usage in Code

### Frontend (Autocomplete)

The autocomplete component needs to pass the session to track usage:

```typescript
// In SlotNameAutocomplete.tsx or similar
const session = localStorage.getItem("huntmaster_session");

const res = await fetch(`/api/slots-suggest?q=${query}&session=${encodeURIComponent(session)}`);
```

### Backend (API Routes)

The `slots-suggest` route automatically:
1. Extracts `userId` from session (if provided)
2. Checks limit before making API calls
3. Increments usage after successful calls
4. Returns usage info in response

**Note:** If no session is provided, requests work normally (backward compatible, but usage isn't tracked).

## Monitoring

### Check User's Current Usage

```sql
SELECT 
  u.username,
  u."apiMonthlyLimit",
  COALESCE(usage."monthlySearches", 0) as current_usage,
  u."apiMonthlyLimit" - COALESCE(usage."monthlySearches", 0) as remaining
FROM users u
LEFT JOIN user_api_usage usage ON u.id = usage."userId" 
  AND usage."currentMonth" = TO_CHAR(NOW(), 'YYYY-MM')
WHERE u.username = 'username_here';
```

### View All Users' Usage

```sql
SELECT 
  u.username,
  u."apiMonthlyLimit",
  COALESCE(usage."monthlySearches", 0) as current_usage,
  u."apiMonthlyLimit" - COALESCE(usage."monthlySearches", 0) as remaining,
  usage."currentMonth"
FROM users u
LEFT JOIN user_api_usage usage ON u.id = usage."userId" 
  AND usage."currentMonth" = TO_CHAR(NOW(), 'YYYY-MM')
ORDER BY current_usage DESC;
```

### Reset Usage (Manual)

```sql
-- Reset a specific user's usage
DELETE FROM user_api_usage 
WHERE "userId" = 'user-id-here';

-- Reset all old monthly records (run monthly via cron)
SELECT reset_monthly_api_usage();
```

## Recommended Limits

Based on usage patterns (20 searches/hour):

- **Free Tier**: 200 searches/month (~10 hours)
- **Starter**: 1,000 searches/month (~50 hours)
- **Pro**: 2,000 searches/month (~100 hours)
- **Premium**: NULL (unlimited)

## Cost Control

With these limits:
- Free tier: ~$2/month cost
- Starter: ~$10/month cost
- Pro: ~$20/month cost
- Premium: Variable (unlimited)

Price accordingly to cover costs + margin!


