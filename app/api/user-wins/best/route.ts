import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const username = searchParams.get("username")
    const title = searchParams.get("title")

    if (!username || !title) {
      return NextResponse.json({ success: false, error: "username and title are required" }, { status: 400 })
    }

    const user = await supabaseAdmin.users.findByUsername(username)
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    const { bestWinAmount, bestXWin } = await supabaseAdmin.userWins.findBestByUserAndGame(user.id, title.trim())
    return NextResponse.json({ success: true, data: { bestWinAmount, bestXWin } })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || "Failed to fetch personal bests" }, { status: 500 })
  }
}

export const dynamic = "force-dynamic"

