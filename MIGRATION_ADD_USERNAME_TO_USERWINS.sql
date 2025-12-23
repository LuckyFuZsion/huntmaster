-- ============================================================================
-- ADD USERNAME COLUMN TO USERWINS TABLE
-- This migration adds a username field to the userWins table and backfills
-- existing data with usernames from the users table.
-- ============================================================================

-- Step 1: Add username column to userWins table
ALTER TABLE "userWins" 
ADD COLUMN IF NOT EXISTS username TEXT;

-- Step 2: Create index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_userWins_username ON "userWins"("username");

-- Step 3: Backfill existing data with usernames from users table
UPDATE "userWins" uw
SET username = u.username
FROM users u
WHERE uw."userId" = u.id::TEXT
  AND uw.username IS NULL;

-- Step 4: Verify the update
SELECT 
  COUNT(*) as total_wins,
  COUNT(username) as wins_with_username,
  COUNT(*) - COUNT(username) as wins_without_username
FROM "userWins";

-- Optional: Show a sample of the updated data
SELECT 
  uw.id,
  uw."userId",
  uw.username,
  uw."gameTitle",
  uw."winAmount",
  uw."xWin"
FROM "userWins" uw
LIMIT 10;








