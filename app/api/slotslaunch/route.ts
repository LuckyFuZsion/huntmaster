// MIGRATED TO DATABASE: This route now uses Supabase database instead of external API
// This eliminates external API costs (was $0.01-0.02 per call)
import { getSupabaseClient } from "@/lib/supabase"

export const maxDuration = 30 // 30 seconds max

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get("search") || ""
    const limit = parseInt(searchParams.get("limit") || "20", 10)
    const page = parseInt(searchParams.get("page") || "1", 10)

    if (!search || search.trim().length < 2) {
      return new Response(
        JSON.stringify({ success: true, games: [], total: 0, page, limit }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    }

    // Query slotslaunch_games table directly (no external API call = no cost!)
    const { data: games, error } = await getSupabaseClient()
      .from('slotslaunch_games')
      .select('id, slug, name, provider, provider_slug, thumbnail_url, banner_url, max_win, volatility, release_date')
      .ilike('name', `%${search.trim()}%`)
      .range((page - 1) * limit, page * limit - 1)
      .limit(limit)

    if (error) {
      console.error('Error querying slotslaunch_games:', error)
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { "content-type": "application/json" } },
      )
    }

    // Map to expected format
    const mappedGames = (games || []).map((g: any) => ({
      id: Number(g.id) || g.id,
      slug: g.slug || g.name?.toLowerCase().replace(/\s+/g, "-") || String(g.id),
      name: g.name,
      provider: g.provider || g.provider_slug || undefined,
      thumbnail: g.thumbnail_url || g.banner_url || null,
      max_win: g.max_win,
      volatility: g.volatility,
      release_date: g.release_date,
    }))

    // Get total count for pagination
    const { count } = await getSupabaseClient()
      .from('slotslaunch_games')
      .select('*', { count: 'exact', head: true })
      .ilike('name', `%${search.trim()}%`)

    const response = {
      success: true,
      games: mappedGames,
      total: count || 0,
      page,
      limit,
      total_pages: Math.ceil((count || 0) / limit),
    }

    console.log(`✅ Database query for slotslaunch: "${search}" returned ${mappedGames.length} results (FREE - no external API cost!)`)
    
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "content-type": "application/json" },
    })
  } catch (err: any) {
    console.error('Error in slotslaunch route:', err)
    return new Response(
      JSON.stringify({ success: false, error: err?.message || "Database query failed" }),
      { status: 500, headers: { "content-type": "application/json" } },
    )
  }
}

export const dynamic = "force-dynamic"

