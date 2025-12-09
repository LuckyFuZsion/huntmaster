-- ============================================================================
-- HANDLE LEGACY USERIDS IN USERSETTINGS
-- Some userIds in userSettings are not UUIDs (legacy IDs from Firestore)
-- This script creates users with new UUIDs and updates userSettings to reference them
-- ============================================================================

-- Step 1: See what legacy userIds exist
SELECT DISTINCT
  us."userId",
  COUNT(*) as settings_count
FROM "userSettings" us
LEFT JOIN users u ON us."userId" = u.id::TEXT
WHERE u.id IS NULL
  AND us."userId" !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
GROUP BY us."userId";

-- Step 2: Create users for legacy IDs with new UUIDs
-- You'll need to manually map the usernames
-- Example:
INSERT INTO users (id, username, "isActive", huntmaster, "createdAt")
VALUES 
  (gen_random_uuid(), 'Psychosis', true, true, NOW()),
  (gen_random_uuid(), 'Steve', true, true, NOW()),
  (gen_random_uuid(), 'User2', true, true, NOW()),
  (gen_random_uuid(), 'UserM9a5oc8MWj7TWiRO4VcT', true, true, NOW())
ON CONFLICT (username) DO NOTHING;

-- Step 3: Update userSettings to use new user IDs
-- You'll need to manually map old userIds to new user IDs
-- Example:
-- UPDATE "userSettings" 
-- SET "userId" = (SELECT id::TEXT FROM users WHERE username = 'Psychosis')
-- WHERE "userId" = 'legacy_Psychosis';

-- Or create a mapping table first:
CREATE TEMP TABLE userid_mapping (
  old_userId TEXT,
  new_userId TEXT,
  username TEXT
);

INSERT INTO userid_mapping VALUES
  ('legacy_Psychosis', (SELECT id::TEXT FROM users WHERE username = 'Psychosis'), 'Psychosis'),
  ('legacy_Steve', (SELECT id::TEXT FROM users WHERE username = 'Steve'), 'Steve'),
  ('2', (SELECT id::TEXT FROM users WHERE username = 'User2'), 'User2'),
  ('M9a5oc8MWj7TWiRO4VcT', (SELECT id::TEXT FROM users WHERE username = 'UserM9a5oc8MWj7TWiRO4VcT'), 'UserM9a5oc8MWj7TWiRO4VcT');

-- Then update userSettings:
UPDATE "userSettings" us
SET "userId" = m.new_userId
FROM userid_mapping m
WHERE us."userId" = m.old_userId;

-- Verify
SELECT 
  us."userId",
  u.username,
  u.id
FROM "userSettings" us
LEFT JOIN users u ON us."userId" = u.id::TEXT
ORDER BY u.username;





