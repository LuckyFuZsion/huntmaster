-- ============================================================================
-- API Usage Tracking and Capping
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- Create user_api_usage table to track API calls per user
CREATE TABLE IF NOT EXISTS user_api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "monthlySearches" INTEGER DEFAULT 0,
  "monthlyLimit" INTEGER DEFAULT 2000, -- Default limit: 2000 searches/month
  "currentMonth" TEXT NOT NULL, -- Format: "2025-11" for monthly reset
  "lastResetAt" TIMESTAMPTZ DEFAULT NOW(),
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE("userId", "currentMonth")
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_api_usage_userId ON user_api_usage("userId");
CREATE INDEX IF NOT EXISTS idx_user_api_usage_month ON user_api_usage("currentMonth");

-- Add monthlyLimit column to users table for per-user limits (optional, for tier-based pricing)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'apiMonthlyLimit'
  ) THEN
    ALTER TABLE users ADD COLUMN "apiMonthlyLimit" INTEGER DEFAULT 2000;
    COMMENT ON COLUMN users."apiMonthlyLimit" IS 'Monthly API search limit for this user. NULL = unlimited.';
  END IF;
END $$;

-- Drop any legacy function definitions (all schemas / signatures) to avoid duplicates
DO $$
DECLARE 
  r RECORD;
BEGIN
  FOR r IN
    SELECT 
      n.nspname AS schema_name,
      p.proname AS function_name,
      pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname IN (
      'get_user_api_usage',
      'increment_api_usage',
      'reset_monthly_api_usage'
    )
  LOOP
    EXECUTE format(
      'DROP FUNCTION IF EXISTS %I.%I(%s);',
      r.schema_name,
      r.function_name,
      r.args
    );
  END LOOP;
END $$;

-- Function to get or create usage record for current month
CREATE OR REPLACE FUNCTION get_user_api_usage(p_user_id UUID)
RETURNS TABLE(
  monthly_searches INTEGER,
  monthly_limit INTEGER,
  current_month TEXT,
  can_make_request BOOLEAN
) AS $$
DECLARE
  v_current_month TEXT := TO_CHAR(NOW(), 'YYYY-MM');
  v_user_limit INTEGER;
  v_usage_record RECORD;
BEGIN
  -- Get user's limit (from users table or default)
  SELECT COALESCE("apiMonthlyLimit", 2000) INTO v_user_limit
  FROM users WHERE id = p_user_id;
  
  -- NULL means unlimited
  IF v_user_limit IS NULL THEN
    RETURN QUERY SELECT 0, NULL, v_current_month, true;
    RETURN;
  END IF;
  
  -- Get or create usage record for current month
  INSERT INTO user_api_usage ("userId", "monthlySearches", "monthlyLimit", "currentMonth", "lastResetAt")
  VALUES (p_user_id, 0, v_user_limit, v_current_month, NOW())
  ON CONFLICT ("userId", "currentMonth") DO NOTHING;
  
  -- Get current usage
  SELECT 
    u."monthlySearches",
    u."monthlyLimit",
    u."currentMonth",
    (u."monthlySearches" < u."monthlyLimit") as can_make_request
  INTO v_usage_record
  FROM user_api_usage u
  WHERE u."userId" = p_user_id AND u."currentMonth" = v_current_month;
  
  RETURN QUERY SELECT 
    v_usage_record."monthlySearches",
    v_usage_record."monthlyLimit",
    v_usage_record."currentMonth",
    v_usage_record.can_make_request;
END;
$$ LANGUAGE plpgsql;

-- Function to increment usage count
CREATE OR REPLACE FUNCTION increment_api_usage(p_user_id UUID)
RETURNS TABLE(
  monthly_searches INTEGER,
  monthly_limit INTEGER,
  remaining INTEGER
) AS $$
DECLARE
  v_current_month TEXT := TO_CHAR(NOW(), 'YYYY-MM');
  v_user_limit INTEGER;
  v_updated_usage INTEGER;
BEGIN
  -- Get user's limit
  SELECT COALESCE("apiMonthlyLimit", 2000) INTO v_user_limit
  FROM users WHERE id = p_user_id;
  
  -- NULL means unlimited - just return
  IF v_user_limit IS NULL THEN
    RETURN QUERY SELECT 0, NULL, NULL;
    RETURN;
  END IF;
  
  -- Increment usage
  UPDATE user_api_usage
  SET 
    "monthlySearches" = "monthlySearches" + 1,
    "updatedAt" = NOW()
  WHERE "userId" = p_user_id AND "currentMonth" = v_current_month
  RETURNING "monthlySearches" INTO v_updated_usage;
  
  -- If no record exists, create one
  IF v_updated_usage IS NULL THEN
    INSERT INTO user_api_usage ("userId", "monthlySearches", "monthlyLimit", "currentMonth")
    VALUES (p_user_id, 1, v_user_limit, v_current_month)
    RETURNING "monthlySearches" INTO v_updated_usage;
  END IF;
  
  RETURN QUERY SELECT 
    v_updated_usage,
    v_user_limit,
    GREATEST(0, v_user_limit - v_updated_usage);
END;
$$ LANGUAGE plpgsql;

-- Function to reset monthly usage (can be run via cron job)
CREATE OR REPLACE FUNCTION reset_monthly_api_usage()
RETURNS INTEGER AS $$
DECLARE
  v_current_month TEXT := TO_CHAR(NOW(), 'YYYY-MM');
  v_reset_count INTEGER;
BEGIN
  -- Delete old usage records (older than current month)
  DELETE FROM user_api_usage
  WHERE "currentMonth" < v_current_month;
  
  GET DIAGNOSTICS v_reset_count = ROW_COUNT;
  
  RETURN v_reset_count;
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON TABLE user_api_usage IS 'Tracks API search usage per user per month for rate limiting';
COMMENT ON FUNCTION get_user_api_usage IS 'Gets current month API usage for a user. Returns can_make_request boolean.';
COMMENT ON FUNCTION increment_api_usage IS 'Increments API usage count for a user. Returns updated counts.';
COMMENT ON FUNCTION reset_monthly_api_usage IS 'Cleans up old monthly usage records. Run via cron job monthly.';


