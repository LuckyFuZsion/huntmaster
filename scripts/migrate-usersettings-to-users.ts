import { createClient } from '@supabase/supabase-js';

// Simple env loader
function loadEnv() {
  try {
    const fs = require('fs');
    const path = require('path');
    const envPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      content.split('\n').forEach((line: string) => {
        const [key, ...values] = line.split('=');
        if (key && values.length > 0) {
          const value = values.join('=').trim().replace(/^["']|["']$/g, '');
          process.env[key.trim()] = value;
        }
      });
    }
  } catch (e) {
    // Ignore
  }
}

loadEnv();

async function migrateUserSettingsToUsers() {
  try {
    console.log('Starting migration from userSettings to users table...\n');

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    // Step 1: Get all userSettings
    console.log('1. Fetching userSettings...');
    const { data: allSettings, error: settingsError } = await supabase
      .from('userSettings')
      .select('userId, updatedAt')
      .order('updatedAt', { ascending: false });

    if (settingsError) {
      throw settingsError;
    }

    if (!allSettings || allSettings.length === 0) {
      console.log('✅ No userSettings found');
      return;
    }

    console.log(`   Found ${allSettings.length} userSettings entries`);

    // Step 2: Get unique userIds
    const uniqueUserIds = [...new Set(allSettings.map(s => s.userId))];
    console.log(`   Found ${uniqueUserIds.length} unique userIds\n`);

    // Step 3: Check which userIds don't have users
    console.log('2. Checking which userIds need users created...');
    const { data: existingUsers, error: usersError } = await supabase
      .from('users')
      .select('id');

    if (usersError) {
      throw usersError;
    }

    const existingUserIds = new Set((existingUsers || []).map(u => String(u.id)));
    const missingUserIds = uniqueUserIds.filter(uid => !existingUserIds.has(uid));

    console.log(`   Existing users: ${existingUserIds.size}`);
    console.log(`   Missing users: ${missingUserIds.length}\n`);

    if (missingUserIds.length === 0) {
      console.log('✅ All userIds already have users!');
      return;
    }

    // Step 4: Create users for missing userIds
    console.log('3. Creating users for missing userIds...');
    let created = 0;
    let failed = 0;
    const createdUsers: Array<{ id: string; username: string }> = [];

    for (const userId of missingUserIds) {
      try {
        // Generate a temporary username (user_ + first 8 chars of UUID)
        const tempUsername = `user_${userId.substring(0, 8)}`;
        
        // Get the earliest updatedAt for this userId as createdAt
        const userSettings = allSettings.filter(s => s.userId === userId);
        const earliestUpdate = userSettings.reduce((earliest, current) => {
          const currentDate = new Date(current.updatedAt);
          const earliestDate = earliest ? new Date(earliest.updatedAt) : new Date();
          return currentDate < earliestDate ? current : earliest;
        }, userSettings[0]);

        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            id: userId, // Use the userId as the user id
            username: tempUsername,
            isActive: true,
            huntmaster: true, // Grant HuntMaster access
            huntmasterAdmin: false,
            createdAt: earliestUpdate?.updatedAt || new Date().toISOString(),
          })
          .select()
          .single();

        if (createError) {
          console.error(`❌ Error creating user for ${userId}:`, createError.message);
          failed++;
        } else {
          created++;
          createdUsers.push({ id: newUser.id, username: newUser.username });
          console.log(`   ✅ Created user: ${tempUsername} (${userId})`);
        }
      } catch (error: any) {
        console.error(`❌ Error processing userId ${userId}:`, error.message);
        failed++;
      }
    }

    // Step 5: Verify results
    console.log('\n4. Verifying migration...');
    const { data: verifySettings, error: verifyError } = await supabase
      .from('userSettings')
      .select('userId');

    const { data: verifyUsers, error: verifyUsersError } = await supabase
      .from('users')
      .select('id');

    if (verifyError || verifyUsersError) {
      console.warn('⚠️ Could not verify results');
    } else {
      const verifyUserIds = new Set((verifyUsers || []).map(u => String(u.id)));
      const orphanedSettings = (verifySettings || []).filter(s => !verifyUserIds.has(s.userId));
      
      console.log(`   Total userSettings: ${verifySettings?.length || 0}`);
      console.log(`   Total users: ${verifyUsers?.length || 0}`);
      console.log(`   Orphaned settings: ${orphanedSettings.length}`);
    }

    // Summary
    console.log('\n✅ Migration completed!');
    console.log(`📊 Results:`);
    console.log(`   - Users created: ${created}`);
    console.log(`   - Failed: ${failed}`);
    console.log(`   - Total processed: ${missingUserIds.length}`);

    if (createdUsers.length > 0) {
      console.log('\n⚠️  IMPORTANT: Update usernames manually!');
      console.log('Created users with temporary usernames:');
      createdUsers.forEach(u => {
        console.log(`   - ${u.username} (${u.id})`);
      });
      console.log('\nTo update usernames, run SQL like:');
      console.log(`UPDATE users SET username = 'actual_username' WHERE id = 'user-id-here';`);
    }

  } catch (error: any) {
    console.error('❌ Error migrating users:', error);
    process.exit(1);
  }
}

migrateUserSettingsToUsers();





