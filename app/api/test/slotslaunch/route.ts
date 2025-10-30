import { NextResponse } from "next/server";

const BASE = (process.env.SLOTSLAUNCH_API_BASE_URL || "").replace(/\/$/, "");
const KEY = process.env.SLOTSLAUNCH_API_KEY;

export async function GET(request: Request) {
  try {
    if (!BASE || !KEY) {
      return NextResponse.json({ success: false, error: "SLOTSLAUNCH env not configured" }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || searchParams.get("q") || "";
    const limit = searchParams.get("limit") || "20";

    const url = new URL("/api/commercial/slotslaunch", BASE);
    if (search) url.searchParams.set("search", search);
    url.searchParams.set("limit", limit);

    let res = await fetch(url.toString(), {
      headers: {
        "x-api-key": KEY,
        "Accept": "application/json",
      },
      cache: "no-store",
    });

    // Retry with www. subdomain if 404 and base host doesn't include it
    let contentType = res.headers.get("content-type") || "";
    let isJson = contentType.includes("application/json");
    let body: any = isJson ? await res.json().catch(() => null) : await res.text().catch(() => "");

    if (res.status === 404 && BASE.includes("slot-streamers.com") && !BASE.includes("www.")) {
      const wwwUrl = new URL(url.toString().replace("https://slot-streamers.com", "https://www.slot-streamers.com"));
      res = await fetch(wwwUrl.toString(), {
        headers: {
          "x-api-key": KEY,
          "Accept": "application/json",
        },
        cache: "no-store",
      });
      contentType = res.headers.get("content-type") || "";
      isJson = contentType.includes("application/json");
      body = isJson ? await res.json().catch(() => null) : await res.text().catch(() => "");
      if (!res.ok) {
        return NextResponse.json({ success: false, status: res.status, url: wwwUrl.toString(), data: body }, { status: res.status });
      }
      const gamesW = Array.isArray((body as any)?.games) ? (body as any).games : [];
      const simplifiedW = gamesW.map((g: any) => ({
        id: g.id,
        name: g.name,
        provider: g.provider,
        slug: g.slug,
        thumbnail_url: g.thumbnail_url || null,
        banner_url: g.banner_url || g.og_image_url || null,
        demo_url: g.demo_url || null,
        rtp: g.rtp || null,
        volatility: g.volatility || null,
        release_date: g.release_date || null,
      }));
      return NextResponse.json({ success: true, count: simplifiedW.length, url: wwwUrl.toString(), games: simplifiedW });
    }

    if (!res.ok) {
      return NextResponse.json({ success: false, status: res.status, url: url.toString(), data: body }, { status: res.status });
    }

    const games = Array.isArray((body as any)?.games) ? (body as any).games : [];
    const simplified = games.map((g: any) => ({
      id: g.id,
      name: g.name,
      provider: g.provider,
      slug: g.slug,
      thumbnail_url: g.thumbnail_url || null,
      banner_url: g.banner_url || g.og_image_url || null,
      demo_url: g.demo_url || null,
      rtp: g.rtp || null,
      volatility: g.volatility || null,
      release_date: g.release_date || null,
    }));

    return NextResponse.json({ success: true, count: simplified.length, url: url.toString(), games: simplified });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
