// MIGRATED TO DATABASE: This route now uses Supabase database instead of external API
// This eliminates external API costs (was $0.01-0.02 per call)
import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const title = searchParams.get("title") || searchParams.get("q") || "";
    const provider = searchParams.get("provider") || searchParams.get("developer") || undefined;
    const limit = Number(searchParams.get("limit") || 5);

    if (!title && !provider) {
      return NextResponse.json({ success: false, error: "title or provider is required" }, { status: 400 });
    }

    // Query game_reviews table directly (no external API call = no cost!)
    const supabase = getSupabaseClient();
    let query = supabase
      .from('game_reviews')
      .select('*')
      .limit(limit);

    if (title) {
      query = query.ilike('title', `%${title}%`);
    }
    if (provider) {
      query = query.ilike('provider', `%${provider}%`);
    }

    const { data: candidates, error } = await query;

    if (error) {
      console.error('Error querying game_reviews:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Prefer exact or best match by title and provider when provided
    const normalized = (s: string) => s.trim().toLowerCase();

    let best = (candidates || [])[0];
    if (title && candidates && candidates.length > 0) {
      const nTitle = normalized(title);
      // Exact title match first, then startsWith, then includes
      best = candidates.find((g: any) => normalized(g.title || g.game_title) === nTitle) ||
             candidates.find((g: any) => normalized(g.title || g.game_title).startsWith(nTitle)) ||
             candidates.find((g: any) => normalized(g.title || g.game_title).includes(nTitle)) ||
             best;
    }
    if (provider && best && candidates) {
      const nProv = normalized(provider);
      // If best is not matching provider, try to find one that does
      const bestProvider = best.provider || best.developer;
      if (!bestProvider || normalized(bestProvider) !== nProv) {
        const withProv = candidates.find((g: any) => {
          const gProvider = g.provider || g.developer;
          return gProvider && normalized(gProvider) === nProv;
        });
        if (withProv) best = withProv;
      }
    }

    if (!best) {
      return NextResponse.json({ success: true, data: [], count: 0 });
    }

    const simplified = {
      id: best.id,
      slug: best.slug || best.game_slug,
      title: best.title || best.game_title,
      provider: best.provider || best.developer,
      thumbnail: best.thumbnail || best.thumbnail_url || best.banner_url || null,
      maxWin: best.max_win ? String(best.max_win).trim() : undefined,
      volatility: best.volatility ? String(best.volatility).trim() : undefined,
      releaseDate: best.release_date ? String(best.release_date).trim() : undefined,
    };

    console.log(`✅ Database query for slot-streamers search: "${title || provider}" returned ${(candidates || []).length} results (FREE - no external API cost!)`);

    return NextResponse.json({ success: true, data: [simplified], count: (candidates || []).length });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
