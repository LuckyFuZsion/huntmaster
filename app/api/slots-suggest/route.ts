import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams, origin } = new URL(request.url);
    const q = searchParams.get("q") || searchParams.get("title") || "";
    const limit = Number(searchParams.get("limit") || 10);
    const page = searchParams.get("page") || undefined;
    const exhaustive = searchParams.get("exhaustive") === "1" || searchParams.get("exhaustive") === "true";

    if (!q || q.trim().length < 2) {
      return NextResponse.json({ success: true, data: [], total: 0, limit });
    }

    const suggestSSUrl = new URL(`/api/slot-streamers/suggest-games`, origin);
    suggestSSUrl.searchParams.set("q", q);
    suggestSSUrl.searchParams.set("limit", String(limit));

    const slotsLaunchUrl = new URL(`/api/slotslaunch`, origin);
    slotsLaunchUrl.searchParams.set("search", q);
    slotsLaunchUrl.searchParams.set("limit", String(limit));
    if (page) slotsLaunchUrl.searchParams.set("page", page);
    if (exhaustive) slotsLaunchUrl.searchParams.set("exhaustive", "1");

    const [ssRes, slRes] = await Promise.all([
      fetch(suggestSSUrl.toString(), { cache: "no-store" }),
      fetch(slotsLaunchUrl.toString(), { cache: "no-store" }),
    ]);

    const ssJson = ssRes.ok ? await ssRes.json() : { data: [] };
    const slJson = slRes.ok ? await slRes.json() : { games: [] };

    const ssItems: any[] = Array.isArray(ssJson?.data) ? ssJson.data : [];
    const slGames: any[] = Array.isArray(slJson?.games) ? slJson.games : [];

    const mappedSL = slGames.map((g) => {
      // Check multiple possible field names for max_win in SlotsLaunch API
      const maxWinVal = g.max_win ?? 
                       g.max_win_x ?? 
                       g.max_win_multiplier ?? 
                       g.maxwin ??
                       g.maximum_win ??
                       g.max_win_amount;
      
      return {
        id: Number(g.id) || g.id,
        slug: g.slug || g.name?.toLowerCase().replace(/\s+/g, "-") || String(g.id),
        title: g.name,
        provider: g.provider || g.provider_slug || undefined,
        thumbnail: g.thumbnail_url || g.banner_url || null,
        maxWin: (maxWinVal && String(maxWinVal).trim() !== "") ? String(maxWinVal).trim() : undefined,
        volatility: (g.volatility && String(g.volatility).trim() !== "") ? String(g.volatility).trim() : undefined,
        releaseDate: (g.release_date && String(g.release_date).trim() !== "") ? String(g.release_date).trim() : undefined,
      };
    });

    // Combine results and merge data - prefer versions with more complete data
    const combined = [...mappedSL, ...ssItems];
    const seen = new Map<string, any>();
    
    // Merge duplicates, preferring data from whichever source has more complete info
    combined.forEach((it) => {
      const key = (it.slug || it.title || "").toLowerCase() + "|" + (it.provider || "").toLowerCase();
      const existing = seen.get(key);
      
      if (!existing) {
        seen.set(key, it);
      } else {
        // Merge: prefer non-empty values, and combine data from both sources
        const merged = { ...existing };
        // Update fields if the new item has a value and existing doesn't
        if (!merged.maxWin && it.maxWin) merged.maxWin = it.maxWin;
        if (!merged.volatility && it.volatility) merged.volatility = it.volatility;
        if (!merged.releaseDate && it.releaseDate) merged.releaseDate = it.releaseDate;
        if (!merged.provider && it.provider) merged.provider = it.provider;
        if (!merged.thumbnail && it.thumbnail) merged.thumbnail = it.thumbnail;
        seen.set(key, merged);
      }
    });
    
    const deduped = Array.from(seen.values());

    // Include minimal pagination hint from SlotsLaunch if present
    const pagination = slJson?.total_pages
      ? { total: slJson.total, total_pages: slJson.total_pages, page: Number(page || 1), limit }
      : undefined;
    const payload = exhaustive ? deduped : deduped.slice(0, limit);
    return NextResponse.json({ success: true, data: payload, pagination });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";

