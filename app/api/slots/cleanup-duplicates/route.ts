import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
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
    const allSlots = await supabaseAdmin.slots.findByUserId(userId)
    
    console.log(`Found ${allSlots.length} total slots for user ${userId}`)
    
    // Group by name (case-insensitive) to find duplicates
    const slotsByName = new Map<string, typeof allSlots>()
    for (const slot of allSlots) {
      const name = slot.name.toLowerCase().trim()
      if (!slotsByName.has(name)) {
        slotsByName.set(name, [])
      }
      slotsByName.get(name)!.push(slot)
    }
    
    // Find duplicates and keep only the most recent one (by createdAt or id)
    const duplicatesToDelete: string[] = []
    let keptSlots = 0
    let deletedSlots = 0
    
    for (const [name, slotsWithSameName] of slotsByName.entries()) {
      if (slotsWithSameName.length > 1) {
        // Sort by createdAt descending (most recent first), or by id as fallback
        slotsWithSameName.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0).getTime()
          const dateB = new Date(b.createdAt || 0).getTime()
          if (dateB !== dateA) return dateB - dateA
          return b.id.localeCompare(a.id) // Fallback to ID comparison
        })
        
        // Keep the first one (most recent), delete the rest
        const toKeep = slotsWithSameName[0]
        const toDelete = slotsWithSameName.slice(1)
        
        keptSlots++
        for (const slot of toDelete) {
          duplicatesToDelete.push(slot.id)
          deletedSlots++
        }
        
        console.log(`Found ${slotsWithSameName.length} duplicates for "${name}" - keeping ${toKeep.id}, deleting ${toDelete.length} others`)
      } else {
        keptSlots++
      }
    }
    
    // Delete all duplicate slots
    for (const slotId of duplicatesToDelete) {
      await supabaseAdmin.slots.delete(slotId)
    }
    
    console.log(`Cleanup complete: Kept ${keptSlots} unique slots, deleted ${deletedSlots} duplicates`)
    
    return NextResponse.json({ 
      success: true, 
      message: `Cleaned up ${deletedSlots} duplicate slots`,
      keptSlots,
      deletedSlots
    })
  } catch (error: any) {
    console.error("Error cleaning up duplicates:", error)
    return NextResponse.json({ 
      success: false, 
      error: error.message || "Failed to cleanup duplicates" 
    }, { status: 500 })
  }
}
