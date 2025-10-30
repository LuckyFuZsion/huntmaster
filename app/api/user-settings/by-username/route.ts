import { NextResponse } from "next/server"
import { firestoreAdmin } from "@/lib/firestore-admin"

// Get user settings by username (for OBS browser sources)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const username = searchParams.get("username")
    
    if (!username) {
      return NextResponse.json({ success: false, error: "Username is required" }, { status: 400 })
    }

    // Find user by username
    const user = await firestoreAdmin.users.findByUsername(username)
    
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    // Get settings for this user
    const userSettings = await firestoreAdmin.userSettings.findByUserId(user.id)
    
    return NextResponse.json({ success: true, settings: userSettings })
  } catch (error) {
    console.error("Error fetching user settings by username:", error)
    return NextResponse.json({ 
      success: false, 
      error: "Failed to fetch user settings" 
    }, { status: 500 })
  }
}

