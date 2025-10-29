import { NextResponse } from "next/server"
import { firestoreAdmin } from "@/lib/firestore-admin"
import { adminDb } from "@/lib/firebase-admin"

export async function POST(request: Request) {
  try {
    const { oldUserId, newUserId } = await request.json()
    
    // Find all slots with the old userId
    const allSlots = await firestoreAdmin.slots.findAll()
    const legacySlots = allSlots.filter(slot => slot.userId === oldUserId || slot.userId === String(oldUserId))
    
    if (legacySlots.length === 0) {
      return NextResponse.json({ success: true, message: "No legacy slots found", migrated: 0 })
    }
    
    // Update slots with new userId
    const batch = adminDb.batch()
    for (const slot of legacySlots) {
      const docRef = adminDb.collection("slots").doc(slot.id)
      batch.update(docRef, { userId: newUserId })
    }
    await batch.commit()
    
    return NextResponse.json({ 
      success: true, 
      message: `Migrated ${legacySlots.length} slots`,
      migrated: legacySlots.length
    })
  } catch (error) {
    console.error("Error migrating slots:", error)
    return NextResponse.json({ 
      success: false, 
      error: "Failed to migrate slots" 
    }, { status: 500 })
  }
}

