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

async function fixDiscordUserAuthorization() {
  try {
    console.log('Fixing authorization for Discord users...\n');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    // Step 1: Get all Discord users
    console.log('1. Checking Discord users...');
    const { data: discordUsers, error: usersError } = await supabase
      .from('users')
      .select('id, username, discordId, huntmaster, isActive')
      .not('discordId', 'is', null)
      .order('createdAt', { ascending: false });

    if (usersError) {
      throw usersError;
    }

    if (!discordUsers || discordUsers.length === 0) {
      console.log('✅ No Discord users found');
      return;
    }

    console.log(`   Found ${discordUsers.length} Discord users:\n`);
    discordUsers.forEach(u => {
      const status = (u.huntmaster && u.isActive) ? '✅ Authorized' : '❌ Not Authorized';
      console.log(`   ${status} - ${u.username} (huntmaster: ${u.huntmaster}, isActive: ${u.isActive})`);
    });

    // Step 2: Find users that need authorization
    const needsAuth = discordUsers.filter(u => !u.huntmaster || !u.isActive);
    
    if (needsAuth.length === 0) {
      console.log('\n✅ All Discord users are already authorized!');
      return;
    }

    console.log(`\n2. Found ${needsAuth.length} Discord users that need authorization:`);
    needsAuth.forEach(u => {
      console.log(`   - ${u.username} (needs: huntmaster=${!u.huntmaster}, isActive=${!u.isActive})`);
    });

    // Step 3: Authorize them
    console.log('\n3. Authorizing Discord users...');
    let updated = 0;
    let failed = 0;

    for (const user of needsAuth) {
      try {
        const { error: updateError } = await supabase
          .from('users')
          .update({
            huntmaster: true,
            isActive: true
          })
          .eq('id', user.id);

        if (updateError) {
          console.error(`   ❌ Error updating ${user.username}:`, updateError.message);
          failed++;
        } else {
          updated++;
          console.log(`   ✅ Authorized: ${user.username}`);
        }
      } catch (error: any) {
        console.error(`   ❌ Error processing ${user.username}:`, error.message);
        failed++;
      }
    }

    // Step 4: Verify
    console.log('\n4. Verifying authorization...');
    const { data: verifyUsers } = await supabase
      .from('users')
      .select('id, username, huntmaster, isActive')
      .not('discordId', 'is', null);

    const authorized = (verifyUsers || []).filter(u => u.huntmaster && u.isActive);
    const unauthorized = (verifyUsers || []).filter(u => !u.huntmaster || !u.isActive);

    console.log(`\n✅ Authorization fix completed!`);
    console.log(`📊 Results:`);
    console.log(`   - Users updated: ${updated}`);
    console.log(`   - Failed: ${failed}`);
    console.log(`   - Total Discord users: ${verifyUsers?.length || 0}`);
    console.log(`   - Authorized: ${authorized.length}`);
    console.log(`   - Unauthorized: ${unauthorized.length}`);

    if (unauthorized.length > 0) {
      console.log('\n⚠️  Still unauthorized:');
      unauthorized.forEach(u => {
        console.log(`   - ${u.username} (huntmaster: ${u.huntmaster}, isActive: ${u.isActive})`);
      });
    }

  } catch (error: any) {
    console.error('❌ Error fixing authorization:', error);
    process.exit(1);
  }
}

fixDiscordUserAuthorization();








