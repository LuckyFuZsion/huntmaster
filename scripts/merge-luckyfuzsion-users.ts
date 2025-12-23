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

async function mergeLuckyFuZsionUsers() {
  try {
    console.log('Merging LuckyFuZsion users...\n');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const targetUserId = '6777c049-6312-4325-8556-dee7f70d5dae';
    const correctUsername = 'LuckyFuZsion';

    // Step 1: Check both users
    console.log('1. Checking users...');
    
    // Check the UUID user
    const { data: uuidUser, error: uuidError } = await supabase
      .from('users')
      .select('*')
      .eq('id', targetUserId)
      .single();

    if (uuidError && uuidError.code !== 'PGRST116') {
      throw uuidError;
    }

    // Check the LuckyFuZsion user
    const { data: luckyUser, error: luckyError } = await supabase
      .from('users')
      .select('*')
      .eq('username', correctUsername)
      .single();

    if (luckyError && luckyError.code !== 'PGRST116') {
      throw luckyError;
    }

    console.log('\nUUID User (6777c049...):');
    if (uuidUser) {
      console.log(`   - Username: ${uuidUser.username}`);
      console.log(`   - Discord ID: ${uuidUser.discordId || 'None'}`);
      console.log(`   - huntmaster: ${uuidUser.huntmaster}`);
      console.log(`   - isActive: ${uuidUser.isActive}`);
    } else {
      console.log('   - Not found');
    }

    console.log('\nLuckyFuZsion User:');
    if (luckyUser) {
      console.log(`   - Username: ${luckyUser.username}`);
      console.log(`   - ID: ${luckyUser.id}`);
      console.log(`   - Discord ID: ${luckyUser.discordId || 'None'}`);
      console.log(`   - huntmaster: ${luckyUser.huntmaster}`);
      console.log(`   - isActive: ${luckyUser.isActive}`);
    } else {
      console.log('   - Not found');
    }

    if (!uuidUser && !luckyUser) {
      console.log('\n❌ Neither user found!');
      return;
    }

    // Step 2: Determine merge strategy
    if (uuidUser && luckyUser && uuidUser.id !== luckyUser.id) {
      console.log('\n2. Found two separate users - merging data...');
      
      // The LuckyFuZsion user (from Discord) should be the primary one
      // We need to:
      // 1. Move all data from UUID user to LuckyFuZsion user
      // 2. Update all references (userWins, userSettings, slots) to use LuckyFuZsion's ID
      // 3. Delete the UUID user

      const luckyUserId = luckyUser.id;
      const uuidUserId = uuidUser.id;

      console.log(`   Primary user: ${luckyUser.username} (${luckyUserId})`);
      console.log(`   Secondary user: ${uuidUser.username} (${uuidUserId})`);

      // Check what data exists for UUID user
      const { data: uuidWins } = await supabase
        .from('userWins')
        .select('id')
        .eq('userId', uuidUserId);

      const { data: uuidSettings } = await supabase
        .from('userSettings')
        .select('id')
        .eq('userId', uuidUserId);

      const { data: uuidSlots } = await supabase
        .from('slots')
        .select('id')
        .eq('userId', uuidUserId);

      console.log(`\n   Data to migrate:`);
      console.log(`   - Wins: ${uuidWins?.length || 0}`);
      console.log(`   - Settings: ${uuidSettings?.length || 0}`);
      console.log(`   - Slots: ${uuidSlots?.length || 0}`);

      // Update userWins
      if (uuidWins && uuidWins.length > 0) {
        const { error: updateWinsError } = await supabase
          .from('userWins')
          .update({ userId: String(luckyUserId) })
          .eq('userId', uuidUserId);

        if (updateWinsError) {
          console.error(`   ❌ Error updating wins:`, updateWinsError.message);
        } else {
          console.log(`   ✅ Migrated ${uuidWins.length} wins`);
        }
      }

      // Update userSettings
      if (uuidSettings && uuidSettings.length > 0) {
        // Check if LuckyFuZsion already has settings
        const { data: luckySettings } = await supabase
          .from('userSettings')
          .select('id')
          .eq('userId', String(luckyUserId))
          .single();

        if (luckySettings) {
          // Delete UUID user's settings (keep LuckyFuZsion's)
          const { error: deleteSettingsError } = await supabase
            .from('userSettings')
            .delete()
            .eq('userId', uuidUserId);

          if (deleteSettingsError) {
            console.error(`   ❌ Error deleting UUID settings:`, deleteSettingsError.message);
          } else {
            console.log(`   ✅ Deleted UUID settings (kept LuckyFuZsion's)`);
          }
        } else {
          // Update UUID settings to use LuckyFuZsion's ID
          const { error: updateSettingsError } = await supabase
            .from('userSettings')
            .update({ userId: String(luckyUserId) })
            .eq('userId', uuidUserId);

          if (updateSettingsError) {
            console.error(`   ❌ Error updating settings:`, updateSettingsError.message);
          } else {
            console.log(`   ✅ Migrated settings`);
          }
        }
      }

      // Update slots
      if (uuidSlots && uuidSlots.length > 0) {
        const { error: updateSlotsError } = await supabase
          .from('slots')
          .update({ userId: String(luckyUserId) })
          .eq('userId', uuidUserId);

        if (updateSlotsError) {
          console.error(`   ❌ Error updating slots:`, updateSlotsError.message);
        } else {
          console.log(`   ✅ Migrated ${uuidSlots.length} slots`);
        }
      }

      // Update currentGame if exists
      const { data: uuidCurrentGame } = await supabase
        .from('currentGame')
        .select('id')
        .eq('userId', uuidUserId)
        .single();

      if (uuidCurrentGame) {
        // Check if LuckyFuZsion has currentGame
        const { data: luckyCurrentGame } = await supabase
          .from('currentGame')
          .select('id')
          .eq('userId', String(luckyUserId))
          .single();

        if (luckyCurrentGame) {
          // Delete UUID's currentGame
          await supabase
            .from('currentGame')
            .delete()
            .eq('userId', uuidUserId);
          console.log(`   ✅ Deleted UUID currentGame (kept LuckyFuZsion's)`);
        } else {
          // Update UUID currentGame to use LuckyFuZsion's ID
          await supabase
            .from('currentGame')
            .update({ userId: String(luckyUserId) })
            .eq('userId', uuidUserId);
          console.log(`   ✅ Migrated currentGame`);
        }
      }

      // Ensure LuckyFuZsion has authorization
      const { error: authError } = await supabase
        .from('users')
        .update({
          huntmaster: true,
          isActive: true
        })
        .eq('id', luckyUserId);

      if (authError) {
        console.error(`   ❌ Error authorizing LuckyFuZsion:`, authError.message);
      } else {
        console.log(`   ✅ Ensured LuckyFuZsion has authorization`);
      }

      // Delete the UUID user
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', uuidUserId);

      if (deleteError) {
        console.error(`   ❌ Error deleting UUID user:`, deleteError.message);
      } else {
        console.log(`   ✅ Deleted duplicate UUID user`);
      }

      console.log('\n✅ Merge completed!');
      console.log(`\nYou can now log in as "LuckyFuZsion" with Discord.`);
      console.log(`All data from UUID user has been migrated to LuckyFuZsion.`);

    } else if (uuidUser && !luckyUser) {
      // Only UUID user exists - just update username
      console.log('\n2. Only UUID user exists - updating username...');
      const { error: updateError } = await supabase
        .from('users')
        .update({
          username: correctUsername,
          huntmaster: true,
          isActive: true
        })
        .eq('id', targetUserId);

      if (updateError) {
        throw updateError;
      }

      // Update userWins
      await supabase
        .from('userWins')
        .update({ username: correctUsername })
        .eq('userId', targetUserId);

      console.log(`\n✅ Updated username to "${correctUsername}"`);
      console.log(`\nYou can now log in as "LuckyFuZsion"`);

    } else if (luckyUser && !uuidUser) {
      // LuckyFuZsion already exists and is correct
      console.log('\n✅ LuckyFuZsion user already exists and is correct!');
      console.log(`\nYou can log in as "LuckyFuZsion" with Discord.`);
    }

  } catch (error: any) {
    console.error('❌ Error merging users:', error);
    process.exit(1);
  }
}

mergeLuckyFuZsionUsers();








