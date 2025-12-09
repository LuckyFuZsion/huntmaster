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

async function findOrCreateSpiderUser() {
  try {
    console.log('Finding or creating "a big wet spider" user...\n');

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

    // Step 1: Check userWins for this username
    console.log('1. Checking userWins for "a big wet spider"...');
    const { data: wins, error: winsError } = await supabase
      .from('userWins')
      .select('userId, username')
      .eq('username', username)
      .limit(1);

    if (winsError) {
      throw winsError;
    }

    let userId: string | null = null;
    if (wins && wins.length > 0) {
      userId = wins[0].userId;
      console.log(`   Found wins with userId: ${userId}`);
    } else {
      console.log('   No wins found with this username');
    }

    // Step 2: Check if user exists with that userId
    if (userId) {
      const { data: existingUser, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError && userError.code !== 'PGRST116') {
        throw userError;
      }

      if (existingUser) {
        console.log(`\n2. Found existing user: ${existingUser.username} (${existingUser.id})`);
        
        // Update username and link Discord ID
        console.log('\n3. Updating username and linking Discord ID...');
        const { error: updateError } = await supabase
          .from('users')
          .update({
            username: username,
            discordId: discordId,
            huntmaster: true,
            isActive: true
          })
          .eq('id', userId);

        if (updateError) {
          throw updateError;
        }

        // Update userWins
        await supabase
          .from('userWins')
          .update({ username: username })
          .eq('userId', userId);

        console.log(`   ✅ Updated username to "${username}"`);
        console.log(`   ✅ Linked Discord ID ${discordId}`);
      } else {
        // Create user with that userId
        console.log(`\n2. Creating new user with userId ${userId}...`);
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            id: userId,
            username: username,
            discordId: discordId,
            huntmaster: true,
            isActive: true,
            createdAt: new Date().toISOString(),
          })
          .select()
          .single();

        if (createError) {
          throw createError;
        }

        console.log(`   ✅ Created user: ${newUser.username}`);
      }
    } else {
      // Create new user
      console.log('\n2. Creating new user...');
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          username: username,
          discordId: discordId,
          huntmaster: true,
          isActive: true,
          createdAt: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      userId = newUser.id;
      console.log(`   ✅ Created user: ${newUser.username} (${newUser.id})`);

      // Update userWins if any exist
      const { data: allWins } = await supabase
        .from('userWins')
        .select('id')
        .eq('username', username);

      if (allWins && allWins.length > 0) {
        await supabase
          .from('userWins')
          .update({ userId: String(userId) })
          .eq('username', username);
        console.log(`   ✅ Updated ${allWins.length} wins with userId`);
      }
    }

    // Step 3: Verify
    console.log('\n4. Verifying...');
    const { data: finalUser, error: verifyError } = await supabase
      .from('users')
      .select('id, username, discordId, huntmaster, isActive')
      .eq('username', username)
      .single();

    if (verifyError) {
      throw verifyError;
    }

    console.log('\n✅ User setup completed!');
    console.log(`📊 Status:`);
    console.log(`   - Username: ${finalUser.username}`);
    console.log(`   - Discord ID: ${finalUser.discordId}`);
    console.log(`   - HuntMaster Access: ${finalUser.huntmaster ? '✅ Yes' : '❌ No'}`);
    console.log(`   - Active: ${finalUser.isActive ? '✅ Yes' : '❌ No'}`);
    console.log(`\n🎉 "a big wet spider" can now log in via Discord!`);

  } catch (error: any) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

findOrCreateSpiderUser();





