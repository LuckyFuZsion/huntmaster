# Supabase Setup Instructions

## Quick Start

1. **Open your Supabase Dashboard**: https://supabase.com/dashboard
2. **Go to SQL Editor**
3. **Copy and paste the entire contents of `SUPABASE_COMPLETE_SETUP.sql`**
4. **Click "Run"**
5. **Grant HuntMaster access** (see Step 7 below)

## What Each Step Does

### Step 1: Create Users Table
Creates a new `users` table for HuntMaster (separate from your existing `SSUsers` table):
- `id` - UUID primary key
- `username` - Unique username
- `password` - Bcrypt-hashed password
- `isAdmin` - Admin flag (legacy, kept for compatibility)
- `discordId` - Discord ID for linking accounts
- `email` - Email address
- `isActive` - Account active status
- `huntmaster` - **REQUIRED** - Controls HuntMaster access
- `huntmasterAdmin` - **REQUIRED** - HuntMaster admin flag (only one admin)
- `createdAt` - Timestamp

### Step 2: Create Slots Table
Stores the games in each user's bonus hunt list

### Step 3: Create User Settings Table
Stores user preferences (themes, fonts, balances, etc.)

### Step 4: Create User Wins Table
Stores individual win records for tracking game statistics

### Step 5: Create Current Game Table
Stores the user's currently selected game

### Step 6: Row Level Security
- **Option A (Default)**: Disables RLS (recommended if using service_role key)
- **Option B**: Enables RLS with permissive policies (commented out)

### Step 7: Create Your First HuntMaster User ⚠️ IMPORTANT
**This is critical!** You need to create at least one user in the `users` table.

Options:
- **Option 1**: Create a new user with username/password
- **Option 2**: Create a user by Discord ID (if migrating)
- **Option 3**: Bulk insert multiple users

**Don't forget to set `huntmaster = true` and designate ONE admin with `huntmasterAdmin = true`!**

## After Running the SQL

1. **Test the connection**: Visit `http://localhost:3000/api/test/supabase`
2. **Inspect users table**: Visit `http://localhost:3000/api/test/supabase-inspect-users`
3. **Verify huntmaster column**: Check the verification queries at the bottom of the SQL file

## Troubleshooting

### "Column already exists" errors
- These are safe to ignore - the scripts use `IF NOT EXISTS` checks

### "Permission denied" errors
- Make sure you're running the SQL as the database owner
- Check that you have the correct Supabase project selected

### Users can't log in
- Make sure you've run **Step 7** and granted `huntmaster = true` to the users
- Check: `SELECT username, huntmaster FROM users WHERE username = 'your_username';`

## Next Steps

After the database is set up:
1. Test the Supabase connection
2. Switch your API routes from Firestore to Supabase
3. Migrate existing data from Firestore (if needed)

