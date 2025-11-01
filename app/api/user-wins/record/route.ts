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
    try {
      const searchRes = await fetch(searchUrl.toString(), { cache: "no-store" });
      const searchData = await searchRes.json();
      if (searchData.success && Array.isArray(searchData.data)) {
        const titleLower = gameTitleTrimmed.toLowerCase();
        gameExists = searchData.data.some((it: any) => 
          it.title?.toLowerCase().trim() === titleLower
        );
      }
    } catch (e) {
      console.error("Error verifying game existence:", e);
      // Continue - we'll allow the save but log the error
    }

    if (!gameExists) {
      return NextResponse.json(
        { success: false, error: "Game not found in database. Please select a game from the autocomplete dropdown." },
        { status: 400 }
      );
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

    const created = await supabaseAdmin.userWins.create(winRecord);

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

