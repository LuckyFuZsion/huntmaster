import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username");

    if (!username) {
      return NextResponse.json({ success: false, error: "username is required" }, { status: 400 });
    }

    const user = await supabaseAdmin.users.findByUsername(username);
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const currentGame = await supabaseAdmin.currentGame.findByUserId(user.id);
    
    if (!currentGame) {
      return NextResponse.json({ success: true, data: null });
    }

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



