-- ============================================================================
-- FIX AUTHORIZATION FOR EXISTING DISCORD USERS
-- This script ensures Discord users have proper authorization flags
-- ============================================================================

-- Step 1: Check current authorization status
SELECT 
  id,
  username,
  "discordId",
  huntmaster,
  "isActive",
  "huntmasterAdmin",
  "createdAt",
  CASE 
    WHEN "discordId" IS NOT NULL AND huntmaster = false THEN '❌ Discord user not authorized'
    WHEN "discordId" IS NOT NULL AND "isActive" = false THEN '❌ Discord user inactive'
    WHEN "discordId" IS NOT NULL AND huntmaster = true AND "isActive" = true THEN '✅ Authorized'
    ELSE '⚠️ Check needed'
  END as status
FROM users
WHERE "discordId" IS NOT NULL
ORDER BY "createdAt" DESC;

-- Step 2: Authorize all Discord users who were previously authorized
-- This grants huntmaster access and sets them as active
UPDATE users
SET 
  huntmaster = true,
  "isActive" = true
WHERE "discordId" IS NOT NULL
  AND (huntmaster = false OR "isActive" = false);

-- Step 3: Verify the fix
SELECT 
  COUNT(*) as total_discord_users,
  COUNT(*) FILTER (WHERE huntmaster = true AND "isActive" = true) as authorized_users,
  COUNT(*) FILTER (WHERE huntmaster = false OR "isActive" = false) as unauthorized_users
FROM users
WHERE "discordId" IS NOT NULL;

-- Step 4: Show authorized Discord users
SELECT 
  id,
  username,
  "discordId",
  huntmaster,
  "isActive",
  "createdAt"
FROM users
WHERE "discordId" IS NOT NULL
  AND huntmaster = true
  AND "isActive" = true
ORDER BY username;








