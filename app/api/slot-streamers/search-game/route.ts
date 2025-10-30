import { NextResponse } from "next/server";
import { searchGameReviews } from "@/lib/slot-streamers-api";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const title = searchParams.get("title") || searchParams.get("q") || "";
    const provider = searchParams.get("provider") || searchParams.get("developer") || undefined;
    const limit = Number(searchParams.get("limit") || 5);

    if (!title && !provider) {
      return NextResponse.json({ success: false, error: "title or provider is required" }, { status: 400 });
    }

    // Check if API key is configured
    if (!process.env.SLOT_STREAMERS_API_KEY) {
      console.error("SLOT_STREAMERS_API_KEY is not configured");
      return NextResponse.json({ success: false, error: "API not configured" }, { status: 500 });
    }

    let response;
    try {
      response = await searchGameReviews({
        search: title || undefined,
        developer: provider,
        limit,
        include_ratings: false,
      });
    } catch (apiError: any) {
      console.error("Error calling searchGameReviews:", apiError);
      console.error("Error details:", {
        message: apiError?.message,
        stack: apiError?.stack,
        title,
        provider,
      });
      return NextResponse.json({ 
        success: false, 
        error: apiError?.message || "Failed to search game reviews",
        details: process.env.NODE_ENV === "development" ? apiError?.message : undefined
      }, { status: 500 });
    }

    // Prefer exact or best match by title and provider when provided
    const normalized = (s: string) => s.trim().toLowerCase();
    const candidates = Array.isArray(response?.data) ? response.data : [];

    let best = candidates[0];
    if (title) {
      const nTitle = normalized(title);
      // Exact title match first, then startsWith, then includes
      best = candidates.find(g => normalized(g.title) === nTitle) ||
             candidates.find(g => normalized(g.title).startsWith(nTitle)) ||
             candidates.find(g => normalized(g.title).includes(nTitle)) ||
             best;
    }
    if (provider && best) {
      const nProv = normalized(provider);
      // If best is not matching provider, try to find one that does
      if (!best.developer || normalized(best.developer) !== nProv) {
        const withProv = candidates.find(g => g.developer && normalized(g.developer) === nProv);
        if (withProv) best = withProv;
      }
    }

    if (!best) {
      return NextResponse.json({ success: true, data: [], count: 0 });
    }

    const simplified = {
      id: best.id,
      slug: best.slug,
      title: best.title,
      provider: best.developer,
      thumbnail: best.thumbnail_url || best.banner_url || null,
      maxWin: (best as any).max_win ?? (best as any).max_win_x ?? (best as any).max_win_multiplier ?? (best as any).maxwin ?? undefined,
    };

    return NextResponse.json({ success: true, data: [simplified], count: candidates.length });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
