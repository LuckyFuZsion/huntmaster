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

    // Verify game exists in database before saving
    const gameTitleTrimmed = gameTitle.trim();
    const origin = request.headers.get("origin") || 
                   (request.url.startsWith("http") ? new URL(request.url).origin : null) ||
                   process.env.NEXT_PUBLIC_APP_URL ||
                   "http://localhost:3000";
    const searchUrl = new URL("/api/slots-suggest", origin);
    searchUrl.searchParams.set("q", gameTitleTrimmed);
    searchUrl.searchParams.set("limit", "10");
    searchUrl.searchParams.set("exhaustive", "1");
    
    let gameExists = false;
    let verificationError: string | null = null;
    
    // Helper function for loose provider matching (e.g., "Pragmatic" matches "Pragmatic Play")
    const providersMatch = (provider1: string | null | undefined, provider2: string | null | undefined): boolean => {
      if (!provider1 || !provider2) return true; // If either is missing, don't filter by provider
      const p1 = provider1.toLowerCase().trim();
      const p2 = provider2.toLowerCase().trim();
      if (p1 === p2) return true;
      // Check if one contains the other (e.g., "pragmatic" in "pragmatic play")
      if (p1.includes(p2) || p2.includes(p1)) return true;
      // Check common abbreviations
      const abbreviations: { [key: string]: string[] } = {
        'pragmatic play': ['pragmatic'],
        'nolimit city': ['nolimit', 'nlc'],
        'play\'n go': ['playngo', 'play n go'],
      };
      for (const [full, abbrevs] of Object.entries(abbreviations)) {
        if ((p1 === full && abbrevs.includes(p2)) || (p2 === full && abbrevs.includes(p1))) {
          return true;
        }
      }
      return false;
    };
    
    try {
      const searchRes = await fetch(searchUrl.toString(), { cache: "no-store" });
      const searchData = await searchRes.json();
      if (searchData.success && Array.isArray(searchData.data)) {
        const titleLower = gameTitleTrimmed.toLowerCase();
        // More flexible matching - allow partial matches and normalize spaces
        // Also do loose provider matching if provider is provided
        gameExists = searchData.data.some((it: any) => {
          const itTitle = it.title?.toLowerCase().trim().replace(/\s+/g, ' ');
          const searchTitle = titleLower.replace(/\s+/g, ' ');
          const titleMatches = itTitle === searchTitle || 
                 itTitle.includes(searchTitle) || 
                 searchTitle.includes(itTitle);
          
          // If title matches and we have a provider, also check provider match
          if (titleMatches && provider) {
            return providersMatch(provider, it.provider);
          }
          
          return titleMatches;
        });
        
        if (!gameExists) {
          // Check if title matched but provider didn't
          const titleMatchedGames = searchData.data.filter((it: any) => {
            const itTitle = it.title?.toLowerCase().trim().replace(/\s+/g, ' ');
            const searchTitle = titleLower.replace(/\s+/g, ' ');
            return itTitle === searchTitle || 
                   itTitle.includes(searchTitle) || 
                   searchTitle.includes(itTitle);
          });
          
          if (titleMatchedGames.length > 0 && provider) {
            verificationError = `Game "${gameTitleTrimmed}" found, but provider "${provider}" doesn't match. Found: ${titleMatchedGames.map((it: any) => `${it.title} - ${it.provider || 'No provider'}`).slice(0, 2).join(', ')}`;
          } else {
            verificationError = `Game "${gameTitleTrimmed}" not found in database. Available games: ${searchData.data.map((it: any) => it.title).slice(0, 3).join(', ')}...`;
          }
          
          console.warn(`Game verification failed for: "${gameTitleTrimmed}"`, {
            searched: titleLower,
            provider,
            found: searchData.data.map((it: any) => `${it.title?.toLowerCase().trim()} - ${it.provider || 'none'}`),
            titleMatched: titleMatchedGames.map((it: any) => `${it.title} - ${it.provider || 'none'}`)
          });
        }
      } else {
        verificationError = `Game search failed: ${searchData.error || 'Unknown error'}`;
        console.error("Game search failed:", searchData);
      }
    } catch (e) {
      verificationError = `Error verifying game existence: ${e instanceof Error ? e.message : String(e)}`;
      console.error("Error verifying game existence:", e);
      // Continue - we'll allow the save but log the error
    }

    // Log verification result for debugging
    console.log('Game verification result:', {
      gameExists,
      gameTitle: gameTitleTrimmed,
      provider,
      verificationError
    });

    // If game doesn't exist, log but still allow save (games might be added later)
    // We'll just log a warning instead of blocking
    if (!gameExists) {
      console.warn('⚠️ Game not found in database, but allowing save anyway:', {
        gameTitle: gameTitleTrimmed,
        provider,
        verificationError,
        note: 'Win will be saved but may not appear in widgets until game is added to database'
      });
      // Don't block the save - just warn
      // return NextResponse.json(
      //   { 
      //     success: false, 
      //     error: verificationError || "Game not found in database. Please select a game from the autocomplete dropdown.",
      //     details: {
      //       gameTitle: gameTitleTrimmed,
      //       verificationError
      //     }
      //   },
      //   { status: 400 }
      // );
    }

    // Calculate X win
    const xWin = bet > 0 ? Number((winAmount / bet).toFixed(2)) : 0;

    // Create win record
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

    console.log('Creating win record:', {
      userId,
      gameTitle: gameTitleTrimmed,
      bet,
      winAmount,
      xWin,
      provider: winRecord.provider
    });

    let created;
    try {
      console.log('📝 Attempting to create win record with:', winRecord);
      created = await supabaseAdmin.userWins.create(winRecord);
      console.log('✅ Win record created successfully:', {
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

