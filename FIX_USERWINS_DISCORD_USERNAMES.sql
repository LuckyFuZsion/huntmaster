-- ============================================================================
-- FIX TEMPORARY USERNAMES AND SYNC USERWINS
-- ============================================================================

-- Step 1: Update userWins to use usernames from users table
-- This ensures userWins always has the correct Discord username
UPDATE "userWins" uw
SET username = u.username
FROM users u
WHERE uw."userId" = u.id::TEXT
  AND (uw.username IS NULL OR uw.username != u.username);

-- Step 2: Check which users need Discord username updates
SELECT 
  id,
  username,
  "discordId",
  "createdAt",
  CASE 
    WHEN username LIKE 'user_%' THEN '⚠️ Temporary username - needs update'
    WHEN "discordId" IS NULL THEN '⚠️ No Discord ID'
    ELSE '✅ Has Discord username'
  END as status
FROM users
ORDER BY "createdAt" DESC;

-- Step 3: To fix temporary usernames, you have two options:
-- 
-- OPTION A: Have users log in via Discord (recommended)
-- This will automatically update their username with their Discord display name
--
-- OPTION B: Manually update usernames
-- Example:
-- UPDATE users SET username = 'ActualDiscordUsername' WHERE id = '6777c049-6312-4325-8556-dee7f70d5dae';
-- UPDATE users SET username = 'ActualDiscordUsername' WHERE id = '28a00513-1bea-4d5c-938c-c236d5d7470f';
-- UPDATE users SET username = 'ActualDiscordUsername' WHERE id = '658753f3-3fbd-4457-a410-454d49e4cd54';
--
-- Then re-run Step 1 to update userWins

-- Step 4: Verify all userWins have correct usernames
SELECT 
  uw."userId",
  uw.username,
  u.username as user_table_username,
  CASE 
    WHEN uw.username = u.username THEN '✅ Match'
    ELSE '❌ Mismatch'
  END as status,
  COUNT(*) as win_count
FROM "userWins" uw
LEFT JOIN users u ON uw."userId" = u.id::TEXT
GROUP BY uw."userId", uw.username, u.username
ORDER BY win_count DESC;





