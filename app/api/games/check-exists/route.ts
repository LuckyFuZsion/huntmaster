import { NextResponse } from "next/server"
import { supabaseAdmin, getSupabaseClient } from "@/lib/supabase-admin"
import { decrypt } from "@/lib/protection"

// Lightweight endpoint to check if a game exists in Supabase database
// Checks: user slots, all slots, game_reviews, and slotslaunch_games tables
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const gameTitle = searchParams.get("gameTitle")
    const session = searchParams.get("session")

    if (!gameTitle) {
      return NextResponse.json({ success: false, error: "gameTitle is required" }, { status: 400 })
    }

    // Normalize game title for comparison (handles "&" and "and" equivalently)
    const normalize = (title: string) =>
      title
        .toLowerCase()
        .trim()
        .replace(/&/g, " and ") // Replace & with " and "
        .replace(/\band\b/g, " and ") // Normalize "and" to ensure consistent spacing
        .replace(/[-–—]/g, " ") // Replace hyphens, en-dashes, em-dashes with spaces
        .replace(/\s+/g, " ") // Replace multiple spaces with single space
        .trim()

    const normalizedTitle = normalize(gameTitle)
    const supabase = getSupabaseClient()

    // 1. If session provided, check user's slots first (most likely to match)
    if (session) {
      try {
        const sessionData = JSON.parse(decrypt(session))
        const userId = sessionData.userId

        // Get user's slots
        const userSlots = await supabaseAdmin.slots.findByUserId(userId)

        // Check if game exists in user's slots (exact or normalized match)
        const existsInUserSlots = userSlots.some((slot) => {
          const slotNormalized = normalize(slot.name)
          return slotNormalized === normalizedTitle
        })

        if (existsInUserSlots) {
          return NextResponse.json({
            success: true,
            exists: true,
            source: "user_slots",
          })
        }
      } catch (error) {
        // If session is invalid, continue to check other sources
        console.log("Session check failed, checking other sources:", error)
      }
    }

    // 2. Check if game exists in any user's slots
    const { data: recentSlots } = await supabaseAdmin.slots.findAll()
    const recentSlotsLimited = recentSlots.slice(0, 1000)

    const existsInAnySlots = recentSlotsLimited.some((slot) => {
      const slotNormalized = normalize(slot.name)
      return slotNormalized === normalizedTitle
    })

    if (existsInAnySlots) {
      return NextResponse.json({
        success: true,
        exists: true,
        source: "slots",
      })
    }

    // 3. Check game_reviews table
    try {
      const { data: gameReviews } = await supabase
        .from('game_reviews')
        .select('title')
        .ilike('title', `%${gameTitle.trim()}%`)
        .limit(100)
      
      if (gameReviews && gameReviews.length > 0) {
        const existsInReviews = gameReviews.some((game: any) => {
          return normalize(game.title || '') === normalizedTitle
        })
        
        if (existsInReviews) {
          return NextResponse.json({
            success: true,
            exists: true,
            source: "game_reviews",
          })
        }
      }
    } catch (error) {
      console.log("Error checking game_reviews:", error)
    }

    // 4. Check slotslaunch_games table
    try {
      const { data: slotslaunchGames } = await supabase
        .from('slotslaunch_games')
        .select('name')
        .ilike('name', `%${gameTitle.trim()}%`)
        .limit(100)
      
      if (slotslaunchGames && slotslaunchGames.length > 0) {
        const existsInSlotslaunch = slotslaunchGames.some((game: any) => {
          return normalize(game.name || '') === normalizedTitle
        })
        
        if (existsInSlotslaunch) {
          return NextResponse.json({
            success: true,
            exists: true,
            source: "slotslaunch_games",
          })
        }
      }
    } catch (error) {
      console.log("Error checking slotslaunch_games:", error)
    }

    // Game not found in any database table
    return NextResponse.json({
      success: true,
      exists: false,
      source: "database",
    })
  } catch (error: any) {
    console.error("Error checking game existence:", error)
    // Fail closed - if check fails, don't assume game exists
    return NextResponse.json({
      success: false,
      exists: false,
      source: "error",
      error: error.message || "Database check failed"
    })
  }
}

