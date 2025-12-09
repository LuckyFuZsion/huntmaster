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

async function handleLegacyUserIds() {
  try {
    console.log('Handling legacy userIds in userSettings...\n');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    // Get userSettings with non-UUID userIds
    const { data: allSettings, error: settingsError } = await supabase
      .from('userSettings')
      .select('userId, updatedAt');

    if (settingsError) throw settingsError;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const legacySettings = (allSettings || []).filter(s => !uuidRegex.test(s.userId));

    console.log(`Found ${legacySettings.length} userSettings with legacy userIds:`);
    legacySettings.forEach(s => {
      console.log(`   - ${s.userId}`);
    });

    if (legacySettings.length === 0) {
      console.log('✅ No legacy userIds found!');
      return;
    }

    // Extract usernames from legacy IDs
    const usernameMap = new Map<string, string>();
    legacySettings.forEach(s => {
      let username = s.userId;
      // Clean up legacy_ prefix
      if (username.startsWith('legacy_')) {
        username = username.substring(7);
      }
      // Use the cleaned username, or generate one
      usernameMap.set(s.userId, username || `user_${s.userId.substring(0, 8)}`);
    });

    console.log('\nCreating users for legacy userIds...');
    const userIdMapping = new Map<string, string>(); // old userId -> new userId

    for (const [oldUserId, username] of usernameMap.entries()) {
      try {
        // Check if username already exists
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('username', username)
          .single();

        let newUserId: string;

        if (existingUser) {
          console.log(`   ✅ Username "${username}" already exists, using existing user`);
          newUserId = existingUser.id;
        } else {
          // Create new user with generated UUID
          const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert({
              username: username,
              isActive: true,
              huntmaster: true,
              huntmasterAdmin: false,
              createdAt: new Date().toISOString(),
            })
            .select()
            .single();

          if (createError) {
            console.error(`   ❌ Error creating user "${username}":`, createError.message);
            continue;
          }

          newUserId = newUser.id;
          console.log(`   ✅ Created user: ${username} (${newUserId})`);
        }

        userIdMapping.set(oldUserId, newUserId);

        // Update userSettings to use new userId
        const { error: updateError } = await supabase
          .from('userSettings')
          .update({ userId: newUserId })
          .eq('userId', oldUserId);

        if (updateError) {
          console.error(`   ❌ Error updating userSettings for ${oldUserId}:`, updateError.message);
        } else {
          console.log(`   ✅ Updated userSettings: ${oldUserId} -> ${newUserId}`);
        }
      } catch (error: any) {
        console.error(`   ❌ Error processing ${oldUserId}:`, error.message);
      }
    }

    // Verify
    console.log('\nVerifying migration...');
    const { data: verifySettings } = await supabase
      .from('userSettings')
      .select('userId');

    const { data: verifyUsers } = await supabase
      .from('users')
      .select('id');

    const verifyUserIds = new Set((verifyUsers || []).map(u => String(u.id)));
    const orphanedSettings = (verifySettings || []).filter(s => !verifyUserIds.has(s.userId));

    console.log(`\n✅ Migration completed!`);
    console.log(`📊 Results:`);
    console.log(`   - Legacy userIds processed: ${legacySettings.length}`);
    console.log(`   - Users created/updated: ${userIdMapping.size}`);
    console.log(`   - Orphaned settings: ${orphanedSettings.length}`);

  } catch (error: any) {
    console.error('❌ Error handling legacy userIds:', error);
    process.exit(1);
  }
}

handleLegacyUserIds();





