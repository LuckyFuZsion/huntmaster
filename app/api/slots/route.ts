import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { decrypt } from "@/lib/protection"

// Set max duration to prevent expensive operations from running too long
export const maxDuration = 30 // 30 seconds max

// Simple in-memory cache with TTL
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 30000 // 30 seconds (increased from 5s to reduce database queries)

function getCached(key: string) {
  const cached = cache.get(key)
  if (!cached) return null
  
  const age = Date.now() - cached.timestamp
  if (age > CACHE_TTL) {
    cache.delete(key)
    return null
  }
  
  return cached.data
}

function setCache(key: string, data: any) {
  cache.set(key, { data, timestamp: Date.now() })
}

function invalidateCache(keyPrefix: string) {
  for (const key of cache.keys()) {
    if (key.startsWith(keyPrefix)) {
      cache.delete(key)
    }
  }
}

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
      // Check cache first
      const cacheKey = `slots:userId:${userId}`
      const cached = getCached(cacheKey)
      if (cached) {
        return NextResponse.json(cached)
      }

      // Get slots for the user (already sorted by createdAt ascending in findByUserId)
      const slots = await supabaseAdmin.slots.findByUserId(userId)
      
      console.log(`Loaded ${slots.length} slots for userId ${userId}`)
      console.log("Slot names:", slots.map(s => s.name))

      // Deduplicate slots by name (keep the FIRST one to preserve order)
      // This maintains sequential order when there are duplicates
      const seen = new Map<string, any>()
      const uniqueSlots = []
      
      for (const slot of slots) {
        const name = slot.name.toLowerCase().trim()
        if (!seen.has(name)) {
          seen.set(name, slot)
          uniqueSlots.push(slot)
        } else {
          console.log(`Duplicate slot found: "${slot.name}" - keeping first instance to preserve order`)
        }
      }
      
      if (uniqueSlots.length !== slots.length) {
        console.log(`Deduplicated: ${slots.length} slots -> ${uniqueSlots.length} unique slots`)
      }
      
      // Ensure slots are sorted by createdAt (sequential order)
      // This is already done by findByUserId, but we'll ensure it here too
      uniqueSlots.sort((a, b) => {
        const timeA = new Date(a.createdAt || 0).getTime()
        const timeB = new Date(b.createdAt || 0).getTime()
        return timeA - timeB
      })
      
      const response = { success: true, slots: uniqueSlots }
      
      // Cache the response
      setCache(cacheKey, response)
      
      return NextResponse.json(response)
    } else if (action === "update-single") {
      // Invalidate cache when updating
      invalidateCache(`slots:userId:${userId}`)
      
      // Update a single slot instead of recreating all slots
      if (!singleSlot || !singleSlot.id) {
        return NextResponse.json({ success: false, error: "Slot ID is required" }, { status: 400 })
      }
      
      console.log("Updating single slot:", singleSlot.id, singleSlot.name, "Win:", singleSlot.win)
      
      try {
        // Get the existing slot to compare win values
        const existingSlot = await supabaseAdmin.slots.findOne(singleSlot.id)
        const prevWin = existingSlot ? (existingSlot.win ?? null) : null
        
        await supabaseAdmin.slots.update(singleSlot.id, {
          name: singleSlot.name,
          bet: singleSlot.bet,
          win: singleSlot.win,
        })
        
        // Record win whenever a valid win amount is saved
        const newWin = typeof singleSlot.win === "number" ? singleSlot.win : null
        console.log("Win recording check - prevWin:", prevWin, "newWin:", newWin, "userId:", userId)
        
        // Record win whenever a valid win amount is saved (non-blocking to reduce function duration)
        // OPTIMIZATION: Skip expensive game verification - just record the win
        // Game verification was causing 5-20 second function durations per win entry
        if (newWin !== null && newWin >= 0) {
          const bet = Number(singleSlot.bet) || 0
          const xWin = bet > 0 ? Number((newWin / bet).toFixed(2)) : 0
          const gameTitleTrimmed = String(singleSlot.name).trim()
          
          // Create win record in background (non-blocking) to reduce function duration
          Promise.resolve().then(async () => {
            try {
              const winRecord: any = {
                userId,
                gameTitle: gameTitleTrimmed,
                bet: bet,
                winAmount: Number(newWin),
                xWin,
              }
              // Only include optional fields if they have values (Firestore doesn't allow undefined)
              // gameSlug and provider can be added later if needed
              console.log("Creating or updating best userWin with data:", JSON.stringify(winRecord))
              const created = await supabaseAdmin.userWins.createOrUpdateBest(winRecord)
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
          }).catch(err => {
            console.error("Error in background win creation:", err)
          })
          // Don't await - let it run in background to reduce function duration
        } else {
          console.log("Skipping win record - no valid win amount. newWin:", newWin)
        }
        
        console.log("Successfully updated slot:", singleSlot.id)
        return NextResponse.json({ success: true, slot: singleSlot })
      } catch (updateError: any) {
        console.error("Error updating slot:", updateError)
        // If the slot doesn't exist, try creating it instead
        if (updateError.code === "PGRST116" || updateError.code === "not-found" || updateError.code === 5) {
          console.log("Slot not found, creating new slot instead")
          const newSlot = await supabaseAdmin.slots.create({
            name: singleSlot.name,
            bet: singleSlot.bet,
            win: singleSlot.win,
            userId,
            createdAt: new Date(),
          })
          
          // Record win if creating a new slot with a win (non-blocking to reduce function duration)
          // OPTIMIZATION: Skip expensive game verification - just record the win
          const newWin = typeof singleSlot.win === "number" ? singleSlot.win : null
          if (newWin !== null && newWin >= 0) {
            const bet = Number(singleSlot.bet) || 0
            const xWin = bet > 0 ? Number((newWin / bet).toFixed(2)) : 0
            const gameTitleTrimmed = String(singleSlot.name).trim()
            
            // Create win record in background (non-blocking) to reduce function duration
            Promise.resolve().then(async () => {
              try {
                await supabaseAdmin.userWins.createOrUpdateBest({
                  userId,
                  gameTitle: gameTitleTrimmed,
                  bet: bet,
                  winAmount: Number(newWin),
                  xWin,
                })
                console.log("Recorded user win for new slot:", singleSlot.name, "Win:", newWin, "X:", xWin)
              } catch (e) {
                console.error("Failed to record user win for new slot:", e)
              }
            }).catch(err => {
              console.error("Error in background win creation for new slot:", err)
            })
            // Don't await - let it run in background to reduce function duration
          }
          
          return NextResponse.json({ success: true, slot: { ...newSlot, id: newSlot.id } })
        }
        throw updateError // Re-throw if it's a different error
      }
    } else if (action === "save") {
      // Invalidate cache when saving
      invalidateCache(`slots:userId:${userId}`)
      
      // Deduplicate slots BEFORE saving to prevent duplicates in database
      const seenIds = new Set<string>()
      const seenNames = new Map<string, any>()
      const uniqueSlotData = []
      
      for (const slot of slotData) {
        // Check by ID first
        if (slot.id && seenIds.has(slot.id)) {
          console.log(`Duplicate slot ID in save: "${slot.name}" (${slot.id}) - skipping`)
          continue
        }
        if (slot.id) seenIds.add(slot.id)
        
        // Also check by name (case-insensitive) to catch duplicates with different IDs
        const nameKey = slot.name.toLowerCase().trim()
        if (seenNames.has(nameKey)) {
          console.log(`Duplicate slot name in save: "${slot.name}" - skipping`)
          continue
        }
        seenNames.set(nameKey, slot)
        uniqueSlotData.push(slot)
      }
      
      if (uniqueSlotData.length !== slotData.length) {
        console.log(`Deduplicated before save: ${slotData.length} -> ${uniqueSlotData.length} unique slots`)
      }
      
      // Save slots for the user (full save - deletes and recreates)
      console.log("Saving slots to Supabase, received:", uniqueSlotData.length, "unique slots")

      // Load existing to detect newly entered wins
      const previousSlots = await supabaseAdmin.slots.findByUserId(userId)
      const prevByKey = new Map<string, any>()
      for (const s of previousSlots) {
        const k = `${s.name}`.trim().toLowerCase() + `|${Number(s.bet)}`
        if (!prevByKey.has(k)) prevByKey.set(k, s)
      }
      
      // Delete all existing slots for this user
      await supabaseAdmin.slots.deleteAllByUserId(userId)

      // OPTIMIZATION: Create all slots in a single batch operation instead of one-by-one
      // This reduces function duration from O(n) to O(1) for slot creation
      // IMPORTANT: Preserve sequential order by using incremental timestamps
      const baseTime = Date.now()
      const slotsToCreate = uniqueSlotData.map((slot, index) => ({
        name: slot.name,
        bet: slot.bet,
        win: slot.win,
        userId,
        // Preserve order: use incremental timestamps to maintain sequential order
        // Each slot gets a timestamp 1ms after the previous one
        createdAt: slot.createdAt || new Date(baseTime + index).toISOString(),
      }))
      
      const createdSlots = await supabaseAdmin.slots.createBatch(slotsToCreate)
      console.log("✅ Created", createdSlots.length, "slots in batch operation")

      // Record wins that are new or improved (do this after slots are created, non-blocking)
      // OPTIMIZATION: Collect all wins to create and batch them, skip expensive game verification
      const winsToCreate = []
      for (const slot of uniqueSlotData) {
        const key = `${slot.name}`.trim().toLowerCase() + `|${Number(slot.bet)}`
        const prev = prevByKey.get(key)
        const prevWin = prev?.win ?? null
        const newWin = typeof slot.win === "number" ? slot.win : null
        if (newWin !== null && newWin >= 0 && (prevWin === null || newWin !== prevWin)) {
          const bet = Number(slot.bet) || 0
          const xWin = bet > 0 ? Number((newWin / bet).toFixed(2)) : 0
          
          // OPTIMIZATION: Skip expensive game verification - just record the win
          // Game verification was causing expensive API calls for each slot
          winsToCreate.push({
            userId,
            gameTitle: String(slot.name).trim(),
            bet: bet,
            winAmount: Number(newWin),
            xWin,
          })
        }
      }
      
      // Create wins in batch (non-blocking - don't fail if this errors)
      // Use createOrUpdateBest to only save biggest win per game (cost optimization)
      if (winsToCreate.length > 0) {
        Promise.all(
          winsToCreate.map(win => 
            supabaseAdmin.userWins.createOrUpdateBest(win).catch(err => {
              console.error("Failed to record user win:", err)
            })
          )
        ).catch(err => {
          console.error("Error batch creating wins:", err)
        })
        // Don't await - let it run in background to reduce function duration
      }
      
      console.log("Saved slots to Supabase, created:", createdSlots.length, "slots")
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
    
    // Check for database errors
    const isQuotaError = error.code === "RESOURCE_EXHAUSTED" || 
                        error.code === 8 || 
                        error.message?.includes("quota") ||
                        error.message?.includes("resource exhausted")
    
    return NextResponse.json({ 
      success: false, 
      error: isQuotaError 
        ? "Database quota exceeded. Please check your Supabase plan or wait for quota reset."
        : error.message || "Failed to process slots",
      code: error.code,
      details: process.env.NODE_ENV === "development" ? error.message : undefined
    }, { status: isQuotaError ? 429 : 500 })
  }
}
