-- ============================================================================
-- FIX USERNAME FOR LUCKYFUZSION
-- Update the username for UUID 6777c049-6312-4325-8556-dee7f70d5dae to LuckyFuZsion
-- ============================================================================

-- Step 1: Check current state
SELECT 
  id,
  username,
  "discordId",
  huntmaster,
  "isActive",
  "huntmasterAdmin"
FROM users
WHERE id = '6777c049-6312-4325-8556-dee7f70d5dae';

-- Step 2: Update username to LuckyFuZsion and ensure authorization
UPDATE users
SET 
  username = 'LuckyFuZsion',
  huntmaster = true,
  "isActive" = true
WHERE id = '6777c049-6312-4325-8556-dee7f70d5dae';

-- Step 3: Verify the update
SELECT 
  id,
  username,
  "discordId",
  huntmaster,
  "isActive",
  "huntmasterAdmin"
FROM users
WHERE id = '6777c049-6312-4325-8556-dee7f70d5dae';

-- Step 4: Update userWins to use the correct username
UPDATE "userWins"
SET username = 'LuckyFuZsion'
WHERE "userId" = '6777c049-6312-4325-8556-dee7f70d5dae';

-- Step 5: Check if you want to set this user as admin
-- Uncomment the line below if LuckyFuZsion should be the HuntMaster admin:
-- UPDATE users SET "huntmasterAdmin" = true WHERE id = '6777c049-6312-4325-8556-dee7f70d5dae';








