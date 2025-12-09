-- ============================================================================
-- Add Plan Expiration Column to Users Table
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- Add planExpiresAt column to users table for tracking subscription expiration
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'planExpiresAt'
  ) THEN
    ALTER TABLE users ADD COLUMN "planExpiresAt" TIMESTAMPTZ;
    COMMENT ON COLUMN users."planExpiresAt" IS 'When the user''s subscription plan expires. NULL = no expiration.';
  END IF;
END $$;

-- Also add snake_case version for compatibility
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'plan_expires_at'
  ) THEN
    ALTER TABLE users ADD COLUMN "plan_expires_at" TIMESTAMPTZ;
    COMMENT ON COLUMN users."plan_expires_at" IS 'When the user''s subscription plan expires. NULL = no expiration.';
  END IF;
END $$;

-- Create index for fast lookups of expiring plans
CREATE INDEX IF NOT EXISTS idx_users_planExpiresAt ON users("planExpiresAt") WHERE "planExpiresAt" IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_plan_expires_at ON users("plan_expires_at") WHERE "plan_expires_at" IS NOT NULL;


