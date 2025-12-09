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

async function updateLlandriUserWins() {
  try {
    console.log('Updating userWins for llandri...\n');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const userId = '28a00513-1bea-4d5c-938c-c236d5d7470f';
    const correctUsername = 'llandri';

    // Update all userWins for this userId
    console.log('1. Updating userWins...');
    const { data: wins, error: winsError } = await supabase
      .from('userWins')
      .select('id, username')
      .eq('userId', userId);

    if (winsError) {
      throw winsError;
    }

    if (!wins || wins.length === 0) {
      console.log('   No wins found');
      return;
    }

    console.log(`   Found ${wins.length} wins`);
    
    const needsUpdate = wins.filter(w => w.username !== correctUsername);
    console.log(`   Wins needing update: ${needsUpdate.length}`);

    if (needsUpdate.length > 0) {
      const { error: updateError } = await supabase
        .from('userWins')
        .update({ username: correctUsername })
        .eq('userId', userId)
        .neq('username', correctUsername);

      if (updateError) {
        throw updateError;
      }

      console.log(`   ✅ Updated ${needsUpdate.length} wins`);
    } else {
      console.log(`   ✅ All wins already have correct username`);
    }

    // Also update any wins with the old username
    const { data: oldUsernameWins } = await supabase
      .from('userWins')
      .select('id')
      .eq('username', 'user_28a00513');

    if (oldUsernameWins && oldUsernameWins.length > 0) {
      const { error: updateOldError } = await supabase
        .from('userWins')
        .update({ username: correctUsername })
        .eq('username', 'user_28a00513');

      if (updateOldError) {
        console.error('   Error updating old username wins:', updateOldError);
      } else {
        console.log(`   ✅ Updated ${oldUsernameWins.length} wins with old username`);
      }
    }

    // Verify
    console.log('\n2. Verifying...');
    const { data: verifyWins } = await supabase
      .from('userWins')
      .select('id, userId, username')
      .eq('userId', userId);

    const correct = (verifyWins || []).filter(w => w.username === correctUsername);
    const incorrect = (verifyWins || []).filter(w => w.username !== correctUsername);

    console.log(`   ✅ Total wins: ${verifyWins?.length || 0}`);
    console.log(`   ✅ Correct username: ${correct.length}`);
    if (incorrect.length > 0) {
      console.log(`   ❌ Wrong username: ${incorrect.length}`);
    }

    console.log('\n✅ Update completed!');
    console.log(`All ${verifyWins?.length || 0} wins for llandri now have the correct username.`);

  } catch (error: any) {
    console.error('❌ Error updating userWins:', error);
    process.exit(1);
  }
}

updateLlandriUserWins();





