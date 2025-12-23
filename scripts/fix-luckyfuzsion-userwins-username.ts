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

async function fixLuckyFuZsionUserWinsUsername() {
  try {
    console.log('Fixing userWins username for LuckyFuZsion...\n');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const luckyFuZsionUserId = '9079beea-65d8-4fe5-b6e4-bf962d062e16';
    const correctUsername = 'LuckyFuZsion';

    // Step 1: Check current state
    console.log('1. Checking userWins for LuckyFuZsion...');
    const { data: wins, error: winsError } = await supabase
      .from('userWins')
      .select('id, userId, username, gameTitle, winAmount')
      .or(`userId.eq.${luckyFuZsionUserId},username.eq.user_6777c049,username.eq.${correctUsername}`)
      .order('createdAt', { ascending: false });

    if (winsError) {
      throw winsError;
    }

    if (!wins || wins.length === 0) {
      console.log('✅ No wins found');
      return;
    }

    console.log(`   Found ${wins.length} wins`);
    console.log('\n   Current state:');
    wins.forEach(win => {
      console.log(`   - ${win.username || '(null)'} (userId: ${win.userId}) - ${win.gameTitle} - ${win.winAmount}`);
    });

    // Step 2: Update wins with wrong username
    console.log('\n2. Updating userWins with correct username...');
    let updated = 0;
    let alreadyCorrect = 0;
    let failed = 0;

    for (const win of wins) {
      // Update if username is wrong or missing
      if (win.username !== correctUsername) {
        // Check if this win belongs to LuckyFuZsion
        if (win.userId === luckyFuZsionUserId || win.username === 'user_6777c049') {
          const { error: updateError } = await supabase
            .from('userWins')
            .update({ username: correctUsername })
            .eq('id', win.id);

          if (updateError) {
            console.error(`   ❌ Error updating win ${win.id}:`, updateError.message);
            failed++;
          } else {
            updated++;
            console.log(`   ✅ Updated: ${win.gameTitle} - "${win.username || '(null)'}" -> "${correctUsername}"`);
          }
        } else {
          alreadyCorrect++;
        }
      } else {
        alreadyCorrect++;
      }
    }

    // Step 3: Also update any wins with userId matching LuckyFuZsion
    const { data: allLuckyWins, error: allLuckyError } = await supabase
      .from('userWins')
      .select('id, username')
      .eq('userId', luckyFuZsionUserId);

    if (!allLuckyError && allLuckyWins) {
      for (const win of allLuckyWins) {
        if (win.username !== correctUsername) {
          const { error: updateError } = await supabase
            .from('userWins')
            .update({ username: correctUsername })
            .eq('id', win.id);

          if (!updateError) {
            if (!wins.find(w => w.id === win.id)) {
              updated++;
            }
          }
        }
      }
    }

    // Step 4: Verify
    console.log('\n3. Verifying update...');
    const { data: verifyWins, error: verifyError } = await supabase
      .from('userWins')
      .select('id, userId, username')
      .eq('userId', luckyFuZsionUserId);

    if (verifyError) {
      console.error('   Error verifying:', verifyError);
    } else {
      const mismatched = (verifyWins || []).filter(w => w.username !== correctUsername);
      console.log(`   ✅ Total wins for LuckyFuZsion: ${verifyWins?.length || 0}`);
      console.log(`   ✅ Wins with correct username: ${(verifyWins || []).length - mismatched.length}`);
      if (mismatched.length > 0) {
        console.log(`   ❌ Wins with wrong username: ${mismatched.length}`);
      }
    }

    console.log('\n✅ Update completed!');
    console.log(`📊 Results:`);
    console.log(`   - Wins updated: ${updated}`);
    console.log(`   - Already correct: ${alreadyCorrect}`);
    console.log(`   - Failed: ${failed}`);

  } catch (error: any) {
    console.error('❌ Error fixing userWins:', error);
    process.exit(1);
  }
}

fixLuckyFuZsionUserWinsUsername();








