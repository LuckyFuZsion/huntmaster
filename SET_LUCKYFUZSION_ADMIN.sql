-- ============================================================================
-- SET LUCKYFUZSION AS ADMIN
-- ============================================================================

-- Step 1: Check current admin status
SELECT 
  id,
  username,
  "huntmasterAdmin",
  "isAdmin"
FROM users
WHERE username = 'LuckyFuZsion';

-- Step 2: Set LuckyFuZsion as HuntMaster admin
-- Note: The trigger will automatically unset any other admin
UPDATE users
SET "huntmasterAdmin" = true
WHERE username = 'LuckyFuZsion';

-- Step 3: Verify admin status
SELECT 
  id,
  username,
  "huntmasterAdmin",
  "isAdmin",
  huntmaster,
  "isActive"
FROM users
WHERE username = 'LuckyFuZsion';

-- Step 4: Verify only one admin exists
SELECT 
  COUNT(*) as admin_count,
  STRING_AGG(username, ', ') as admin_usernames
FROM users 
WHERE "huntmasterAdmin" = true;








