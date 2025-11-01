# Supabase Users Table Migration

Since you already have a `users` table that uses Discord auth, we have two options:

## Option 1: Use Existing Users Table (Recommended)

**Pros:**
- Single source of truth for users
- Share Discord authentication between systems
- Easier to manage one user base

**Cons:**
- Need to ensure all required columns exist
- Might need to add columns if they don't exist

### Step 1: Check Your Existing Table

Visit: `http://localhost:3000/api/test/supabase-inspect-users`

This will show:
- What columns already exist
- What columns are missing
- What needs to be added

### Step 2: Add Missing Columns (if any)

Run this SQL in your Supabase SQL Editor to add missing columns:

```sql
-- Add missing columns if they don't exist
-- (These are safe - they won't break existing data)

-- Add password column if needed (for non-Discord auth fallback)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'password') THEN
    ALTER TABLE users ADD COLUMN password TEXT;
  END IF;
END $$;

-- Add isAdmin column if needed
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'isAdmin') THEN
    ALTER TABLE users ADD COLUMN "isAdmin" BOOLEAN DEFAULT false;
  END IF;
  -- Also check for snake_case variant
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'is_admin') THEN
    ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Add isActive column if needed
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'isActive') THEN
    ALTER TABLE users ADD COLUMN "isActive" BOOLEAN DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'is_active') THEN
    ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;
END $$;

-- Add createdAt if needed
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'createdAt') THEN
    ALTER TABLE users ADD COLUMN "createdAt" TIMESTAMPTZ DEFAULT NOW();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'created_at') THEN
    ALTER TABLE users ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Ensure username is unique if not already
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'users_username_key'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_username_key UNIQUE (username);
  END IF;
END $$;

-- Create indexes if needed
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_discordId ON users("discordId");
```

## Option 2: Create Separate HuntMaster Users Table

If you want to keep them completely separate, create a `huntmasterUsers` table:

```sql
CREATE TABLE IF NOT EXISTS "huntmasterUsers" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password TEXT,
  "isAdmin" BOOLEAN DEFAULT false,
  "discordId" TEXT,
  email TEXT,
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_huntmasterUsers_username ON "huntmasterUsers"(username);
CREATE INDEX IF NOT EXISTS idx_huntmasterUsers_discordId ON "huntmasterUsers"("discordId");
```

Then update `lib/supabase-admin.ts` to use `huntmasterUsers` instead of `users`.

## Recommendation

**I recommend Option 1** (using existing users table) because:
1. You already use Discord auth for both
2. Simpler - one user record per person
3. Can link huntmaster data to the same user via Discord ID
4. Easier to manage permissions/admin access

The code in `supabase-admin.ts` already supports querying by `discordId`, so it should work with your existing setup.

## Important: HuntMaster Access Control

⚠️ **After adding the `huntmaster` column, you must set it to `true` for users who should have access.**

See `SUPABASE_HUNTMASTER_COLUMN.md` for detailed instructions on:
- Adding the `huntmaster` column
- Setting access for existing users
- Security considerations

**By default, all users will have `huntmaster = false` for security.** Only users with `huntmaster = true` can log into HuntMaster.

## Next Steps

1. Run the inspection endpoint: `/api/test/supabase-inspect-users`
2. Check what columns you need to add
3. Run the SQL above to add missing columns
4. Test with: `/api/test/supabase`

