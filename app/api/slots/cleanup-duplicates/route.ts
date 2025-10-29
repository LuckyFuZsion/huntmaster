import { NextResponse } from "next/server"
import { firestoreAdmin } from "@/lib/firestore-admin"
import { decrypt } from "@/lib/protection"

export async function POST(request: Request) {
  try {
    const { session } = await request.json()
    
    if (!session) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const sessionData = JSON.parse(decrypt(session))
    const userId = sessionData.userId

    // Get all slots for this user
    const allSlots = await firestoreAdmin.slots.findAll()
    const userSlots = allSlots.filter(slot => slot.userId === userId)
    
    console.log(`Found ${userSlots.length} total slots for user ${userId}`)
    
    // Group by name to find duplicates
    const slotsByName = new Map<string, typeof userSlots>()
    for (const slot of userSlots) {
      const name = slot.name.toLowerCase().trim()
      if (!slotsByName.has(name)) {
        slotsByName.set(name, [])
      }
      slotsByName.get(name)!.push(slot)
    }
    
    // Find duplicates and keep only the most recent one
    const duplicatesToDelete: string[] = []
    let keptSlots = 0
    let deletedSlots = 0
    
    for (const [name, slotsWithSameName] of slotsByName.entries()) {
      if (slotsWithSameName.length > 1) {
        console.log(`Found ${slotsWithSameName.length} duplicates for "${name}"`)
        
        // Sort by createdAt descending (most recent first)
        const sorted = slotsWithSameName.sort((a, b) => {
          const aDate = a.createdAt instanceof Date ? a.createdAt : (a.createdAt as any)?.toDate?.() || new Date(0)
          const bDate = b.createdAt instanceof Date ? b.createdAt : (b.createdAt as any)?.toDate?.() || new Date(0)
          return bDate.getTime() - aDate.getTime()
        })
        
        // Keep the first (most recent) one
        keptSlots++
        console.log(`Keeping slot "${name}" with ID: ${sorted[0].id}`)
        
        // Mark all others for deletion
        for (let i = 1; i < sorted.length; i++) {
          duplicatesToDelete.push(sorted[i].id)
          deletedSlots++
          console.log(`Marking duplicate "${name}" with ID ${sorted[i].id} for deletion`)
        }
      } else {
        keptSlots++
      }
    }
    
    console.log(`Deleting ${duplicatesToDelete.length} duplicate slots...`)
    
    // Delete duplicates
    if (duplicatesToDelete.length > 0) {
      const { adminDb } = await import("@/lib/firebase-admin")
      const batch = adminDb.batch()
      
      for (const id of duplicatesToDelete) {
        const docRef = adminDb.collection("slots").doc(id)
        batch.delete(docRef)
      }
      
      await batch.commit()
      console.log(`Successfully deleted ${duplicatesToDelete.length} duplicate slots`)
    }
    
    return NextResponse.json({
      success: true,
      message: `Cleanup complete: Kept ${keptSlots} unique slots, deleted ${deletedSlots} duplicates`,
      keptSlots,
      deletedSlots,
      totalSlotsBefore: userSlots.length,
    })
  } catch (error) {
    console.error("Error cleaning up duplicates:", error)
    return NextResponse.json({ 
      success: false, 
      error: "Failed to cleanup duplicates" 
    }, { status: 500 })
  }
}

