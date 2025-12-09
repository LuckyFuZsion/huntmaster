# Fix: Users Should Be Created in Users Table, Not userSettings

## Problem
When users sign up to HuntMaster, they were being added to the `userSettings` table instead of the `users` table. This is incorrect because:

1. **`users` table** should store:
   - User accounts (username, password, email, etc.)
   - Authentication credentials
   - User permissions (isAdmin, huntmaster, etc.)
   - This is the PRIMARY user data

2. **`userSettings` table** should store:
   - User preferences (theme, font, balances, etc.)
   - Settings that reference a `userId` from the `users` table
   - This is SECONDARY data that depends on users existing

## What Was Fixed

Updated `/api/users/create/route.ts` to:
- ✅ Create users in Supabase `users` table (preferred)
- ✅ Fallback to Firestore if Supabase not available
- ✅ Set `huntmaster = true` by default for new users
- ✅ Properly set admin flags

## Important Notes

### userSettings Should NOT Contain User Accounts
- `userSettings` only stores preferences
- It requires a `userId` that references the `users` table
- If you see entries in `userSettings` without corresponding entries in `users`, those are orphaned records

### Migration Needed
If you have users in `userSettings` that should be in `users`:

1. **Check for orphaned userSettings:**
```sql
SELECT us."userId", us.id
FROM "userSettings" us
LEFT JOIN users u ON us."userId" = u.id::TEXT
WHERE u.id IS NULL;
```

2. **Create users from userSettings data** (if you have username stored somewhere):
   - You'll need to extract usernames from your data
   - Create corresponding entries in `users` table
   - Or migrate the userIds to proper user accounts

## Current Flow (After Fix)

1. User signs up → Creates entry in `users` table
2. User logs in → Session created with `userId` from `users` table
3. User saves settings → Creates/updates entry in `userSettings` table with `userId` reference
4. User wins recorded → Creates entry in `userWins` table with `userId` reference

All tables now properly reference the `users` table as the source of truth for user accounts.





