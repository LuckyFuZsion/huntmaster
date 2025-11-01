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

    const slots = await supabaseAdmin.slots.findByUserId(user.id);

    // Deduplicate by name (keep first occurrence) then find first with win === null
    const seen = new Set<string>();
    const unique = [] as any[];
    for (const s of slots) {
      const key = (s.name || "").toLowerCase().trim();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(s);
      }
    }

    const nextSlot = unique.find((s) => s.win === null || s.win === undefined);
    if (!nextSlot) {
      return NextResponse.json({ success: true, data: null });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: nextSlot.id,
        title: nextSlot.name,
        bet: nextSlot.bet,
        win: nextSlot.win,
        userId: user.id,
        username: username,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}


