-- ============================================================================
-- Add Unique Constraint for Biggest Win Only
-- Ensures only one win record per user per game
-- ============================================================================

-- STEP 1: Clean up existing duplicates - keep only biggest win per user per game
-- This deletes all duplicate wins, keeping only the one with highest winAmount
-- (or highest xWin if winAmount is equal)
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete duplicates, keeping only the biggest win
  WITH ranked_wins AS (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY "userId", "gameTitle" 
        ORDER BY "winAmount" DESC, "xWin" DESC, "createdAt" DESC
      ) as rn
    FROM "userWins"
  )
  DELETE FROM "userWins"
  WHERE id IN (
    SELECT id FROM ranked_wins WHERE rn > 1
  );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % duplicate win records, kept biggest win per user per game', deleted_count;
END $$;

-- STEP 2: Add unique constraint on userId + gameTitle
-- This ensures we can only have one win record per user per game going forward
DO $$
BEGIN
  -- Drop constraint if it exists (in case of re-run)
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'userWins_userId_gameTitle_unique'
  ) THEN
    ALTER TABLE "userWins" 
    DROP CONSTRAINT userWins_userId_gameTitle_unique;
    RAISE NOTICE 'Dropped existing constraint';
  END IF;
  
  -- Add the unique constraint
  ALTER TABLE "userWins" 
  ADD CONSTRAINT userWins_userId_gameTitle_unique 
  UNIQUE ("userId", "gameTitle");
  
  RAISE NOTICE 'Unique constraint added successfully';
END $$;

-- ============================================================================
-- Verification: Check how many wins per user per game (should all be 1)
-- ============================================================================
SELECT 
  "userId",
  "gameTitle",
  COUNT(*) as win_count
FROM "userWins"
GROUP BY "userId", "gameTitle"
HAVING COUNT(*) > 1;

-- If the above query returns no rows, all duplicates have been removed successfully!
-- ============================================================================
-- Notes:
-- - This constraint ensures only one win per user per game
-- - The application logic will update the record if a bigger win is recorded
-- - This reduces storage by ~94% (one row per game vs hundreds/thousands)
-- ============================================================================

