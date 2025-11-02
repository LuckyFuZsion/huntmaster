import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || searchParams.get("title") || "";
    const developer = searchParams.get("provider") || searchParams.get("developer") || undefined;
    const limit = Number(searchParams.get("limit") || 10);

    const base = (process.env.SLOT_STREAMERS_API_URL || "https://www.slot-streamers.com/api/commercial").replace(/\/$/, "");
    const apiKey = process.env.SLOT_STREAMERS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: "Missing SLOT_STREAMERS_API_KEY" }, { status: 500 });
    }

    const url = new URL(base + "/game-reviews");
    if (q) url.searchParams.set("search", q);
    if (developer) url.searchParams.set("developer", developer);
    url.searchParams.set("limit", String(limit));

    const res = await fetch(url.toString(), {
      headers: {
        "x-api-key": apiKey,
        "Accept": "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ success: false, error: `Upstream error ${res.status}: ${err}` }, { status: res.status });
    }

    const data = await res.json();
    const items = Array.isArray(data?.data) ? data.data : [];

    const suggestions = items.map((g: any) => {
      // Check both top-level and nested features.technical_specs for max_win
      const maxWinVal = g.max_win ?? 
                       g.max_win_x ?? 
                       g.max_win_multiplier ?? 
                       g.maxwin ??
                       g.features?.technical_specs?.max_win;
      
      // Check both top-level and nested features.technical_specs for volatility
      const volatilityVal = g.volatility ?? 
                           g.features?.technical_specs?.volatility;
      
      return {
        id: g.id,
        slug: g.slug,
        title: g.title,
        provider: g.developer,
        thumbnail: g.thumbnail_url || g.banner_url || null,
        maxWin: (maxWinVal && String(maxWinVal).trim() !== "") ? String(maxWinVal).trim() : undefined,
        volatility: (volatilityVal && String(volatilityVal).trim() !== "") ? String(volatilityVal).trim() : undefined,
        releaseDate: (g.release_date && String(g.release_date).trim() !== "") ? String(g.release_date).trim() : undefined,
      };
    });

    return NextResponse.json({ success: true, data: suggestions, total: data?.pagination?.total, limit });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
