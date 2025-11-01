-- Enable real-time replication for tables that need live updates
-- Run this in your Supabase SQL Editor after running SUPABASE_COMPLETE_SETUP.sql

-- Enable real-time for slots table
ALTER PUBLICATION supabase_realtime ADD TABLE "slots";

-- Enable real-time for userSettings table
ALTER PUBLICATION supabase_realtime ADD TABLE "userSettings";

-- Enable real-time for currentGame table
ALTER PUBLICATION supabase_realtime ADD TABLE "currentGame";

-- Enable real-time for userWins table (optional, for win tracking widgets)
ALTER PUBLICATION supabase_realtime ADD TABLE "userWins";

-- Verify real-time is enabled
SELECT 
  schemaname,
  tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;


