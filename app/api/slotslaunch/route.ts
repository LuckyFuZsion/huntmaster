// Set max duration to prevent expensive external API calls from running too long
export const maxDuration = 30 // 30 seconds max

// Simple in-memory cache with TTL to reduce expensive external API calls
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 86400000 // 24 hours (86400 seconds) - game data rarely changes

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

export async function GET(req: Request) {
  const base = process.env.SLOTSLAUNCH_API_BASE_URL || process.env.SLOT_STREAMERS_API_BASE_URL
  const key = process.env.SLOTSLAUNCH_API_KEY || process.env.SLOT_STREAMERS_API_KEY

  if (!base || !key) {
    return new Response(
      JSON.stringify({ success: false, error: "SLOTSLAUNCH env not configured" }),
      { status: 500, headers: { "content-type": "application/json" } },
    )
  }

  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get("search") || ""
    const limit = searchParams.get("limit") || "20"
    const page = searchParams.get("page")
    const exhaustive = searchParams.get("exhaustive") === "1" || searchParams.get("exhaustive") === "true"

    // Check cache first - cache key includes all parameters
    const cacheKey = `slotslaunch:${search.toLowerCase().trim()}:${limit}:${exhaustive ? '1' : '0'}:${page || '1'}`
    const cached = getCached(cacheKey)
    if (cached) {
      console.log(`✅ Cache hit for slotslaunch: "${search}"`)
      return new Response(JSON.stringify(cached), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    }

    const url = new URL("/api/commercial/slotslaunch", base)
    url.searchParams.set("search", search)
    url.searchParams.set("limit", limit)
    if (page) url.searchParams.set("page", page)

    const res = await fetch(url.toString(), { headers: { "x-api-key": key } })

    // OPTIMIZATION: Always return first page only - exhaustive mode is too expensive
    // Exhaustive mode fetches ALL pages (10-20+ API calls) which costs $50+ per search
    // For cost control, we only fetch the first page (limit results)
    const text = await res.text()
    const responseData = res.ok ? JSON.parse(text) : { success: false, error: text }
    
    // Cache successful responses
    if (res.ok) {
      setCache(cacheKey, responseData)
    }
    
    return new Response(text, { status: res.status, headers: { "content-type": "application/json" } })
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || "Upstream request failed" }),
      { status: 502, headers: { "content-type": "application/json" } },
    )
  }
}

export const dynamic = "force-dynamic"

