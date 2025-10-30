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
      // Guard against overwriting balances with empty strings during initial loads
      const sanitized: Record<string, any> = { ...settings }
      if (Object.prototype.hasOwnProperty.call(sanitized, "startBalance")) {
        const v = sanitized.startBalance
        if (v === "" || v === null || v === undefined) {
          delete sanitized.startBalance
        }
      }
      if (Object.prototype.hasOwnProperty.call(sanitized, "endBalance")) {
        const v = sanitized.endBalance
        if (v === "" || v === null || v === undefined) {
          delete sanitized.endBalance
        }
      }

      await firestoreAdmin.userSettings.update(userId, sanitized)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Error with user settings:", error)
    return NextResponse.json({ success: false, error: "Failed to process settings" }, { status: 500 })
  }
}

