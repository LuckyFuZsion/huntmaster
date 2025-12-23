// MIGRATED TO DATABASE: This route now uses Supabase database instead of external API
// This eliminates external API costs (was $0.01-0.02 per call)
import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || searchParams.get("title") || "";
    const developer = searchParams.get("provider") || searchParams.get("developer") || undefined;
    const limit = Number(searchParams.get("limit") || 10);

    if (!q || q.trim().length < 2) {
      return NextResponse.json({ success: true, data: [], total: 0, limit });
    }

    // Query game_reviews table directly (no external API call = no cost!)
    const supabase = getSupabaseClient();
    let query = supabase
      .from('game_reviews')
      .select('*')
      .ilike('title', `%${q}%`)
      .limit(limit);

    if (developer) {
      query = query.ilike('provider', `%${developer}%`);
    }

    const { data: items, error } = await query;

    if (error) {
      console.error('Error querying game_reviews:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const suggestions = (items || []).map((g: any) => {
      return {
        id: g.id,
        slug: g.slug || g.game_slug,
        title: g.title || g.game_title,
        provider: g.provider || g.developer,
        thumbnail: g.thumbnail || g.thumbnail_url || g.banner_url || null,
        maxWin: g.max_win ? String(g.max_win).trim() : undefined,
        volatility: g.volatility ? String(g.volatility).trim() : undefined,
        releaseDate: g.release_date ? String(g.release_date).trim() : undefined,
      };
    });

    console.log(`✅ Database query for slot-streamers suggest: "${q}" returned ${suggestions.length} results (FREE - no external API cost!)`);

    return NextResponse.json({ success: true, data: suggestions, total: suggestions.length, limit });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
