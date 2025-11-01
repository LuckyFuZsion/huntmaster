import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { decrypt } from "@/lib/protection"

// Simple in-memory cache with TTL
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 5000 // 5 seconds

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
      // Check cache first
      const cacheKey = `settings:userId:${userId}`
      const cached = getCached(cacheKey)
      if (cached) {
        return NextResponse.json(cached)
      }

      // Get user settings
      const userSettings = await supabaseAdmin.userSettings.findByUserId(userId)
      
      const response = { success: true, settings: userSettings }
      
      // Cache the response
      setCache(cacheKey, response)
      
      return NextResponse.json(response)
    } else if (action === "save") {
      // Invalidate cache when saving
      const cacheKey = `settings:userId:${userId}`
      cache.delete(cacheKey)
      
      // Save user settings
      // Include balances even if empty - allows clearing balances by setting to empty string
      // Only exclude if explicitly null/undefined (not provided)
      const sanitized: Record<string, any> = { ...settings }
      
      // Only exclude balance if it's null/undefined (not provided at all)
      // Empty strings ("") are valid and will clear the balance in database
      if (Object.prototype.hasOwnProperty.call(sanitized, "startBalance")) {
        const v = sanitized.startBalance
        if (v === null || v === undefined) {
          delete sanitized.startBalance
        }
        // Keep empty strings to allow clearing
      }
      if (Object.prototype.hasOwnProperty.call(sanitized, "endBalance")) {
        const v = sanitized.endBalance
        if (v === null || v === undefined) {
          delete sanitized.endBalance
        }
        // Keep empty strings to allow clearing
      }

      console.log("Saving user settings to Supabase:", { userId, sanitized })
      await supabaseAdmin.userSettings.update(userId, sanitized)
      console.log("User settings saved successfully")
      
      // Return the saved settings for verification
      const savedSettings = await supabaseAdmin.userSettings.findByUserId(userId)
      return NextResponse.json({ success: true, settings: savedSettings })
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Error with user settings:", error)
    return NextResponse.json({ success: false, error: "Failed to process settings" }, { status: 500 })
  }
}

