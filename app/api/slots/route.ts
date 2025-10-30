import { NextResponse } from "next/server"
import { firestoreAdmin } from "@/lib/firestore-admin"
import { decrypt } from "@/lib/protection"

// Handle both get and save operations via POST
export async function POST(request: Request) {
  try {
    const { session, action, slots: slotData, slot: singleSlot } = await request.json()
    
    if (!session) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const sessionData = JSON.parse(decrypt(session))
    const userId = sessionData.userId

    if (action === "get") {
      // Get slots for the user
      const slots = await firestoreAdmin.slots.findByUserId(userId)
      
      console.log(`Loaded ${slots.length} slots for userId ${userId}`)
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
    } else if (action === "update-single") {
      // Update a single slot instead of recreating all slots
      if (!singleSlot || !singleSlot.id) {
        return NextResponse.json({ success: false, error: "Slot ID is required" }, { status: 400 })
      }
      
      console.log("Updating single slot:", singleSlot.id, singleSlot.name, "Win:", singleSlot.win)
      
      try {
        await firestoreAdmin.slots.update(singleSlot.id, {
          name: singleSlot.name,
          bet: singleSlot.bet,
          win: singleSlot.win,
        })
        
        console.log("Successfully updated slot:", singleSlot.id)
        return NextResponse.json({ success: true, slot: singleSlot })
      } catch (updateError: any) {
        console.error("Error updating slot:", updateError)
        // If the slot doesn't exist, try creating it instead
        if (updateError.code === "not-found" || updateError.code === 5) {
          console.log("Slot not found, creating new slot instead")
          const newSlot = await firestoreAdmin.slots.create({
            name: singleSlot.name,
            bet: singleSlot.bet,
            win: singleSlot.win,
            userId,
            createdAt: new Date(),
          })
          return NextResponse.json({ success: true, slot: { ...newSlot, id: newSlot.id } })
        }
        throw updateError // Re-throw if it's a different error
      }
    } else if (action === "save") {
      // Save slots for the user (full save - deletes and recreates)
      console.log("Saving slots to Firestore, received:", slotData.length, "slots")
      
      // Delete all existing slots for this user
      await firestoreAdmin.slots.deleteAllByUserId(userId)

      // Create new slots
      const createdSlots = []
      for (const slot of slotData) {
        const newSlot = await firestoreAdmin.slots.create({
          name: slot.name,
          bet: slot.bet,
          win: slot.win,
          userId,
          createdAt: new Date(),
        })
        createdSlots.push(newSlot)
      }
      
      console.log("Saved slots to Firestore, created:", createdSlots.length, "slots")
      console.log("Slot IDs:", createdSlots.map(s => s.id))

      return NextResponse.json({ success: true, slots: createdSlots })
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 })
  } catch (error: any) {
    console.error("Error with slots:", error)
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      stack: error.stack,
      action: error.action || "unknown"
    })
    return NextResponse.json({ 
      success: false, 
      error: error.message || "Failed to process slots",
      details: process.env.NODE_ENV === "development" ? error.message : undefined
    }, { status: 500 })
  }
}
