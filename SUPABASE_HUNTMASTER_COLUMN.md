# Adding HuntMaster Access Column

## Overview

Add a `huntmaster` boolean column to the `users` table to control access to the HuntMaster application. Only users with `huntmaster = true` will be able to log in.

## SQL Migration

Run this SQL in your Supabase SQL Editor:

```sql
-- Add huntmaster column to users table
-- This column controls access to the HuntMaster application
-- Defaults to false for security (existing Firebase users will need this set to true)

DO $$ 
BEGIN
  -- Add huntmaster column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'huntmaster'
  ) THEN
    ALTER TABLE users ADD COLUMN huntmaster BOOLEAN DEFAULT false;
    
    -- Create index for faster lookups
    CREATE INDEX IF NOT EXISTS idx_users_huntmaster ON users(huntmaster);
    
    -- Add comment for documentation
    COMMENT ON COLUMN users.huntmaster IS 'Access flag for HuntMaster application. Only users with huntmaster=true can access the app.';
  END IF;
END $$;
```

## Setting Access for Existing Users

After adding the column, you'll need to set `huntmaster = true` for users who should have access:

### Option 1: Set for Specific Users (by username)
```sql
UPDATE users 
SET huntmaster = true 
WHERE username IN ('username1', 'username2', 'username3');
```

### Option 2: Set for All Users (if you want everyone to have access initially)
```sql
UPDATE users 
SET huntmaster = true;
```

### Option 3: Set Based on Another Column (e.g., if you have a role column)
```sql
UPDATE users 
SET huntmaster = true 
WHERE your_role_column = 'admin' OR your_role_column = 'user';
```

### Option 4: Set Based on Discord ID (useful for migrating from Firebase)
```sql
-- If you're migrating existing Firebase users, update by Discord ID
UPDATE users 
SET huntmaster = true 
WHERE "discordId" IN (
  -- Add your Discord IDs here
  'discord_id_1',
  'discord_id_2',
  'discord_id_3'
);
```

## Verification

After running the migration, verify the column was added:

```sql
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'huntmaster';
```

You should see:
- `column_name`: `huntmaster`
- `data_type`: `boolean`
- `column_default`: `false`

## Testing Access

1. Visit: `http://localhost:3000/api/test/supabase-inspect-users`
   - Should show `huntmaster` in the `existingColumns` array

2. Try logging in with a user that has `huntmaster = false`
   - Should see: "HuntMaster access required. Please contact an administrator."

3. Try logging in with a user that has `huntmaster = true`
   - Should successfully log in

## Important Notes

- **Security**: The default is `false` - users must be explicitly granted access
- **Existing Users**: Users already in your database will need `huntmaster = true` set manually
- **New Users**: New users created through the app will have `huntmaster = false` by default unless set during creation
- **Admins**: Admins still need `huntmaster = true` to access the application (this is intentional for security)

## Admin Management

Admins can manage HuntMaster access through the user management interface once the application is switched to Supabase. For now, use SQL to grant access.




