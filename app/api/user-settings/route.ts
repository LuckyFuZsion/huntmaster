import { NextResponse } from "next/server"
import { firestoreAdmin } from "@/lib/firestore-admin"
import { decrypt } from "@/lib/protection"

// Handle get and save operations for user settings
export async function POST(request: Request) {
  try {
    const { session, action, settings } = await request.json()
    
    if (!session) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const sessionData = JSON.parse(decrypt(session))
    const userId = sessionData.userId

    if (action === "get") {
      // Get user settings
      const userSettings = await firestoreAdmin.userSettings.findByUserId(userId)
      return NextResponse.json({ success: true, settings: userSettings })
    } else if (action === "save") {
      // Save user settings
      await firestoreAdmin.userSettings.update(userId, settings)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Error with user settings:", error)
    return NextResponse.json({ success: false, error: "Failed to process settings" }, { status: 500 })
  }
}

