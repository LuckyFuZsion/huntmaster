import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireSession } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const { session, gameTitle, provider } = await request.json();

    if (!session) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    if (typeof gameTitle !== "string") {
      return NextResponse.json({ success: false, error: "gameTitle must be a string" }, { status: 400 });
    }

    const sessionData = requireSession(session);
    const userId = sessionData.userId;

    // If gameTitle is empty, clear the current game
    if (gameTitle.trim().length === 0) {
      await supabaseAdmin.currentGame.clear(userId);
      return NextResponse.json({
        success: true,
        data: null,
      });
    }

    const currentGame = await supabaseAdmin.currentGame.set(userId, gameTitle.trim(), provider?.trim() || undefined);

    return NextResponse.json({
      success: true,
      data: {
        gameTitle: currentGame.gameTitle,
        provider: currentGame.provider,
        updatedAt: currentGame.updatedAt,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
