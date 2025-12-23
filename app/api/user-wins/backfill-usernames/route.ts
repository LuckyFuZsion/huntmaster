import { NextResponse } from "next/server";
import { decrypt } from "@/lib/protection";
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * Backfill usernames in userWins table
 * Updates all userWins records that don't have a username by looking up
 * the username from the users table based on userId
 */
export async function POST(request: Request) {
  try {
    const { session } = await request.json();

    if (!session) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const sessionData = JSON.parse(decrypt(session));
    const isAdmin = sessionData.isAdmin;

    if (!isAdmin) {
      return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });
    }

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    // Step 1: Get all userWins that need username backfill
    const { data: winsWithoutUsername, error: fetchError } = await supabase
      .from('userWins')
      .select('id, userId')
      .is('username', null);

    if (fetchError) {
      throw fetchError;
    }

    if (!winsWithoutUsername || winsWithoutUsername.length === 0) {
      return NextResponse.json({
        success: true,
        message: "All userWins already have usernames",
        results: {
          totalWins: 0,
          updated: 0,
          failed: 0,
        },
      });
    }

    console.log(`Found ${winsWithoutUsername.length} wins without username`);

    // Step 2: Group by userId to batch lookups
    const userIds = [...new Set(winsWithoutUsername.map(w => w.userId))];
    console.log(`Found ${userIds.length} unique userIds to look up`);

    // Step 3: Fetch usernames for all userIds
    const userMap = new Map<string, string>();
    for (const userId of userIds) {
      try {
        const user = await supabaseAdmin.users.findOne(userId);
        if (user && user.username) {
          userMap.set(userId, user.username);
        }
      } catch (userError) {
        console.warn(`Could not fetch user for userId ${userId}:`, userError);
      }
    }

    console.log(`Found usernames for ${userMap.size} users`);

    // Step 4: Update userWins with usernames
    let updated = 0;
    let failed = 0;
    const batchSize = 100;

    for (let i = 0; i < winsWithoutUsername.length; i += batchSize) {
      const batch = winsWithoutUsername.slice(i, i + batchSize);
      
      for (const win of batch) {
        const username = userMap.get(win.userId);
        if (username) {
          const { error: updateError } = await supabase
            .from('userWins')
            .update({ username })
            .eq('id', win.id);

          if (updateError) {
            console.error(`Error updating win ${win.id}:`, updateError);
            failed++;
          } else {
            updated++;
          }
        } else {
          failed++;
          console.warn(`No username found for userId ${win.userId}`);
        }
      }
    }

    // Step 5: Verify results
    const { data: remainingWins, error: verifyError } = await supabase
      .from('userWins')
      .select('id')
      .is('username', null);

    if (verifyError) {
      console.error('Error verifying results:', verifyError);
    }

    const stillMissing = remainingWins?.length || 0;

    return NextResponse.json({
      success: true,
      message: `Backfill completed: ${updated} updated, ${failed} failed`,
      results: {
        totalWinsNeedingUpdate: winsWithoutUsername.length,
        updated,
        failed,
        stillMissing,
      },
    });
  } catch (error: any) {
    console.error('Error backfilling usernames:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to backfill usernames',
        details: error,
      },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";








