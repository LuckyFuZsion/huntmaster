import { NextResponse } from "next/server"
import { firestoreAdmin } from "@/lib/firestore-admin"

// Get slots by username (for OBS browser sources)
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

    // Get slots for this user
    const slots = await firestoreAdmin.slots.findByUserId(user.id)
    
    console.log(`Loaded ${slots.length} slots for user ${username} (${user.id})`)
    console.log("Slot names:", slots.map(s => s.name))

    // Deduplicate slots by name (keep the most recent one)
    const seen = new Map<string, any>()
    const uniqueSlots = []
    
    for (const slot of slots) {
      const name = slot.name.toLowerCase().trim()
      if (!seen.has(name)) {
        seen.set(name, slot)
        uniqueSlots.push(slot)
      } else {
        console.log(`Duplicate slot found: "${slot.name}" - keeping only one instance`)
      }
    }
    
    if (uniqueSlots.length !== slots.length) {
      console.log(`Deduplicated: ${slots.length} slots -> ${uniqueSlots.length} unique slots`)
    }

    return NextResponse.json({ success: true, slots: uniqueSlots })
  } catch (error) {
    console.error("Error fetching slots by username:", error)
    return NextResponse.json({ 
      success: false, 
      error: "Failed to fetch slots" 
    }, { status: 500 })
  }
}

