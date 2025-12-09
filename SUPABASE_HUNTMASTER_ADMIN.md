# HuntMaster Admin Setup

## Overview

HuntMaster uses a **separate admin system** from your main application:
- `isAdmin` - Admin flag for your main application (existing)
- `huntmasterAdmin` - Admin flag for HuntMaster (new, separate)
- **Only ONE user can be HuntMaster admin at a time**

## Database Setup

The `SUPABASE_COMPLETE_SETUP.sql` script automatically:
1. Adds the `huntmasterAdmin` column
2. Creates a trigger to ensure only ONE admin exists at a time
3. Prevents multiple users from being HuntMaster admin simultaneously

## Setting the HuntMaster Admin

After running the setup SQL, set your ONE HuntMaster admin:

### By Username
```sql
UPDATE users 
SET "huntmasterAdmin" = true 
WHERE username = 'your_username_here';
```

### By Discord ID
```sql
UPDATE users 
SET "huntmasterAdmin" = true 
WHERE "discordId" = 'your_discord_id_here';
```

**Important**: The trigger will automatically unset any other users who were HuntMaster admin when you set a new one.

## How It Works

1. **Login**: When a user logs in, their session uses `huntmasterAdmin` (not `isAdmin`) to determine admin status
2. **Single Admin**: The database trigger ensures only one user can have `huntmasterAdmin = true` at any time
3. **Separation**: Your main app's `isAdmin` flag is completely separate and unaffected

## Verification

Check who is the HuntMaster admin:
```sql
SELECT username, "huntmasterAdmin", "isAdmin"
FROM users 
WHERE "huntmasterAdmin" = true;
```

Verify only one admin exists:
```sql
SELECT 
  COUNT(*) as huntmaster_admin_count,
  STRING_AGG(username, ', ') as admin_usernames
FROM users 
WHERE "huntmasterAdmin" = true;
```

Should return: `huntmaster_admin_count = 1`

## Changing the Admin

To change the HuntMaster admin to a different user, simply run:
```sql
UPDATE users 
SET "huntmasterAdmin" = true 
WHERE username = 'new_admin_username';
```

The trigger will automatically unset the previous admin.

## Important Notes

- **Separation**: `isAdmin` and `huntmasterAdmin` are completely independent
- **Single Admin**: Only ONE user can be HuntMaster admin (enforced by database trigger)
- **Automatic Unset**: When setting a new admin, the old admin is automatically unset
- **Access Required**: The admin user must also have `huntmaster = true` to access the app










