# Supabase Setup Guide

## Prerequisites

You already have Supabase credentials in your `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Database Schema

You need to create these tables in your Supabase project. Go to your Supabase dashboard → SQL Editor and run these commands:

### 1. Users Table
```sql
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password TEXT,
  "isAdmin" BOOLEAN DEFAULT false,
  "discordId" TEXT,
  email TEXT,
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
```

### 2. Slots Table
```sql
CREATE TABLE IF NOT EXISTS slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  bet NUMERIC NOT NULL,
  win NUMERIC,
  "userId" TEXT NOT NULL,  -- Stored as string from session
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_slots_userId ON slots("userId");
CREATE INDEX IF NOT EXISTS idx_slots_name ON slots(name);
```

### 3. User Settings Table
```sql
CREATE TABLE IF NOT EXISTS "userSettings" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT UNIQUE NOT NULL,
  "startBalance" TEXT,
  "endBalance" TEXT,
  "colourTheme" TEXT DEFAULT 'blue',
  "selectedFont" TEXT DEFAULT 'Arial',
  "fontSize" INTEGER DEFAULT 24,
  "cornerRadius" TEXT DEFAULT '20px',
  "spiderColors" JSONB,
  "spiderTextColors" JSONB,
  "spiderFontFamily" TEXT,
  "spiderBorderWidth" INTEGER,
  "spiderHeaderText" TEXT,
  "spiderSize" TEXT,
  "spiderRadius" TEXT,
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_userSettings_userId ON "userSettings"("userId");
```

### 4. User Wins Table
```sql
CREATE TABLE IF NOT EXISTS "userWins" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL,
  "gameTitle" TEXT NOT NULL,
  "gameSlug" TEXT,
  provider TEXT,
  bet NUMERIC NOT NULL,
  "winAmount" NUMERIC NOT NULL,
  "xWin" NUMERIC NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_userWins_userId ON "userWins"("userId");
CREATE INDEX IF NOT EXISTS idx_userWins_gameTitle ON "userWins"("gameTitle");
```

### 5. Current Game Table
```sql
CREATE TABLE IF NOT EXISTS "currentGame" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT UNIQUE NOT NULL,
  "gameTitle" TEXT NOT NULL,
  provider TEXT,
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_currentGame_userId ON "currentGame"("userId");
```

### 6. Row Level Security (RLS)

Enable RLS and create policies:

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE "userSettings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "userWins" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "currentGame" ENABLE ROW LEVEL SECURITY;

-- For now, allow all operations (you can restrict this later based on auth)
CREATE POLICY "Allow all operations for authenticated users" ON users FOR ALL USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON slots FOR ALL USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON "userSettings" FOR ALL USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON "userWins" FOR ALL USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON "currentGame" FOR ALL USING (true);
```

**OR** if you're using service role key for server-side operations (recommended), you can disable RLS or use service role which bypasses RLS:

```sql
-- Disable RLS (service role key bypasses RLS anyway)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE slots DISABLE ROW LEVEL SECURITY;
ALTER TABLE "userSettings" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "userWins" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "currentGame" DISABLE ROW LEVEL SECURITY;
```

## Environment Variables

Add to your `.env.local` (if you want admin access):

```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

To get your service role key:
1. Go to Supabase Dashboard → Settings → API
2. Copy the `service_role` key (keep this secret!)

## Next Steps

1. Run the SQL scripts above in your Supabase SQL Editor
2. Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` (optional but recommended)
3. Test the connection

## Migration from Firestore

The `supabase-admin.ts` file mirrors the `firestore-admin.ts` interface, so you can gradually migrate by:

1. Using Supabase for new features
2. Running both in parallel
3. Migrating data from Firestore to Supabase
4. Switching over completely

