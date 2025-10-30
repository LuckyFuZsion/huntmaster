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

    const mappedSL = slGames.map((g) => ({
      id: Number(g.id) || g.id,
      slug: g.slug || g.name?.toLowerCase().replace(/\s+/g, "-") || String(g.id),
      title: g.name,
      provider: g.provider || g.provider_slug || undefined,
      thumbnail: g.thumbnail_url || g.banner_url || null,
      maxWin: g.max_win ?? undefined,
    }));

    // Prefer SlotsLaunch results (which may include maxWin) over game reviews
    const combined = [...mappedSL, ...ssItems];
    const seen = new Set<string>();
    const deduped = combined.filter((it) => {
      const key = (it.slug || it.title || "").toLowerCase() + "|" + (it.provider || "").toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

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

