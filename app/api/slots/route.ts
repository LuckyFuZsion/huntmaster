import { NextResponse } from "next/server"
import { firestoreAdmin } from "@/lib/firestore-admin"
import { adminDb } from "@/lib/firebase-admin"
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
        // Get the existing slot to compare win values
        const existingSlot = await adminDb.collection("slots").doc(singleSlot.id).get()
        const prevWin = existingSlot.exists ? (existingSlot.data()?.win ?? null) : null
        
        await firestoreAdmin.slots.update(singleSlot.id, {
          name: singleSlot.name,
          bet: singleSlot.bet,
          win: singleSlot.win,
        })
        
        // Record win whenever a valid win amount is saved
        const newWin = typeof singleSlot.win === "number" ? singleSlot.win : null
        console.log("Win recording check - prevWin:", prevWin, "newWin:", newWin, "userId:", userId)
        
        // Always record when there's a win amount (even if unchanged) to track all wins
        if (newWin !== null && newWin >= 0) {
          const bet = Number(singleSlot.bet) || 0
          const xWin = bet > 0 ? Number((newWin / bet).toFixed(2)) : 0
          console.log("Attempting to record win - gameTitle:", singleSlot.name, "bet:", bet, "winAmount:", newWin, "xWin:", xWin)
          try {
            const winRecord: any = {
              userId,
              gameTitle: String(singleSlot.name).trim(),
              bet: bet,
              winAmount: Number(newWin),
              xWin,
            }
            // Only include optional fields if they have values (Firestore doesn't allow undefined)
            // gameSlug and provider can be added later if needed
            console.log("Creating userWin with data:", JSON.stringify(winRecord))
            const created = await firestoreAdmin.userWins.create(winRecord)
            console.log("✅ Successfully recorded user win. ID:", created.id, "Game:", singleSlot.name, "Win:", newWin, "X:", xWin)
          } catch (e: any) {
            console.error("❌ Failed to record user win:", e)
            console.error("Error details:", {
              message: e?.message,
              code: e?.code,
              stack: e?.stack,
              userId,
              gameTitle: singleSlot.name,
              winAmount: newWin
            })
          }
        } else {
          console.log("Skipping win record - no valid win amount. newWin:", newWin)
        }
        
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
          
          // Record win if creating a new slot with a win
          const newWin = typeof singleSlot.win === "number" ? singleSlot.win : null
          if (newWin !== null && newWin >= 0) {
            const bet = Number(singleSlot.bet) || 0
            const xWin = bet > 0 ? Number((newWin / bet).toFixed(2)) : 0
            try {
              await firestoreAdmin.userWins.create({
                userId,
                gameTitle: String(singleSlot.name).trim(),
                bet: bet,
                winAmount: Number(newWin),
                xWin,
              })
              console.log("Recorded user win for new slot:", singleSlot.name, "Win:", newWin, "X:", xWin)
            } catch (e) {
              console.error("Failed to record user win for new slot:", e)
            }
          }
          
          return NextResponse.json({ success: true, slot: { ...newSlot, id: newSlot.id } })
        }
        throw updateError // Re-throw if it's a different error
      }
    } else if (action === "save") {
      // Save slots for the user (full save - deletes and recreates)
      console.log("Saving slots to Firestore, received:", slotData.length, "slots")

      // Load existing to detect newly entered wins
      const previousSlots = await firestoreAdmin.slots.findByUserId(userId)
      const prevByKey = new Map<string, any>()
      for (const s of previousSlots) {
        const k = `${s.name}`.trim().toLowerCase() + `|${Number(s.bet)}`
        if (!prevByKey.has(k)) prevByKey.set(k, s)
      }

      // Delete all existing slots for this user
      await firestoreAdmin.slots.deleteAllByUserId(userId)

      // Create new slots and record wins that are new or improved
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

        const key = `${slot.name}`.trim().toLowerCase() + `|${Number(slot.bet)}`
        const prev = prevByKey.get(key)
        const prevWin = prev?.win ?? null
        const newWin = typeof slot.win === "number" ? slot.win : null
        if (newWin !== null && newWin >= 0 && (prevWin === null || newWin !== prevWin)) {
          const bet = Number(slot.bet) || 0
          const xWin = bet > 0 ? Number((newWin / bet).toFixed(2)) : 0
          try {
            await firestoreAdmin.userWins.create({
              userId,
              gameTitle: String(slot.name).trim(),
              bet: bet,
              winAmount: Number(newWin),
              xWin,
            })
          } catch (e) {
            console.error("Failed to record user win:", e)
          }
        }
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
