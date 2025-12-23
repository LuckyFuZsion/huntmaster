-- ============================================================================
-- FIX USERWINS USERNAME FOR LUCKYFUZSION
-- Update userWins table to show LuckyFuZsion instead of user_6777c049
-- ============================================================================

-- Step 1: Check current state
SELECT 
  uw.id,
  uw."userId",
  uw.username,
  u.username as user_table_username,
  uw."gameTitle",
  uw."winAmount"
FROM "userWins" uw
LEFT JOIN users u ON uw."userId" = u.id::TEXT
WHERE uw.username = 'user_6777c049' OR uw."userId" = '9079beea-65d8-4fe5-b6e4-bf962d062e16'
ORDER BY uw."createdAt" DESC;

-- Step 2: Update userWins to use LuckyFuZsion username
UPDATE "userWins" uw
SET username = u.username
FROM users u
WHERE uw."userId" = u.id::TEXT
  AND u.username = 'LuckyFuZsion'
  AND (uw.username IS NULL OR uw.username != 'LuckyFuZsion');

-- Step 3: Also update any wins that still reference the old UUID
UPDATE "userWins"
SET username = 'LuckyFuZsion'
WHERE username = 'user_6777c049';

-- Step 4: Verify the update
SELECT 
  uw.id,
  uw."userId",
  uw.username,
  u.username as user_table_username,
  CASE 
    WHEN uw.username = u.username THEN '✅ Match'
    ELSE '❌ Mismatch'
  END as status
FROM "userWins" uw
LEFT JOIN users u ON uw."userId" = u.id::TEXT
WHERE uw."userId" = '9079beea-65d8-4fe5-b6e4-bf962d062e16' OR uw.username = 'LuckyFuZsion'
ORDER BY uw."createdAt" DESC;








