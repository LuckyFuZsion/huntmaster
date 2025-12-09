import { NextResponse } from "next/server";
import { decrypt } from "@/lib/protection";
import { createClient } from '@supabase/supabase-js';

/**
 * Cleanup duplicate user wins - keeps only:
 * 1. The entry with the highest winAmount
 * 2. The entry with the highest xWin
 * 
 * For each user+game combination, these could be the same entry or two different entries.
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

    // Step 1: Get all wins
    const { data: allWins, error: fetchError } = await supabase
      .from('userWins')
      .select('*')
      .order('createdAt', { ascending: false });

    if (fetchError) {
      throw fetchError;
    }

    if (!allWins || allWins.length === 0) {
      return NextResponse.json({
        success: true,
        results: {
          duplicatesFound: 0,
          entriesToKeep: 0,
          entriesDeleted: 0,
          remainingDuplicates: 0,
        },
      });
    }

    // Group by userId + gameTitle
    const grouped = new Map<string, any[]>();
    allWins.forEach((win: any) => {
      const key = `${win.userId}|${win.gameTitle}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(win);
    });

    // Find duplicates (more than 1 entry per user+game)
    const duplicates = Array.from(grouped.entries())
      .filter(([_, wins]) => wins.length > 1)
      .map(([key, wins]) => ({ key, wins }));

    console.log(`Found ${duplicates.length} user+game combinations with duplicates`);

    // Step 2: For each duplicate group, identify entries to keep
    const entriesToKeep = new Set<string>();
    const entriesToDelete: string[] = [];

    for (const { wins } of duplicates) {
      // Find entry with highest winAmount
      const maxWinAmountEntry = wins.reduce((best, current) => {
        const bestAmount = Number(best.winAmount);
        const currentAmount = Number(current.winAmount);
        if (currentAmount > bestAmount) return current;
        if (currentAmount === bestAmount) {
          // If tie, prefer newer one
          return new Date(current.createdAt) > new Date(best.createdAt) ? current : best;
        }
        return best;
      });

      // Find entry with highest xWin
      const maxXWinEntry = wins.reduce((best, current) => {
        const bestX = Number(best.xWin);
        const currentX = Number(current.xWin);
        if (currentX > bestX) return current;
        if (currentX === bestX) {
          // If tie, prefer newer one
          return new Date(current.createdAt) > new Date(best.createdAt) ? current : best;
        }
        return best;
      });

      // Keep both entries (they might be the same)
      entriesToKeep.add(maxWinAmountEntry.id);
      entriesToKeep.add(maxXWinEntry.id);

      // Mark all others for deletion
      wins.forEach((win: any) => {
        if (!entriesToKeep.has(win.id)) {
          entriesToDelete.push(win.id);
        }
      });
    }

    console.log(`Keeping ${entriesToKeep.size} entries, deleting ${entriesToDelete.length} entries`);

    // Step 3: Delete entries
    let deletedCount = 0;
    if (entriesToDelete.length > 0) {
      // Delete in batches to avoid query size limits
      const batchSize = 100;
      for (let i = 0; i < entriesToDelete.length; i += batchSize) {
        const batch = entriesToDelete.slice(i, i + batchSize);
        const { error: deleteError } = await supabase
          .from('userWins')
          .delete()
          .in('id', batch);

        if (deleteError) {
          console.error(`Error deleting batch ${i}-${i + batchSize}:`, deleteError);
        } else {
          deletedCount += batch.length;
        }
      }
    }

    // Step 4: Verify cleanup
    const { data: remainingWins, error: verifyError } = await supabase
      .from('userWins')
      .select('userId, gameTitle');

    if (verifyError) {
      console.error('Error verifying cleanup:', verifyError);
    }

    const remainingGrouped = new Map<string, number>();
    (remainingWins || []).forEach((win: any) => {
      const key = `${win.userId}|${win.gameTitle}`;
      remainingGrouped.set(key, (remainingGrouped.get(key) || 0) + 1);
    });

    const stillDuplicated = Array.from(remainingGrouped.values()).filter(count => count > 1).length;

    return NextResponse.json({
      success: true,
      results: {
        duplicatesFound: duplicates.length,
        entriesToKeep: entriesToKeep.size,
        entriesDeleted: deletedCount,
        remainingDuplicates: stillDuplicated,
      },
    });
  } catch (error: any) {
    console.error('Error cleaning up duplicate user wins:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to cleanup duplicates',
        details: error,
      },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";

