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

async function verifyLlandriUserWins() {
  try {
    console.log('Verifying llandri userWins...\n');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    // Check for any wins with old username
    const { data: oldUsernameWins, error: oldError } = await supabase
      .from('userWins')
      .select('id, userId, username, gameTitle')
      .eq('username', 'user_28a00513');

    if (oldError) {
      throw oldError;
    }

    if (oldUsernameWins && oldUsernameWins.length > 0) {
      console.log(`Found ${oldUsernameWins.length} wins with old username "user_28a00513":`);
      oldUsernameWins.forEach(win => {
        console.log(`   - ${win.gameTitle} (userId: ${win.userId})`);
      });

      console.log('\nUpdating...');
      const { error: updateError } = await supabase
        .from('userWins')
        .update({ username: 'llandri' })
        .eq('username', 'user_28a00513');

      if (updateError) {
        throw updateError;
      }

      console.log(`✅ Updated ${oldUsernameWins.length} wins`);
    } else {
      console.log('✅ No wins found with old username "user_28a00513"');
    }

    // Check all wins for llandri userId
    const userId = '28a00513-1bea-4d5c-938c-c236d5d7470f';
    const { data: llandriWins, error: llandriError } = await supabase
      .from('userWins')
      .select('id, userId, username, gameTitle, winAmount')
      .eq('userId', userId)
      .order('createdAt', { ascending: false });

    if (llandriError) {
      throw llandriError;
    }

    console.log(`\n✅ All wins for llandri (userId: ${userId}):`);
    console.log(`   Total: ${llandriWins?.length || 0} wins`);
    
    if (llandriWins && llandriWins.length > 0) {
      const correct = llandriWins.filter(w => w.username === 'llandri');
      const incorrect = llandriWins.filter(w => w.username !== 'llandri');
      
      console.log(`   ✅ Correct username (llandri): ${correct.length}`);
      if (incorrect.length > 0) {
        console.log(`   ❌ Wrong username: ${incorrect.length}`);
        incorrect.forEach(win => {
          console.log(`      - ${win.gameTitle}: "${win.username}"`);
        });
      }

      // Show sample wins
      console.log(`\n   Sample wins:`);
      llandriWins.slice(0, 5).forEach(win => {
        console.log(`   - ${win.username} - ${win.gameTitle} - ${win.winAmount}`);
      });
    }

  } catch (error: any) {
    console.error('❌ Error verifying:', error);
    process.exit(1);
  }
}

verifyLlandriUserWins();





