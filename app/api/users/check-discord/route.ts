import { NextResponse } from "next/server"
import { firestoreAdmin } from "@/lib/firestore-admin"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const discordId = searchParams.get("discordId")
    const username = searchParams.get("username")

    if (!discordId && !username) {
      return NextResponse.json({
        success: false,
        error: "Please provide either discordId or username query parameter",
      })
    }

    let user = null

    if (discordId) {
      user = await firestoreAdmin.users.findByDiscordId(discordId)
    } else if (username) {
      user = await firestoreAdmin.users.findByUsername(username)
    }

    if (!user) {
      return NextResponse.json({
        success: false,
        found: false,
        message: "User not found in Firebase",
      })
    }

    // Remove password from response
    const { password, ...userData } = user

    return NextResponse.json({
      success: true,
      found: true,
      user: userData,
    })
  } catch (error) {
    console.error("Check Discord user error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}

