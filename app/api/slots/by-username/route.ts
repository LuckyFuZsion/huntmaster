import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

// Simple in-memory cache with TTL and size limit
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 30000 // 30 seconds (increased from 5s to reduce database queries)
const MAX_CACHE_SIZE = 500 // Limit cache to 500 entries to prevent memory issues

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
  // If cache is full, remove oldest entries (LRU-like behavior)
  if (cache.size >= MAX_CACHE_SIZE) {
    // Find and remove oldest entry
    let oldestKey: string | null = null
    let oldestTime = Date.now()
    
    for (const [k, v] of cache.entries()) {
      if (v.timestamp < oldestTime) {
        oldestTime = v.timestamp
        oldestKey = k
      }
    }
    
    if (oldestKey) {
      cache.delete(oldestKey)
    }
  }
  
  cache.set(key, { data, timestamp: Date.now() })
}

// Get slots by username (for OBS browser sources)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const username = searchParams.get("username")
    
    if (!username) {
      return NextResponse.json({ success: false, error: "Username is required" }, { status: 400 })
    }

    // Check cache first
    const cacheKey = `slots:${username}`
    const cached = getCached(cacheKey)
    if (cached) {
      return NextResponse.json(cached)
    }

    // Find user by username
    const user = await supabaseAdmin.users.findByUsername(username)
    
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    // Get slots for this user
    const slots = await supabaseAdmin.slots.findByUserId(user.id)
    
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

    const response = { success: true, slots: uniqueSlots }
    
    // Cache the response
    setCache(cacheKey, response)

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error fetching slots by username:", error)
    return NextResponse.json({ 
      success: false, 
      error: "Failed to fetch slots" 
    }, { status: 500 })
  }
}

