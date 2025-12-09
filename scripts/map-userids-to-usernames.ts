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

async function mapUserIdsToUsernames() {
  try {
    console.log('Mapping userIds to usernames...\n');

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    // Get all unique userIds from userWins
    console.log('1. Fetching unique userIds from userWins...');
    const { data: wins, error: winsError } = await supabase
      .from('userWins')
      .select('userId')
      .order('createdAt', { ascending: false });

    if (winsError) {
      throw winsError;
    }

    const uniqueUserIds = [...new Set(wins.map((w: any) => w.userId))];
    console.log(`   Found ${uniqueUserIds.length} unique userIds:`, uniqueUserIds);
    console.log();

    // Get all users
    console.log('2. Fetching all users...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, username')
      .order('createdAt', { ascending: false });

    if (usersError) {
      throw usersError;
    }

    console.log(`   Found ${users?.length || 0} users`);
    if (users && users.length > 0) {
      console.log('   User IDs:', users.map(u => u.id));
      console.log('   User IDs as strings:', users.map(u => String(u.id)));
    }
    console.log();

    // Create mapping
    console.log('3. Creating mapping...\n');
    const mapping: { userId: string; username: string | null; matchType: string }[] = [];

    for (const userId of uniqueUserIds) {
      // Try exact match
      let user = users?.find(u => u.id === userId);
      let matchType = 'exact';

      // Try string comparison
      if (!user) {
        user = users?.find(u => String(u.id) === userId);
        matchType = 'string';
      }

      // Try UUID format comparison
      if (!user && userId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        // Try finding by UUID format
        user = users?.find(u => {
          const userUuid = String(u.id);
          return userUuid.toLowerCase() === userId.toLowerCase();
        });
        matchType = 'uuid';
      }

      mapping.push({
        userId,
        username: user?.username || null,
        matchType: user ? matchType : 'no_match'
      });
    }

    // Display results
    console.log('📊 USERID TO USERNAME MAPPING:');
    console.log('=' .repeat(80));
    console.log('UserID'.padEnd(40) + 'Username'.padEnd(30) + 'Match Type');
    console.log('-'.repeat(80));

    let matched = 0;
    let unmatched = 0;

    for (const m of mapping) {
      const status = m.username ? '✅' : '❌';
      console.log(
        `${status} ${m.userId.padEnd(38)} ${(m.username || 'NOT FOUND').padEnd(28)} ${m.matchType}`
      );
      if (m.username) matched++;
      else unmatched++;
    }

    console.log('-'.repeat(80));
    console.log(`\nSummary:`);
    console.log(`  ✅ Matched: ${matched}`);
    console.log(`  ❌ Unmatched: ${unmatched}`);
    console.log(`  Total userIds: ${mapping.length}`);

    // Show win counts per userId
    console.log('\n📈 Win counts per userId:');
    const winCounts = new Map<string, number>();
    wins.forEach((w: any) => {
      winCounts.set(w.userId, (winCounts.get(w.userId) || 0) + 1);
    });

    for (const [userId, count] of winCounts.entries()) {
      const mappingEntry = mapping.find(m => m.userId === userId);
      console.log(`  ${userId}: ${count} wins - ${mappingEntry?.username || 'NO USERNAME'}`);
    }

  } catch (error: any) {
    console.error('❌ Error mapping userIds:', error);
    process.exit(1);
  }
}

mapUserIdsToUsernames();





