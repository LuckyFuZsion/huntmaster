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

async function syncUserWinsWithDiscordUsernames() {
  try {
    console.log('Syncing userWins with Discord usernames from users table...\n');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    // Execute SQL UPDATE to sync all userWins with users table
    console.log('Executing SQL UPDATE to sync userWins with users table...');
    
    // Since Supabase JS client doesn't support raw SQL UPDATE directly,
    // we'll do it row by row
    const { data: wins, error: winsError } = await supabase
      .from('userWins')
      .select('id, userId, username');

    if (winsError) throw winsError;

    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, username');

    if (usersError) throw usersError;

    const userMap = new Map<string, string>();
    (users || []).forEach(u => {
      userMap.set(String(u.id), u.username);
    });

    let updated = 0;
    let alreadyCorrect = 0;
    let failed = 0;

    for (const win of wins || []) {
      const correctUsername = userMap.get(win.userId);
      if (!correctUsername) {
        console.warn(`⚠️ No user found for userId ${win.userId}`);
        failed++;
        continue;
      }

      if (win.username !== correctUsername) {
        const { error: updateError } = await supabase
          .from('userWins')
          .update({ username: correctUsername })
          .eq('id', win.id);

        if (updateError) {
          console.error(`❌ Error updating win ${win.id}:`, updateError.message);
          failed++;
        } else {
          updated++;
          console.log(`✅ Updated: ${win.userId} - "${win.username || '(null)'}" -> "${correctUsername}"`);
        }
      } else {
        alreadyCorrect++;
      }
    }

    console.log('\n✅ Sync completed!');
    console.log(`📊 Results:`);
    console.log(`   - Updated: ${updated}`);
    console.log(`   - Already correct: ${alreadyCorrect}`);
    console.log(`   - Failed: ${failed}`);

    // Show users with temporary usernames
    const tempUsers = (users || []).filter(u => u.username.startsWith('user_'));
    if (tempUsers.length > 0) {
      console.log('\n⚠️  Users with temporary usernames that need Discord names:');
      tempUsers.forEach(u => {
        console.log(`   - ${u.username} (${u.id})`);
      });
      console.log('\nTo fix: Have these users log in via Discord, or manually update:');
      console.log('UPDATE users SET username = \'DiscordUsername\' WHERE id = \'user-id-here\';');
      console.log('Then re-run this script to sync userWins.');
    }

  } catch (error: any) {
    console.error('❌ Error syncing userWins:', error);
    process.exit(1);
  }
}

syncUserWinsWithDiscordUsernames();





