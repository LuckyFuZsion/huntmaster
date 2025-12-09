-- ============================================================================
-- CLEANUP DUPLICATE USER WINS
-- This script removes duplicate win entries per user+game combination,
-- keeping only:
-- 1. The entry with the highest winAmount
-- 2. The entry with the highest xWin
-- 
-- These could be the same entry if one record has both the highest winAmount
-- and highest xWin, or two different entries if different records have the
-- highest values for each metric.
-- ============================================================================

-- First, let's see what we're working with
SELECT 
  "userId",
  "gameTitle",
  COUNT(*) as duplicate_count,
  MAX("winAmount") as max_win_amount,
  MAX("xWin") as max_x_win
FROM "userWins"
GROUP BY "userId", "gameTitle"
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- ============================================================================
-- STEP 1: Identify entries to keep
-- Keep the entry with highest winAmount and entry with highest xWin for each user+game
-- ============================================================================

-- Create temporary table with entries to keep
WITH entries_to_keep AS (
  -- Get the entry with highest winAmount for each user+game
  SELECT DISTINCT ON ("userId", "gameTitle")
    id,
    "userId",
    "gameTitle"
  FROM "userWins"
  ORDER BY "userId", "gameTitle", "winAmount" DESC, "createdAt" DESC
),
-- Get the entry with highest xWin for each user+game
entries_to_keep_xwin AS (
  SELECT DISTINCT ON ("userId", "gameTitle")
    id,
    "userId",
    "gameTitle"
  FROM "userWins"
  ORDER BY "userId", "gameTitle", "xWin" DESC, "createdAt" DESC
),
-- Combine both (using UNION to handle case where same entry has both)
all_entries_to_keep AS (
  SELECT id FROM entries_to_keep
  UNION
  SELECT id FROM entries_to_keep_xwin
)
-- Delete all entries that are NOT in the keep list
DELETE FROM "userWins"
WHERE id NOT IN (SELECT id FROM all_entries_to_keep);

-- ============================================================================
-- VERIFICATION: Check if cleanup was successful
-- ============================================================================

-- Show remaining duplicates (should be 0 or minimal)
SELECT 
  "userId",
  "gameTitle",
  COUNT(*) as remaining_count
FROM "userWins"
GROUP BY "userId", "gameTitle"
HAVING COUNT(*) > 1
ORDER BY remaining_count DESC;

-- Show summary of kept entries
SELECT 
  "userId",
  "gameTitle",
  COUNT(*) as entries_count,
  MAX("winAmount") as max_win_amount,
  MAX("xWin") as max_x_win
FROM "userWins"
GROUP BY "userId", "gameTitle"
ORDER BY "userId", "gameTitle";





