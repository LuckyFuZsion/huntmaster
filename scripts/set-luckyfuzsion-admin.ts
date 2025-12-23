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

async function setLuckyFuZsionAsAdmin() {
  try {
    console.log('Setting LuckyFuZsion as admin...\n');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    // Step 1: Check current admin status
    console.log('1. Checking current admin status...');
    const { data: currentAdmins, error: adminError } = await supabase
      .from('users')
      .select('id, username, huntmasterAdmin')
      .eq('huntmasterAdmin', true);

    if (adminError) {
      throw adminError;
    }

    if (currentAdmins && currentAdmins.length > 0) {
      console.log(`   Current admins:`);
      currentAdmins.forEach(admin => {
        console.log(`   - ${admin.username} (${admin.id})`);
      });
    } else {
      console.log('   No current admins');
    }

    // Step 2: Set LuckyFuZsion as admin
    console.log('\n2. Setting LuckyFuZsion as admin...');
    const { error: updateError } = await supabase
      .from('users')
      .update({ huntmasterAdmin: true })
      .eq('username', 'LuckyFuZsion');

    if (updateError) {
      throw updateError;
    }

    console.log('   ✅ Set LuckyFuZsion as admin');

    // Step 3: Verify (the trigger should have unset other admins)
    console.log('\n3. Verifying admin status...');
    const { data: verifyAdmins, error: verifyError } = await supabase
      .from('users')
      .select('id, username, huntmasterAdmin')
      .eq('huntmasterAdmin', true);

    if (verifyError) {
      console.error('   Error verifying:', verifyError);
    } else {
      console.log(`   ✅ Total admins: ${verifyAdmins?.length || 0}`);
      if (verifyAdmins && verifyAdmins.length > 0) {
        verifyAdmins.forEach(admin => {
          console.log(`   - ${admin.username} (${admin.id})`);
        });
      }
    }

    // Step 4: Get LuckyFuZsion's full status
    const { data: luckyUser, error: userError } = await supabase
      .from('users')
      .select('id, username, huntmasterAdmin, isAdmin, huntmaster, isActive')
      .eq('username', 'LuckyFuZsion')
      .single();

    if (userError) {
      throw userError;
    }

    console.log('\n✅ Admin setup completed!');
    console.log(`📊 LuckyFuZsion status:`);
    console.log(`   - Username: ${luckyUser.username}`);
    console.log(`   - HuntMaster Admin: ${luckyUser.huntmasterAdmin ? '✅ Yes' : '❌ No'}`);
    console.log(`   - Main App Admin: ${luckyUser.isAdmin ? '✅ Yes' : '❌ No'}`);
    console.log(`   - HuntMaster Access: ${luckyUser.huntmaster ? '✅ Yes' : '❌ No'}`);
    console.log(`   - Active: ${luckyUser.isActive ? '✅ Yes' : '❌ No'}`);

  } catch (error: any) {
    console.error('❌ Error setting admin:', error);
    process.exit(1);
  }
}

setLuckyFuZsionAsAdmin();








