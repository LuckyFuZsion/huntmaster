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

async function linkSpiderDiscordId() {
  try {
    console.log('Linking Discord ID to "a big wet spider" account...\n');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const username = 'a big wet spider';
    const discordId = '309397476102766605';

    // Step 1: Check if Discord ID is already linked
    console.log('1. Checking if Discord ID is already in use...');
    const { data: existingDiscordUser, error: discordError } = await supabase
      .from('users')
      .select('id, username')
      .eq('discordId', discordId)
      .single();

    if (discordError && discordError.code !== 'PGRST116') {
      throw discordError;
    }

    if (existingDiscordUser) {
      if (existingDiscordUser.username === username) {
        console.log(`   ✅ Discord ID already linked to ${username}`);
      } else {
        console.log(`   ⚠️  Discord ID already linked to: ${existingDiscordUser.username}`);
      }
    } else {
      console.log('   ✅ Discord ID is available');
    }

    // Step 2: Find user by username (case-insensitive search)
    console.log('\n2. Finding "a big wet spider" user...');
    const { data: allUsers, error: allUsersError } = await supabase
      .from('users')
      .select('id, username, discordId, huntmaster, isActive');

    if (allUsersError) {
      throw allUsersError;
    }

    // Find user with matching username (case-insensitive)
    const spiderUser = (allUsers || []).find(u => 
      u.username.toLowerCase() === username.toLowerCase()
    );

    if (!spiderUser) {
      console.log('❌ User "a big wet spider" not found!');
      console.log('\nAvailable users:');
      (allUsers || []).forEach(u => {
        console.log(`   - ${u.username}`);
      });
      return;
    }

    console.log(`   Found user: ${spiderUser.username} (${spiderUser.id})`);
    console.log(`   Current Discord ID: ${spiderUser.discordId || 'None'}`);

    // Step 3: Link Discord ID
    console.log('\n3. Linking Discord ID...');
    const { error: updateError } = await supabase
      .from('users')
      .update({
        discordId: discordId,
        huntmaster: true, // Ensure authorization
        isActive: true    // Ensure active
      })
      .eq('id', spiderUser.id);

    if (updateError) {
      throw updateError;
    }

    console.log(`   ✅ Linked Discord ID ${discordId} to "${spiderUser.username}"`);

    // Step 4: Update userWins username if needed
    console.log('\n4. Updating userWins...');
    const { data: wins, error: winsError } = await supabase
      .from('userWins')
      .select('id')
      .eq('userId', spiderUser.id);

    if (!winsError && wins && wins.length > 0) {
      const { error: updateWinsError } = await supabase
        .from('userWins')
        .update({ username: spiderUser.username })
        .eq('userId', spiderUser.id);

      if (updateWinsError) {
        console.error('   ⚠️  Error updating userWins:', updateWinsError.message);
      } else {
        console.log(`   ✅ Updated ${wins.length} wins with correct username`);
      }
    }

    // Step 5: Verify
    console.log('\n5. Verifying link...');
    const { data: updatedUser, error: verifyError } = await supabase
      .from('users')
      .select('id, username, discordId, huntmaster, isActive')
      .eq('id', spiderUser.id)
      .single();

    if (verifyError) {
      throw verifyError;
    }

    console.log('\n✅ Discord ID linked successfully!');
    console.log(`📊 Status:`);
    console.log(`   - Username: ${updatedUser.username}`);
    console.log(`   - Discord ID: ${updatedUser.discordId}`);
    console.log(`   - HuntMaster Access: ${updatedUser.huntmaster ? '✅ Yes' : '❌ No'}`);
    console.log(`   - Active: ${updatedUser.isActive ? '✅ Yes' : '❌ No'}`);
    console.log(`\n🎉 "a big wet spider" can now log in via Discord!`);

  } catch (error: any) {
    console.error('❌ Error linking Discord ID:', error);
    process.exit(1);
  }
}

linkSpiderDiscordId();





