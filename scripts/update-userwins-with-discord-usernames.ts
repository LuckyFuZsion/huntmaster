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

async function updateUserWinsWithDiscordUsernames() {
  try {
    console.log('Updating userWins with Discord usernames from users table...\n');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    // Step 1: Get all users with their usernames
    console.log('1. Fetching users from users table...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, username, discordId')
      .order('createdAt', { ascending: false });

    if (usersError) {
      throw usersError;
    }

    if (!users || users.length === 0) {
      console.log('⚠️ No users found');
      return;
    }

    console.log(`   Found ${users.length} users:`);
    users.forEach(u => {
      console.log(`   - ${u.username} (${u.id}) ${u.discordId ? `[Discord: ${u.discordId}]` : ''}`);
    });
    console.log();

    // Step 2: Get all userWins
    console.log('2. Fetching userWins...');
    const { data: wins, error: winsError } = await supabase
      .from('userWins')
      .select('id, userId, username')
      .order('createdAt', { ascending: false });

    if (winsError) {
      throw winsError;
    }

    if (!wins || wins.length === 0) {
      console.log('✅ No wins found');
      return;
    }

    console.log(`   Found ${wins.length} wins\n`);

    // Step 3: Create mapping from userId to username
    const userMap = new Map<string, string>();
    users.forEach(user => {
      userMap.set(String(user.id), user.username);
    });

    // Step 4: Update userWins with correct usernames
    console.log('3. Updating userWins with usernames from users table...');
    let updated = 0;
    let alreadyCorrect = 0;
    let failed = 0;
    const updates: Array<{ winId: string; oldUsername: string | null; newUsername: string }> = [];

    for (const win of wins) {
      const correctUsername = userMap.get(win.userId);
      
      if (!correctUsername) {
        console.warn(`   ⚠️ No user found for userId ${win.userId}`);
        failed++;
        continue;
      }

      // Check if username needs updating
      if (win.username !== correctUsername) {
        const { error: updateError } = await supabase
          .from('userWins')
          .update({ username: correctUsername })
          .eq('id', win.id);

        if (updateError) {
          console.error(`   ❌ Error updating win ${win.id}:`, updateError.message);
          failed++;
        } else {
          updated++;
          updates.push({
            winId: win.id,
            oldUsername: win.username,
            newUsername: correctUsername
          });
          console.log(`   ✅ Updated: ${win.userId} - "${win.username || '(null)'}" -> "${correctUsername}"`);
        }
      } else {
        alreadyCorrect++;
      }
    }

    // Summary
    console.log('\n✅ Update completed!');
    console.log(`📊 Results:`);
    console.log(`   - Wins updated: ${updated}`);
    console.log(`   - Already correct: ${alreadyCorrect}`);
    console.log(`   - Failed: ${failed}`);
    console.log(`   - Total wins: ${wins.length}`);

    if (updates.length > 0) {
      console.log('\n📝 Updates made:');
      updates.forEach(u => {
        console.log(`   ${u.oldUsername || '(null)'} -> ${u.newUsername}`);
      });
    }

  } catch (error: any) {
    console.error('❌ Error updating userWins:', error);
    process.exit(1);
  }
}

updateUserWinsWithDiscordUsernames();








