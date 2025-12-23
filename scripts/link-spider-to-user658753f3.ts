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

async function linkSpiderToUser658753f3() {
  try {
    console.log('Linking "a big wet spider" to user_658753f3...\n');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const userId = '658753f3-3fbd-4457-a410-454d49e4cd54';
    const correctUsername = 'a big wet spider';
    const discordId = '309397476102766605';

    // Step 1: Check current user
    console.log('1. Checking current user state...');
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError) {
      throw userError;
    }

    console.log(`   Current username: ${currentUser.username}`);
    console.log(`   Current Discord ID: ${currentUser.discordId || 'None'}`);

    // Step 2: Check userWins
    console.log('\n2. Checking userWins...');
    const { data: wins, error: winsError } = await supabase
      .from('userWins')
      .select('id, userId, username')
      .or(`userId.eq.${userId},username.eq.${correctUsername}`);

    if (winsError) {
      throw winsError;
    }

    console.log(`   Found ${wins?.length || 0} wins`);
    if (wins && wins.length > 0) {
      const byUserId = wins.filter(w => w.userId === userId);
      const byUsername = wins.filter(w => w.username === correctUsername);
      console.log(`   - Wins with userId ${userId}: ${byUserId.length}`);
      console.log(`   - Wins with username "${correctUsername}": ${byUsername.length}`);
    }

    // Step 3: Delete duplicate user if it exists
    const { data: duplicateUser, error: dupError } = await supabase
      .from('users')
      .select('id')
      .eq('username', correctUsername)
      .single();

    if (!dupError && duplicateUser && duplicateUser.id !== userId) {
      console.log(`\n3. Found duplicate user with username "${correctUsername}"`);
      console.log(`   Deleting duplicate user: ${duplicateUser.id}`);
      
      // Move any data from duplicate to main user first
      const { data: dupWins } = await supabase
        .from('userWins')
        .select('id')
        .eq('userId', duplicateUser.id);

      if (dupWins && dupWins.length > 0) {
        await supabase
          .from('userWins')
          .update({ userId: userId })
          .eq('userId', duplicateUser.id);
        console.log(`   ✅ Migrated ${dupWins.length} wins from duplicate`);
      }

      await supabase
        .from('users')
        .delete()
        .eq('id', duplicateUser.id);
      console.log(`   ✅ Deleted duplicate user`);
    }

    // Step 4: Update user
    console.log('\n4. Updating user...');
    const { error: updateError } = await supabase
      .from('users')
      .update({
        username: correctUsername,
        discordId: discordId,
        huntmaster: true,
        isActive: true
      })
      .eq('id', userId);

    if (updateError) {
      throw updateError;
    }

    console.log(`   ✅ Updated username to "${correctUsername}"`);
    console.log(`   ✅ Linked Discord ID ${discordId}`);

    // Step 5: Update userWins
    console.log('\n5. Updating userWins...');
    
    // Update wins with userId
    const { error: updateWinsError } = await supabase
      .from('userWins')
      .update({ username: correctUsername })
      .eq('userId', userId);

    if (updateWinsError) {
      console.error('   Error updating wins by userId:', updateWinsError.message);
    }

    // Update wins with username
    const { error: updateWinsByUsernameError } = await supabase
      .from('userWins')
      .update({ userId: userId })
      .eq('username', correctUsername)
      .neq('userId', userId);

    if (updateWinsByUsernameError) {
      console.error('   Error updating wins by username:', updateWinsByUsernameError.message);
    } else {
      const { data: updatedWins } = await supabase
        .from('userWins')
        .select('id')
        .eq('username', correctUsername)
        .eq('userId', userId);
      console.log(`   ✅ Updated ${updatedWins?.length || 0} wins`);
    }

    // Step 6: Verify
    console.log('\n6. Verifying...');
    const { data: finalUser, error: verifyError } = await supabase
      .from('users')
      .select('id, username, discordId, huntmaster, isActive')
      .eq('id', userId)
      .single();

    if (verifyError) {
      throw verifyError;
    }

    const { data: finalWins } = await supabase
      .from('userWins')
      .select('id, userId, username')
      .eq('userId', userId);

    console.log('\n✅ Link completed!');
    console.log(`📊 Final Status:`);
    console.log(`   - Username: ${finalUser.username}`);
    console.log(`   - Discord ID: ${finalUser.discordId}`);
    console.log(`   - HuntMaster Access: ${finalUser.huntmaster ? '✅ Yes' : '❌ No'}`);
    console.log(`   - Active: ${finalUser.isActive ? '✅ Yes' : '❌ No'}`);
    console.log(`   - Total wins: ${finalWins?.length || 0}`);
    
    const correctWins = (finalWins || []).filter(w => w.username === correctUsername);
    console.log(`   - Wins with correct username: ${correctWins.length}`);

    console.log(`\n🎉 "a big wet spider" can now log in via Discord!`);

  } catch (error: any) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

linkSpiderToUser658753f3();








