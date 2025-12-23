-- ============================================================================
-- MAP USERIDS TO USERNAMES
-- This script shows how to map userIds from userWins to usernames from users table
-- ============================================================================

-- Option 1: Show all userIds in userWins and their corresponding usernames
-- This handles the UUID::TEXT conversion properly
SELECT DISTINCT
  uw."userId",
  u.username,
  COUNT(*) as win_count
FROM "userWins" uw
LEFT JOIN users u ON uw."userId" = u.id::TEXT
GROUP BY uw."userId", u.username
ORDER BY win_count DESC;

-- Option 2: Show userIds that don't have matching usernames
SELECT DISTINCT
  uw."userId",
  COUNT(*) as win_count
FROM "userWins" uw
LEFT JOIN users u ON uw."userId" = u.id::TEXT
WHERE u.id IS NULL
GROUP BY uw."userId"
ORDER BY win_count DESC;

-- Option 3: Show all users and their IDs (to verify users exist)
SELECT 
  id,
  id::TEXT as id_as_text,
  username,
  "createdAt"
FROM users
ORDER BY "createdAt" DESC;

-- Option 4: Check if userIds match UUID format
SELECT 
  uw."userId",
  CASE 
    WHEN uw."userId" ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 'Valid UUID'
    ELSE 'Not a UUID'
  END as uuid_format,
  COUNT(*) as win_count
FROM "userWins" uw
GROUP BY uw."userId"
ORDER BY win_count DESC;

-- Option 5: Complete mapping with sample win data
SELECT 
  uw."userId",
  u.username,
  u.id as user_table_id,
  COUNT(*) as total_wins,
  MAX(uw."winAmount") as max_win_amount,
  MAX(uw."xWin") as max_x_win
FROM "userWins" uw
LEFT JOIN users u ON uw."userId" = u.id::TEXT
GROUP BY uw."userId", u.username, u.id
ORDER BY total_wins DESC;








