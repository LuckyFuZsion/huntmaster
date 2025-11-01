import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

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

// Get user settings by username (for OBS browser sources)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const username = searchParams.get("username")
    
    if (!username) {
      return NextResponse.json({ success: false, error: "Username is required" }, { status: 400 })
    }

    // Check cache first
    const cacheKey = `settings:${username}`
    const cached = getCached(cacheKey)
    if (cached) {
      return NextResponse.json(cached)
    }

    // Find user by username
    const user = await supabaseAdmin.users.findByUsername(username)
    
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    // Get settings for this user
    const userSettings = await supabaseAdmin.userSettings.findByUserId(user.id)
    
    const response = { success: true, settings: userSettings }
    
    // Cache the response
    setCache(cacheKey, response)
    
    return NextResponse.json(response)
  } catch (error) {
    console.error("Error fetching user settings by username:", error)
    return NextResponse.json({ 
      success: false, 
      error: "Failed to fetch user settings" 
    }, { status: 500 })
  }
}




