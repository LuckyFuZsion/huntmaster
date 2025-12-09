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

async function fixLuckyFuZsionUsername() {
  try {
    console.log('Fixing username for LuckyFuZsion...\n');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const userId = '6777c049-6312-4325-8556-dee7f70d5dae';
    const correctUsername = 'LuckyFuZsion';

    // Step 1: Check current state
    console.log('1. Checking current user state...');
    const { data: currentUser, error: fetchError } = await supabase
      .from('users')
      .select('id, username, discordId, huntmaster, isActive, huntmasterAdmin')
      .eq('id', userId)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    if (!currentUser) {
      console.log('❌ User not found!');
      return;
    }

    console.log('   Current state:');
    console.log(`   - Username: ${currentUser.username}`);
    console.log(`   - Discord ID: ${currentUser.discordId || 'None'}`);
    console.log(`   - huntmaster: ${currentUser.huntmaster}`);
    console.log(`   - isActive: ${currentUser.isActive}`);
    console.log(`   - huntmasterAdmin: ${currentUser.huntmasterAdmin || false}`);

    // Step 2: Update username and authorization
    console.log(`\n2. Updating username to "${correctUsername}" and ensuring authorization...`);
    const { error: updateError } = await supabase
      .from('users')
      .update({
        username: correctUsername,
        huntmaster: true,
        isActive: true
      })
      .eq('id', userId);

    if (updateError) {
      throw updateError;
    }

    console.log(`   ✅ Updated username to "${correctUsername}"`);
    console.log(`   ✅ Set huntmaster = true`);
    console.log(`   ✅ Set isActive = true`);

    // Step 3: Update userWins
    console.log('\n3. Updating userWins with correct username...');
    const { data: wins, error: winsError } = await supabase
      .from('userWins')
      .select('id')
      .eq('userId', userId);

    if (winsError) {
      console.error('   Error fetching wins:', winsError);
    } else {
      const { error: updateWinsError } = await supabase
        .from('userWins')
        .update({ username: correctUsername })
        .eq('userId', userId);

      if (updateWinsError) {
        console.error('   Error updating wins:', updateWinsError);
      } else {
        console.log(`   ✅ Updated ${wins?.length || 0} wins with correct username`);
      }
    }

    // Step 4: Verify
    console.log('\n4. Verifying update...');
    const { data: updatedUser } = await supabase
      .from('users')
      .select('id, username, huntmaster, isActive')
      .eq('id', userId)
      .single();

    console.log('\n✅ Update completed!');
    console.log(`📊 Final state:`);
    console.log(`   - Username: ${updatedUser?.username}`);
    console.log(`   - huntmaster: ${updatedUser?.huntmaster}`);
    console.log(`   - isActive: ${updatedUser?.isActive}`);
    console.log('\nYou should now be able to log in as "LuckyFuZsion"');

  } catch (error: any) {
    console.error('❌ Error fixing username:', error);
    process.exit(1);
  }
}

fixLuckyFuZsionUsername();





