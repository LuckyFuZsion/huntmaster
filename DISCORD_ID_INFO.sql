-- ============================================================================
-- DISCORD ID INFORMATION
-- Discord IDs are permanent numeric identifiers that never change
-- ============================================================================

-- Check which users have Discord IDs linked
SELECT 
  username,
  id,
  "discordId",
  huntmaster,
  "isActive",
  "createdAt",
  CASE 
    WHEN "discordId" IS NOT NULL THEN '✅ Linked to Discord'
    ELSE '❌ Not linked'
  END as discord_status
FROM users
ORDER BY "createdAt" DESC;

-- Find users without Discord IDs
SELECT 
  username,
  id,
  "discordId"
FROM users
WHERE "discordId" IS NULL
ORDER BY username;

-- ============================================================================
-- HOW TO LINK DISCORD ID:
-- ============================================================================
-- Option 1: User logs in via Discord (automatic)
-- When user logs in via Discord, their Discord ID is automatically linked
--
-- Option 2: Manual link (if you know the Discord ID)
-- UPDATE users 
-- SET "discordId" = 'discord_user_id_here'
-- WHERE username = 'llandri';
--
-- To find someone's Discord ID:
-- 1. Enable Developer Mode in Discord settings
-- 2. Right-click on their username → Copy ID
-- 3. The ID is a long number like: 363584346122354690
-- ============================================================================








