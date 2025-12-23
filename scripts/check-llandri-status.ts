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

async function checkLlandriStatus() {
  try {
    console.log('Checking llandri authorization status...\n');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    // Find llandri user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, username, discordId, huntmaster, isActive, huntmasterAdmin, isAdmin, createdAt')
      .eq('username', 'llandri')
      .single();

    if (userError) {
      if (userError.code === 'PGRST116') {
        console.log('❌ User "llandri" not found in users table');
        return;
      }
      throw userError;
    }

    console.log('📊 Llandri Status:');
    console.log(`   Username: ${user.username}`);
    console.log(`   User ID: ${user.id}`);
    console.log(`   Discord ID: ${user.discordId || '❌ Not linked'}`);
    console.log(`   HuntMaster Access: ${user.huntmaster ? '✅ Yes' : '❌ No'}`);
    console.log(`   Active: ${user.isActive ? '✅ Yes' : '❌ No'}`);
    console.log(`   HuntMaster Admin: ${user.huntmasterAdmin ? '✅ Yes' : '❌ No'}`);
    console.log(`   Main App Admin: ${user.isAdmin ? '✅ Yes' : '❌ No'}`);
    console.log(`   Created: ${user.createdAt}`);

    // Determine if they can log in
    const canLogin = user.huntmaster && user.isActive;
    const hasDiscord = !!user.discordId;

    console.log('\n🔐 Login Status:');
    if (hasDiscord && canLogin) {
      console.log('   ✅ Can log in via Discord');
      console.log('   ✅ All authorization flags are set correctly');
    } else if (!hasDiscord) {
      console.log('   ⚠️  Cannot log in via Discord (no Discord ID)');
      console.log('   ℹ️  User needs to log in via Discord to link their account');
    } else if (!canLogin) {
      console.log('   ❌ Cannot log in (authorization missing)');
      if (!user.huntmaster) {
        console.log('      - Missing: huntmaster = true');
      }
      if (!user.isActive) {
        console.log('      - Missing: isActive = true');
      }
    }

    // Check their wins
    const { data: wins } = await supabase
      .from('userWins')
      .select('id')
      .eq('userId', user.id);

    console.log(`\n📈 Activity:`);
    console.log(`   Total wins: ${wins?.length || 0}`);

  } catch (error: any) {
    console.error('❌ Error checking status:', error);
    process.exit(1);
  }
}

checkLlandriStatus();








