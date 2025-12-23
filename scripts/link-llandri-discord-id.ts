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

async function linkLlandriDiscordId() {
  try {
    console.log('Linking Discord ID to llandri account...\n');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const username = 'llandri';
    const discordId = '312692470368698368';

    // Step 1: Check if Discord ID is already linked to another user
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
        console.log(`   Would you like to move it to ${username}?`);
        // Continue anyway - we'll update it
      }
    } else {
      console.log('   ✅ Discord ID is available');
    }

    // Step 2: Get llandri user
    console.log('\n2. Finding llandri user...');
    const { data: llandriUser, error: userError } = await supabase
      .from('users')
      .select('id, username, discordId, huntmaster, isActive')
      .eq('username', username)
      .single();

    if (userError) {
      throw userError;
    }

    if (!llandriUser) {
      console.log('❌ User "llandri" not found!');
      return;
    }

    console.log(`   Found user: ${llandriUser.username} (${llandriUser.id})`);
    console.log(`   Current Discord ID: ${llandriUser.discordId || 'None'}`);

    // Step 3: Link Discord ID
    console.log('\n3. Linking Discord ID...');
    const { error: updateError } = await supabase
      .from('users')
      .update({
        discordId: discordId,
        huntmaster: true, // Ensure authorization
        isActive: true    // Ensure active
      })
      .eq('id', llandriUser.id);

    if (updateError) {
      throw updateError;
    }

    console.log(`   ✅ Linked Discord ID ${discordId} to ${username}`);

    // Step 4: Verify
    console.log('\n4. Verifying link...');
    const { data: updatedUser, error: verifyError } = await supabase
      .from('users')
      .select('id, username, discordId, huntmaster, isActive')
      .eq('username', username)
      .single();

    if (verifyError) {
      throw verifyError;
    }

    console.log('\n✅ Discord ID linked successfully!');
    console.log(`📊 llandri Status:`);
    console.log(`   - Username: ${updatedUser.username}`);
    console.log(`   - Discord ID: ${updatedUser.discordId}`);
    console.log(`   - HuntMaster Access: ${updatedUser.huntmaster ? '✅ Yes' : '❌ No'}`);
    console.log(`   - Active: ${updatedUser.isActive ? '✅ Yes' : '❌ No'}`);
    console.log(`\n🎉 llandri can now log in via Discord!`);

  } catch (error: any) {
    console.error('❌ Error linking Discord ID:', error);
    process.exit(1);
  }
}

linkLlandriDiscordId();








