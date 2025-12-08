import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { decrypt } from "@/lib/protection"

// Lightweight endpoint to check if a game exists in Supabase slots table
// This is much cheaper than calling external slot provider APIs
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const gameTitle = searchParams.get("gameTitle")
    const session = searchParams.get("session")

    if (!gameTitle) {
      return NextResponse.json({ success: false, error: "gameTitle is required" }, { status: 400 })
    }

    // Normalize game title for comparison
    const normalize = (title: string) =>
      title
        .toLowerCase()
        .trim()
        .replace(/[-–—]/g, " ")
        .replace(/\s+/g, " ")
        .trim()

    const normalizedTitle = normalize(gameTitle)

    // If session provided, check user's slots first (most likely to match)
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
            source: "user_slots", // Found in user's slots, no external API call needed
          })
        }
      } catch (error) {
        // If session is invalid, continue to check all slots
        console.log("Session check failed, checking all slots:", error)
      }
    }

    // Check if game exists in any user's slots (fuzzy match)
    // This is still cheaper than external API - just a database query
    // Limit to recent slots to keep query fast
    const { data: recentSlots } = await supabaseAdmin.slots.findAll()
    const recentSlotsLimited = recentSlots.slice(0, 1000) // Limit to recent 1000 slots

    const existsInAnySlots = recentSlotsLimited.some((slot) => {
      const slotNormalized = normalize(slot.name)
      return slotNormalized === normalizedTitle
    })

    if (existsInAnySlots) {
      return NextResponse.json({
        success: true,
        exists: true,
        source: "database", // Found in database, no external API call needed
      })
    }

    // Game not found in database - will need external API check
    // But we've saved one expensive call by checking database first
    return NextResponse.json({
      success: true,
      exists: false,
      source: "database", // Not found, but we checked database first
    })
  } catch (error: any) {
    console.error("Error checking game existence:", error)
    // Fail open - if check fails, assume game exists to avoid blocking
    return NextResponse.json({
      success: true,
      exists: true, // Fail open
      source: "error",
    })
  }
}

