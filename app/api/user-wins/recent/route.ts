import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const username = searchParams.get("username")
    const daysParam = searchParams.get("days")
    const minXWinParam = searchParams.get("minXWin")
    const minWinAmountParam = searchParams.get("minWinAmount")
    const limitParam = searchParams.get("limit")

    if (!username) {
      return NextResponse.json({ success: false, error: "username is required" }, { status: 400 })
    }

    const days = daysParam ? parseInt(daysParam, 10) : 7
    if (isNaN(days) || days < 1 || days > 365) {
      return NextResponse.json({ success: false, error: "days must be between 1 and 365" }, { status: 400 })
    }

    const minXWin = minXWinParam ? parseFloat(minXWinParam) : undefined
    if (minXWin !== undefined && (isNaN(minXWin) || minXWin < 0)) {
      return NextResponse.json({ success: false, error: "minXWin must be a non-negative number" }, { status: 400 })
    }

    const minWinAmount = minWinAmountParam ? parseFloat(minWinAmountParam) : undefined
    if (minWinAmount !== undefined && (isNaN(minWinAmount) || minWinAmount < 0)) {
      return NextResponse.json({ success: false, error: "minWinAmount must be a non-negative number" }, { status: 400 })
    }

    const limit = limitParam ? parseInt(limitParam, 10) : undefined
    if (limit !== undefined && (isNaN(limit) || limit < 1 || limit > 1000)) {
      return NextResponse.json({ success: false, error: "limit must be between 1 and 1000" }, { status: 400 })
    }

    const user = await supabaseAdmin.users.findByUsername(username)
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    const recentWins = await supabaseAdmin.userWins.findRecentByUser(user.id, days, minXWin, minWinAmount, limit)
    
    // Sort by winAmount descending (already sorted, but ensure it)
    const sortedWins = recentWins.sort((a, b) => b.winAmount - a.winAmount)

    return NextResponse.json({ 
      success: true, 
      data: sortedWins,
      meta: {
        days,
        totalWins: sortedWins.length,
        totalWinAmount: sortedWins.reduce((sum, win) => sum + win.winAmount, 0),
        biggestWin: sortedWins.length > 0 ? sortedWins[0] : null,
      }
    })
  } catch (error: any) {
    console.error("Error fetching recent wins:", error)
    return NextResponse.json({ 
      success: false, 
      error: error?.message || "Failed to fetch recent wins" 
    }, { status: 500 })
  }
}

export const dynamic = "force-dynamic"

