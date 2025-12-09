-- ============================================================================
-- UPDATE USERWINS WITH DISCORD USERNAMES FROM USERS TABLE
-- This SQL ensures userWins.username always matches users.username
-- The users table should already contain Discord usernames from Discord sign-in
-- ============================================================================

-- Step 1: See current state - check which userWins don't match users table
SELECT 
  u."discordId",
  uw.id,
  uw."userId",
  uw.username as current_username,
  u.username as user_table_username,
  CASE 
    WHEN uw.username = u.username THEN '✅ Match'
    WHEN uw.username IS NULL THEN '⚠️ Missing'
    ELSE '❌ Mismatch'
  END as status
FROM "userWins" uw
LEFT JOIN users u ON uw."userId" = u.id::TEXT
ORDER BY uw."createdAt" DESC;

-- Step 2: Update ALL userWins to use usernames from users table
-- This ensures consistency - userWins will always have the correct Discord username
UPDATE "userWins" uw
SET username = u.username
FROM users u
WHERE uw."userId" = u.id::TEXT
  AND (uw.username IS NULL OR uw.username != u.username);

-- Step 3: Verify the update
SELECT 
  COUNT(*) as total_wins,
  COUNT(username) as wins_with_username,
  COUNT(*) - COUNT(username) as wins_without_username
FROM "userWins";

-- Step 4: Show sample of updated data
SELECT 
  u."discordId",
  uw."gameTitle",
  uw.id,
  uw."userId",
  uw.username,
  uw."winAmount"
FROM "userWins" uw
LEFT JOIN users u ON uw."userId" = u.id::TEXT
ORDER BY uw."createdAt" DESC
LIMIT 20;

-- Step 5: Check for users that may need Discord username updates
-- Users with temporary usernames (starting with 'user_') that have Discord IDs
-- These should be updated with their actual Discord usernames
SELECT 
  "createdAt",
  "discordId",
  id,
  username
FROM users
WHERE username LIKE 'user_%'
  AND "discordId" IS NOT NULL
ORDER BY "createdAt" DESC;

-- ============================================================================
-- NOTE: If users have temporary usernames but Discord IDs, you can:
-- 1. Have them log in via Discord again (will update username automatically)
-- 2. Or manually update: UPDATE users SET username = 'DiscordUsername' WHERE id = 'user-id';
-- ============================================================================

