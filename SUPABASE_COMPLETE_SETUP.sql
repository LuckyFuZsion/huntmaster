-- ============================================================================
-- SUPABASE COMPLETE SETUP SCRIPT
-- Run these SQL scripts in order in your Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- STEP 1: Create Users Table for HuntMaster
-- This is a separate table from your existing SSUsers table
-- ============================================================================

-- Drop the table if it exists with wrong structure (this will fail if it doesn't exist, that's OK)
DROP TABLE IF EXISTS users CASCADE;

-- Create the users table with correct structure
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password TEXT,
  "isAdmin" BOOLEAN DEFAULT false,
  "discordId" TEXT,
  email TEXT,
  "isActive" BOOLEAN DEFAULT true,
  huntmaster BOOLEAN DEFAULT false,
  "huntmasterAdmin" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_discordId ON users("discordId");
CREATE INDEX IF NOT EXISTS idx_users_huntmaster ON users(huntmaster);
CREATE INDEX IF NOT EXISTS idx_users_huntmasterAdmin ON users("huntmasterAdmin");

-- Add comments for documentation
COMMENT ON COLUMN users.huntmaster IS 'Access flag for HuntMaster application. Only users with huntmaster=true can access the app.';
COMMENT ON COLUMN users."huntmasterAdmin" IS 'Admin flag for HuntMaster application. Only one user should have this set to true.';

-- Create function to ensure only one HuntMaster admin at a time
CREATE OR REPLACE FUNCTION ensure_single_huntmaster_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting huntmasterAdmin to true, set all others to false
  IF NEW."huntmasterAdmin" = true THEN
    UPDATE users 
    SET "huntmasterAdmin" = false 
    WHERE id != NEW.id AND "huntmasterAdmin" = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce single admin rule
DROP TRIGGER IF EXISTS trigger_single_huntmaster_admin ON users;
CREATE TRIGGER trigger_single_huntmaster_admin
  BEFORE INSERT OR UPDATE OF "huntmasterAdmin" ON users
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_huntmaster_admin();

-- ============================================================================
-- STEP 2: Create Slots Table
-- Stores user's bonus hunt slots/games
-- ============================================================================

CREATE TABLE IF NOT EXISTS slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  bet NUMERIC NOT NULL,
  win NUMERIC,
  "userId" TEXT NOT NULL,  -- Stored as string from session
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_slots_userId ON slots("userId");
CREATE INDEX IF NOT EXISTS idx_slots_name ON slots(name);

-- ============================================================================
-- STEP 3: Create User Settings Table
-- Stores user preferences and settings
-- ============================================================================

CREATE TABLE IF NOT EXISTS "userSettings" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT UNIQUE NOT NULL,
  "startBalance" TEXT,
  "endBalance" TEXT,
  "colourTheme" TEXT DEFAULT 'blue',
  "selectedFont" TEXT DEFAULT 'Arial',
  "fontSize" INTEGER DEFAULT 24,
  "cornerRadius" TEXT DEFAULT '20px',
  "spiderColors" JSONB,
  "spiderTextColors" JSONB,
  "spiderFontFamily" TEXT,
  "spiderBorderWidth" INTEGER,
  "spiderHeaderText" TEXT,
  "spiderSize" TEXT,
  "spiderRadius" TEXT,
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_userSettings_userId ON "userSettings"("userId");

-- ============================================================================
-- STEP 4: Create User Wins Table
-- Stores individual win records for games
-- ============================================================================

CREATE TABLE IF NOT EXISTS "userWins" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL,
  "gameTitle" TEXT NOT NULL,
  "gameSlug" TEXT,
  provider TEXT,
  bet NUMERIC NOT NULL,
  "winAmount" NUMERIC NOT NULL,
  "xWin" NUMERIC NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_userWins_userId ON "userWins"("userId");
CREATE INDEX IF NOT EXISTS idx_userWins_gameTitle ON "userWins"("gameTitle");

-- ============================================================================
-- STEP 5: Create Current Game Table
-- Stores the user's currently selected game
-- ============================================================================

CREATE TABLE IF NOT EXISTS "currentGame" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT UNIQUE NOT NULL,
  "gameTitle" TEXT NOT NULL,
  provider TEXT,
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_currentGame_userId ON "currentGame"("userId");

-- ============================================================================
-- STEP 6: Row Level Security (RLS)
-- Choose ONE of the following options:
-- ============================================================================

-- OPTION A: Disable RLS (Recommended if using service_role key for server-side)
-- Service role key bypasses RLS anyway, so this simplifies things
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE slots DISABLE ROW LEVEL SECURITY;
ALTER TABLE "userSettings" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "userWins" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "currentGame" DISABLE ROW LEVEL SECURITY;

-- OPTION B: Enable RLS with permissive policies (if you want RLS enabled)
-- Uncomment the following if you prefer to use RLS:
/*
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE "userSettings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "userWins" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "currentGame" ENABLE ROW LEVEL SECURITY;

-- Create permissive policies (adjust based on your auth needs)
CREATE POLICY "Allow all operations for authenticated users" ON users FOR ALL USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON slots FOR ALL USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON "userSettings" FOR ALL USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON "userWins" FOR ALL USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON "currentGame" FOR ALL USING (true);
*/

-- ============================================================================
-- STEP 7: Create Your First HuntMaster User(s)
-- You can create users manually or migrate from Firebase/Firestore
-- ============================================================================

-- Option 1: Create a new user manually
-- Replace with your actual values:
/*
INSERT INTO users (username, password, huntmaster, "huntmasterAdmin", "isActive")
VALUES (
  'your_username',
  'hashed_password_here',  -- Use bcrypt hash from your Firebase/Firestore
  true,  -- Grant HuntMaster access
  true,  -- Make them admin (only one admin allowed)
  true
);
*/

-- Option 2: Create user by Discord ID (if migrating from existing system)
-- First, create the user, then grant access:
/*
INSERT INTO users (username, "discordId", huntmaster, "huntmasterAdmin", "isActive")
VALUES (
  'your_username',
  'your_discord_id',
  true,
  true,
  true
);
*/

-- Option 3: Bulk insert users from a list
-- You'll need to hash passwords first (use bcrypt):
/*
INSERT INTO users (username, password, huntmaster, "isActive")
VALUES 
  ('user1', 'hashed_password_1', true, true),
  ('user2', 'hashed_password_2', true, true),
  ('user3', 'hashed_password_3', true, true);
*/

-- Then set ONE admin:
/*
UPDATE users 
SET "huntmasterAdmin" = true 
WHERE username = 'your_admin_username';
*/

-- ============================================================================
-- VERIFICATION: Check that everything was created correctly
-- ============================================================================

-- Verify all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('users', 'slots', 'userSettings', 'userWins', 'currentGame')
ORDER BY table_name;

-- Verify huntmaster column exists on users table
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'huntmaster';

-- Check which users have HuntMaster access
SELECT username, huntmaster, "huntmasterAdmin", "isActive", "createdAt"
FROM users
ORDER BY username;

-- Verify only ONE HuntMaster admin exists
SELECT 
  COUNT(*) as huntmaster_admin_count,
  STRING_AGG(username, ', ') as admin_usernames
FROM users 
WHERE "huntmasterAdmin" = true;

-- Count total HuntMaster users
SELECT 
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE huntmaster = true) as users_with_access,
  COUNT(*) FILTER (WHERE "huntmasterAdmin" = true) as admins
FROM users;

