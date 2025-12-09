-- ============================================================================
-- MIGRATE USERS FROM USERSETTINGS TO USERS TABLE
-- This script finds userIds in userSettings that don't have corresponding
-- entries in the users table and creates users for them.
-- ============================================================================

-- Step 1: Find userIds in userSettings that don't have matching users
SELECT DISTINCT
  us."userId",
  COUNT(*) as settings_count
FROM "userSettings" us
LEFT JOIN users u ON us."userId" = u.id::TEXT
WHERE u.id IS NULL
GROUP BY us."userId"
ORDER BY settings_count DESC;

-- Step 2: Show sample of what we're working with
SELECT 
  us."userId",
  us.id as settings_id,
  us."updatedAt",
  u.id as user_id,
  u.username
FROM "userSettings" us
LEFT JOIN users u ON us."userId" = u.id::TEXT
LIMIT 20;

-- Step 3: Create users for missing userIds
-- Note: This creates users with auto-generated usernames
-- You'll need to update usernames manually afterward
INSERT INTO users (id, username, "isActive", huntmaster, "createdAt")
SELECT 
  us."userId"::UUID as id,
  'user_' || SUBSTRING(us."userId"::TEXT, 1, 8) as username, -- Auto-generated username
  true as "isActive",
  true as huntmaster, -- Grant HuntMaster access
  COALESCE(MIN(us."updatedAt"), NOW()) as "createdAt"
FROM "userSettings" us
LEFT JOIN users u ON us."userId" = u.id::TEXT
WHERE u.id IS NULL
GROUP BY us."userId"
ON CONFLICT (id) DO NOTHING; -- Skip if user already exists

-- Step 4: Verify the migration
SELECT 
  COUNT(*) as total_userSettings,
  COUNT(DISTINCT us."userId") as unique_userIds,
  COUNT(DISTINCT u.id) as users_with_accounts,
  COUNT(DISTINCT us."userId") - COUNT(DISTINCT u.id) as orphaned_settings
FROM "userSettings" us
LEFT JOIN users u ON us."userId" = u.id::TEXT;

-- Step 5: Show newly created users (with auto-generated usernames to update)
SELECT 
  id,
  username,
  "createdAt",
  huntmaster,
  "isActive"
FROM users
WHERE username LIKE 'user_%'
ORDER BY "createdAt" DESC;

-- ============================================================================
-- AFTER RUNNING: Update usernames manually
-- ============================================================================
-- You'll need to update the auto-generated usernames with real usernames:
-- UPDATE users SET username = 'actual_username' WHERE id = 'user-uuid-here';





