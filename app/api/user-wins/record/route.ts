import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { decrypt } from "@/lib/protection";

export async function POST(request: Request) {
  try {
    const { session, gameTitle, bet, winAmount, provider } = await request.json();

    if (!session) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    if (!gameTitle || typeof gameTitle !== "string") {
      return NextResponse.json({ success: false, error: "gameTitle is required" }, { status: 400 });
    }

    if (typeof bet !== "number" || bet < 0) {
      return NextResponse.json({ success: false, error: "bet must be a non-negative number" }, { status: 400 });
    }

    if (typeof winAmount !== "number" || winAmount < 0) {
      return NextResponse.json({ success: false, error: "winAmount must be a non-negative number" }, { status: 400 });
    }

    const sessionData = JSON.parse(decrypt(session));
    const userId = sessionData.userId;

    // COST OPTIMIZATION: Removed game verification entirely to reduce API costs
    // Users can record wins for any game name - no expensive API verification needed
    // This eliminates all API calls from win recording (was causing significant costs)
    // COST OPTIMIZATION: Only saves biggest win per game per user (reduces storage by ~94%)
    const gameTitleTrimmed = gameTitle.trim();

    // Calculate X win
    const xWin = bet > 0 ? Number((winAmount / bet).toFixed(2)) : 0;

    // Create win record (will only save if it's the biggest win for this game)
    const winRecord: any = {
      userId,
      gameTitle: gameTitleTrimmed,
      bet,
      winAmount,
      xWin,
    };

    // Only include optional fields if they have values (Firestore doesn't allow undefined)
    if (provider && provider.trim()) {
      winRecord.provider = provider.trim();
    }

    console.log('Recording win (will save only if biggest):', {
      userId,
      gameTitle: gameTitleTrimmed,
      bet,
      winAmount,
      xWin,
      provider: winRecord.provider
    });

    let created;
    try {
      console.log('📝 Attempting to create or update best win record with:', winRecord);
      created = await supabaseAdmin.userWins.createOrUpdateBest(winRecord);
      console.log('✅ Win record created/updated successfully:', {
        id: created.id,
        userId,
        gameTitle: created.gameTitle,
        winAmount: created.winAmount,
        xWin: created.xWin,
        provider: created.provider
      });
    } catch (createError: any) {
      console.error('❌ Error creating win record:', {
        error: createError,
        message: createError?.message,
        code: createError?.code,
        details: createError?.details,
        hint: createError?.hint,
        winRecord
      });
      
      // Return detailed error to client
      return NextResponse.json(
        {
          success: false,
          error: `Failed to save win to database: ${createError?.message || String(createError)}`,
          details: {
            code: createError?.code,
            hint: createError?.hint,
            message: createError?.message
          }
        },
        { status: 500 }
      );
    }

    // Also update the corresponding slot in the slots table to trigger real-time updates
    // This allows widgets to instantly see the win without polling
    try {
      const slots = await supabaseAdmin.slots.findByUserId(userId);
      console.log(`🔍 Searching for matching slot. Total slots: ${slots.length}, Looking for: "${gameTitleTrimmed}"`);
      
      // Find slot matching the game title (case-insensitive, flexible matching)
      const matchingSlot = slots.find(slot => {
        const slotName = slot.name.toLowerCase().trim();
        const searchName = gameTitleTrimmed.toLowerCase().trim();
        // Exact match or one contains the other
        return slotName === searchName || 
               slotName.includes(searchName) || 
               searchName.includes(slotName);
      });
      
      if (matchingSlot) {
        // Update the slot's win field - this will trigger real-time subscription
        await supabaseAdmin.slots.update(matchingSlot.id, {
          win: winAmount,
          bet: bet, // Also update bet in case it changed
        });
        console.log(`✅ Updated slot ${matchingSlot.id} (${matchingSlot.name}) with win: ${winAmount}, bet: ${bet}`);
      } else {
        console.log(`⚠️ No matching slot found for game: "${gameTitleTrimmed}". Available slots:`, 
          slots.map(s => s.name).slice(0, 5));
        // Slot might not exist yet - that's okay, the win is still recorded
      }
    } catch (slotUpdateError) {
      // Log error but don't fail the request - win is already recorded
      console.error("❌ Error updating slot after recording win:", slotUpdateError);
    }

    return NextResponse.json({
      success: true,
      data: {
        id: created.id,
        gameTitle: created.gameTitle,
        bet: created.bet,
        winAmount: created.winAmount,
        xWin: created.xWin,
        provider: created.provider,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";

