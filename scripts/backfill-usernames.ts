import { createClient } from '@supabase/supabase-js';

// Simple env loader without dotenv
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

async function backfillUsernames() {
  try {
    console.log('Starting username backfill...');

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables. Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    // Step 1: Get all userWins that need username backfill
    console.log('Fetching wins without username...');
    const { data: winsWithoutUsername, error: fetchError } = await supabase
      .from('userWins')
      .select('id, userId')
      .is('username', null);

    if (fetchError) {
      throw fetchError;
    }

    if (!winsWithoutUsername || winsWithoutUsername.length === 0) {
      console.log('✅ All userWins already have usernames!');
      return;
    }

    console.log(`Found ${winsWithoutUsername.length} wins without username`);

    // Step 2: Group by userId to batch lookups
    const userIds = [...new Set(winsWithoutUsername.map(w => w.userId))];
    console.log(`Found ${userIds.length} unique userIds to look up`);

    // Step 3: Execute SQL UPDATE directly to backfill usernames
    console.log('Executing SQL UPDATE to backfill usernames...');
    
    // Since Supabase doesn't support raw SQL via client, we'll do it via individual updates
    // But first, let's try to get all users and wins in one go
    const { data: allUsers, error: usersError } = await supabase
      .from('users')
      .select('id, username');
    
    if (usersError) {
      console.error('Error fetching users:', usersError);
      // Continue anyway - maybe users table has different structure
    }
    
    console.log(`Found ${allUsers?.length || 0} users`);
    
    // Get all wins with their userIds
    const { data: allWins, error: winsError } = await supabase
      .from('userWins')
      .select('id, userId')
      .is('username', null);
    
    if (winsError) {
      throw winsError;
    }
    
    if (!allWins || allWins.length === 0) {
      console.log('✅ No wins need updating');
      return;
    }
    
    console.log(`Updating ${allWins.length} wins...`);
    
    let updated = 0;
    let failed = 0;
    const userMap = new Map<string, string>();
    
    // Build user map
    if (allUsers && allUsers.length > 0) {
      allUsers.forEach(user => {
        userMap.set(String(user.id), user.username);
      });
    }
    
    // Update each win
    for (const win of allWins) {
      const username = userMap.get(win.userId);
      if (username) {
        const { error: updateError } = await supabase
          .from('userWins')
          .update({ username })
          .eq('id', win.id);
        
        if (updateError) {
          console.error(`❌ Error updating win ${win.id}:`, updateError.message);
          failed++;
        } else {
          updated++;
        }
      } else {
        // Try to fetch user directly
        try {
          const { data: user, error: fetchError } = await supabase
            .from('users')
            .select('username')
            .eq('id', win.userId)
            .single();
          
          if (!fetchError && user?.username) {
            const { error: updateError } = await supabase
              .from('userWins')
              .update({ username: user.username })
              .eq('id', win.id);
            
            if (updateError) {
              failed++;
            } else {
              updated++;
            }
          } else {
            failed++;
            console.warn(`⚠️ No username found for userId ${win.userId}`);
          }
        } catch (e) {
          failed++;
        }
      }
    }
    
    console.log(`\n✅ Updated ${updated} wins, ${failed} failed`);

    // Step 5: Verify results
    console.log('\nVerifying results...');
    const { data: remainingWins, error: verifyError } = await supabase
      .from('userWins')
      .select('id')
      .is('username', null);

    if (verifyError) {
      console.error('Error verifying results:', verifyError);
    }

    const stillMissing = remainingWins?.length || 0;

    console.log('\n✅ Backfill completed!');
    console.log(`📊 Results:`);
    console.log(`   - Total wins needing update: ${winsWithoutUsername.length}`);
    console.log(`   - Successfully updated: ${updated}`);
    console.log(`   - Failed: ${failed}`);
    console.log(`   - Still missing username: ${stillMissing}`);

  } catch (error: any) {
    console.error('❌ Error backfilling usernames:', error);
    process.exit(1);
  }
}

backfillUsernames();

