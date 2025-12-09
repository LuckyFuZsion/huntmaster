-- Enable real-time replication for tables that need live updates
-- Run this in your Supabase SQL Editor after running SUPABASE_COMPLETE_SETUP.sql

-- Enable real-time for the key tables (skips any that are already added)
DO $$
DECLARE 
  target_tables TEXT[] := ARRAY['slots', 'userSettings', 'currentGame', 'userWins'];
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY target_tables LOOP
    BEGIN
      EXECUTE format(
        'ALTER PUBLICATION supabase_realtime ADD TABLE %I;',
        tbl
      );
    EXCEPTION WHEN duplicate_object THEN
      RAISE NOTICE 'Table "%" already in supabase_realtime publication, skipping.', tbl;
    END;
  END LOOP;
END $$;

-- Verify real-time is enabled
SELECT 
  schemaname,
  tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;









