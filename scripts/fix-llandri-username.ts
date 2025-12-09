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

async function fixLlandriUsername() {
  try {
    console.log('Fixing username for llandri...\n');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const userId = '28a00513-1bea-4d5c-938c-c236d5d7470f';
    const correctUsername = 'llandri';

    // Step 1: Check both users
    console.log('1. Checking users...');
    
    // Check the UUID user
    const { data: uuidUser, error: uuidError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (uuidError && uuidError.code !== 'PGRST116') {
      throw uuidError;
    }

    // Check if llandri user exists
    const { data: llandriUser, error: llandriError } = await supabase
      .from('users')
      .select('*')
      .eq('username', correctUsername)
      .single();

    if (llandriError && llandriError.code !== 'PGRST116') {
      throw llandriError;
    }

    console.log('\nUUID User (28a00513...):');
    if (uuidUser) {
      console.log(`   - Username: ${uuidUser.username}`);
      console.log(`   - Discord ID: ${uuidUser.discordId || 'None'}`);
      console.log(`   - huntmaster: ${uuidUser.huntmaster}`);
      console.log(`   - isActive: ${uuidUser.isActive}`);
    } else {
      console.log('   - Not found');
    }

    console.log('\nllandri User:');
    if (llandriUser) {
      console.log(`   - Username: ${llandriUser.username}`);
      console.log(`   - ID: ${llandriUser.id}`);
      console.log(`   - Discord ID: ${llandriUser.discordId || 'None'}`);
      console.log(`   - huntmaster: ${llandriUser.huntmaster}`);
      console.log(`   - isActive: ${llandriUser.isActive}`);
    } else {
      console.log('   - Not found');
    }

    // Step 2: Handle merge or update
    if (uuidUser && llandriUser && uuidUser.id !== llandriUser.id) {
      console.log('\n2. Found two separate users - merging data...');
      
      const llandriUserId = llandriUser.id;
      const uuidUserId = uuidUser.id;

      console.log(`   Primary user: ${llandriUser.username} (${llandriUserId})`);
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

      // Migrate wins
      if (uuidWins && uuidWins.length > 0) {
        const { error: updateWinsError } = await supabase
          .from('userWins')
          .update({ userId: String(llandriUserId), username: correctUsername })
          .eq('userId', uuidUserId);

        if (updateWinsError) {
          console.error(`   ❌ Error updating wins:`, updateWinsError.message);
        } else {
          console.log(`   ✅ Migrated ${uuidWins.length} wins`);
        }
      }

      // Migrate settings
      if (uuidSettings && uuidSettings.length > 0) {
        const { data: llandriSettings } = await supabase
          .from('userSettings')
          .select('id')
          .eq('userId', String(llandriUserId))
          .single();

        if (llandriSettings) {
          await supabase
            .from('userSettings')
            .delete()
            .eq('userId', uuidUserId);
          console.log(`   ✅ Deleted UUID settings (kept llandri's)`);
        } else {
          await supabase
            .from('userSettings')
            .update({ userId: String(llandriUserId) })
            .eq('userId', uuidUserId);
          console.log(`   ✅ Migrated settings`);
        }
      }

      // Migrate slots
      if (uuidSlots && uuidSlots.length > 0) {
        const { error: updateSlotsError } = await supabase
          .from('slots')
          .update({ userId: String(llandriUserId) })
          .eq('userId', uuidUserId);

        if (updateSlotsError) {
          console.error(`   ❌ Error updating slots:`, updateSlotsError.message);
        } else {
          console.log(`   ✅ Migrated ${uuidSlots.length} slots`);
        }
      }

      // Migrate currentGame
      const { data: uuidCurrentGame } = await supabase
        .from('currentGame')
        .select('id')
        .eq('userId', uuidUserId)
        .single();

      if (uuidCurrentGame) {
        const { data: llandriCurrentGame } = await supabase
          .from('currentGame')
          .select('id')
          .eq('userId', String(llandriUserId))
          .single();

        if (llandriCurrentGame) {
          await supabase
            .from('currentGame')
            .delete()
            .eq('userId', uuidUserId);
          console.log(`   ✅ Deleted UUID currentGame (kept llandri's)`);
        } else {
          await supabase
            .from('currentGame')
            .update({ userId: String(llandriUserId) })
            .eq('userId', uuidUserId);
          console.log(`   ✅ Migrated currentGame`);
        }
      }

      // Ensure llandri has authorization
      await supabase
        .from('users')
        .update({
          huntmaster: true,
          isActive: true
        })
        .eq('id', llandriUserId);

      console.log(`   ✅ Ensured llandri has authorization`);

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
      console.log(`\nAll data from UUID user has been migrated to llandri.`);

    } else if (uuidUser && !llandriUser) {
      // Only UUID user exists - update username
      console.log('\n2. Only UUID user exists - updating username...');
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

      // Update userWins
      await supabase
        .from('userWins')
        .update({ username: correctUsername })
        .eq('userId', userId);

      console.log(`\n✅ Updated username to "${correctUsername}"`);

    } else if (llandriUser && !uuidUser) {
      // llandri already exists and UUID user doesn't
      console.log('\n✅ llandri user already exists!');
      
      // Just make sure userWins are updated
      await supabase
        .from('userWins')
        .update({ username: correctUsername })
        .eq('userId', llandriUser.id);

      console.log(`\n✅ Updated userWins to use "${correctUsername}"`);
    }

    // Step 3: Final verification
    console.log('\n3. Verifying final state...');
    const { data: finalWins } = await supabase
      .from('userWins')
      .select('id, userId, username')
      .or(`userId.eq.${userId},username.eq.${correctUsername}`);

    const llandriWins = (finalWins || []).filter(w => w.username === correctUsername || w.userId === '28a00513-1bea-4d5c-938c-c236d5d7470f');
    
    console.log(`   ✅ Wins for llandri: ${llandriWins.length}`);
    llandriWins.forEach(win => {
      if (win.username !== correctUsername) {
        console.log(`   ⚠️  Win ${win.id} still has wrong username: ${win.username}`);
      }
    });

    console.log('\n✅ Update completed!');

  } catch (error: any) {
    console.error('❌ Error fixing username:', error);
    process.exit(1);
  }
}

fixLlandriUsername();





