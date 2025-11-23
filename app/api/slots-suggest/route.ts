import { NextResponse } from "next/server";

// Set max duration to prevent expensive external API calls from running too long
export const maxDuration = 20 // 20 seconds max

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

    // PRIMARY: Try Slot Streamers API first
    const suggestSSUrl = new URL(`/api/slot-streamers/suggest-games`, origin);
    suggestSSUrl.searchParams.set("q", q);
    suggestSSUrl.searchParams.set("limit", String(limit));

    console.log(`🔍 Searching Slot Streamers API for: "${q}"`);
    const ssRes = await fetch(suggestSSUrl.toString(), { cache: "no-store" });

    // Check for rate limiting (429) and log warnings
    const ssRateLimited = ssRes.status === 429;
    
    if (ssRateLimited) {
      console.warn(`⚠️ Slot Streamers API rate limited (429) for query: "${q}"`);
    }

    // Parse Slot Streamers response
    let ssJson: any = { data: [] };
    let ssItems: any[] = [];
    
    if (ssRes.ok) {
      try {
        ssJson = await ssRes.json();
        ssItems = Array.isArray(ssJson?.data) ? ssJson.data : [];
        console.log(`✅ Slot Streamers returned ${ssItems.length} results`);
      } catch (e) {
        console.error("Error parsing Slot Streamers response:", e);
      }
    } else if (!ssRateLimited) {
      console.warn(`Slot Streamers API error (${ssRes.status}) for query: "${q}"`);
    }

    // FALLBACK: Only use SlotsLaunch if Slot Streamers has no results or is rate limited
    let slJson: any = { games: [] };
    let slGames: any[] = [];
    let slRateLimited = false;
    let usedSlotsLaunch = false;

    if (ssItems.length === 0 || ssRateLimited) {
      usedSlotsLaunch = true;
      const slotsLaunchUrl = new URL(`/api/slotslaunch`, origin);
      slotsLaunchUrl.searchParams.set("search", q);
      slotsLaunchUrl.searchParams.set("limit", String(limit));
      if (page) slotsLaunchUrl.searchParams.set("page", page);
      if (exhaustive) slotsLaunchUrl.searchParams.set("exhaustive", "1");

      console.log(`🔄 Falling back to SlotsLaunch API for: "${q}"`);
      const slRes = await fetch(slotsLaunchUrl.toString(), { cache: "no-store" });
      
      slRateLimited = slRes.status === 429;
      
      if (slRateLimited) {
        console.warn(`⚠️ SlotsLaunch API rate limited (429) for query: "${q}"`);
      }
      
      if (slRes.ok) {
        try {
          slJson = await slRes.json();
          slGames = Array.isArray(slJson?.games) ? slJson.games : [];
          console.log(`✅ SlotsLaunch returned ${slGames.length} results`);
        } catch (e) {
          console.error("Error parsing SlotsLaunch response:", e);
        }
      } else if (!slRateLimited) {
        console.warn(`SlotsLaunch API error (${slRes.status}) for query: "${q}"`);
      }
    } else {
      console.log(`✅ Using Slot Streamers results only (${ssItems.length} results found)`);
    }

    // Map SlotsLaunch games to same format (only if we used SlotsLaunch)
    const mappedSL = slGames.map((g) => {
      // Check multiple possible field names for max_win in SlotsLaunch API
      const maxWinVal = g.max_win ?? 
                       g.max_win_x ?? 
                       g.max_win_multiplier ?? 
                       g.maxwin ??
                       g.maximum_win ??
                       g.max_win_amount;
      
      // Log the raw game data for "Oracle of Gold" to debug missing fields
      if (g.name && g.name.toLowerCase().includes("oracle of gold")) {
        console.log("🔍 Oracle of Gold - SlotsLaunch Raw API data:", JSON.stringify(g, null, 2));
        console.log("🔍 SlotsLaunch Extracted values:", {
          maxWinVal,
          volatility: g.volatility,
          releaseDate: g.release_date,
          allKeys: Object.keys(g),
          // Check for any field that might contain max win or volatility
          possibleMaxWinFields: {
            max_win: g.max_win,
            max_win_x: g.max_win_x,
            max_win_multiplier: g.max_win_multiplier,
            maxwin: g.maxwin,
            maximum_win: g.maximum_win,
            max_win_amount: g.max_win_amount,
            maxWin: g.maxWin,
            maxWinX: g.maxWinX
          },
          possibleVolatilityFields: {
            volatility: g.volatility,
            volatility_level: g.volatility_level,
            volatilityLevel: g.volatilityLevel
          }
        });
      }
      
      return {
        id: Number(g.id) || g.id,
        slug: g.slug || g.name?.toLowerCase().replace(/\s+/g, "-") || String(g.id),
        title: g.name,
        provider: g.provider || g.provider_slug || undefined,
        thumbnail: g.thumbnail_url || g.banner_url || null,
        maxWin: (maxWinVal != null && String(maxWinVal).trim() !== "") ? String(maxWinVal).trim() : undefined,
        volatility: (g.volatility != null && String(g.volatility).trim() !== "") ? String(g.volatility).trim() : undefined,
        releaseDate: (g.release_date != null && String(g.release_date).trim() !== "") ? String(g.release_date).trim() : undefined,
      };
    });

    // Combine results: Prioritize Slot Streamers, then add SlotsLaunch results
    // Put Slot Streamers items first, then add SlotsLaunch items that don't already exist
    const combined = [...ssItems];
    const seen = new Map<string, any>();
    
    // Add Slot Streamers items first (these take priority)
    ssItems.forEach((it) => {
      const key = (it.slug || it.title || "").toLowerCase() + "|" + (it.provider || "").toLowerCase();
      seen.set(key, it);
      
      // Log Oracle of Gold data from Slot Streamers
      if (it.title && it.title.toLowerCase().includes("oracle of gold")) {
        console.log("✅ Oracle of Gold from Slot Streamers:", {
          title: it.title,
          maxWin: it.maxWin,
          volatility: it.volatility,
          releaseDate: it.releaseDate,
          provider: it.provider
        });
      }
    });
    
    // Add SlotsLaunch items only if they don't already exist (from Slot Streamers)
    mappedSL.forEach((it) => {
      const key = (it.slug || it.title || "").toLowerCase() + "|" + (it.provider || "").toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, it);
        combined.push(it);
      } else {
        // Merge: prefer Slot Streamers data, but fill in missing fields from SlotsLaunch
        const existing = seen.get(key);
        
        // Log if we're trying to merge Oracle of Gold
        if (it.title && it.title.toLowerCase().includes("oracle of gold")) {
          console.log("⚠️ Oracle of Gold duplicate detected - merging SlotsLaunch into Slot Streamers:", {
            existingMaxWin: existing.maxWin,
            existingVolatility: existing.volatility,
            slotsLaunchMaxWin: it.maxWin,
            slotsLaunchVolatility: it.volatility,
            willKeepMaxWin: existing.maxWin || it.maxWin,
            willKeepVolatility: existing.volatility || it.volatility
          });
        }
        
        if (!existing.maxWin && it.maxWin) existing.maxWin = it.maxWin;
        if (!existing.volatility && it.volatility) existing.volatility = it.volatility;
        if (!existing.releaseDate && it.releaseDate) existing.releaseDate = it.releaseDate;
        if (!existing.provider && it.provider) existing.provider = it.provider;
        if (!existing.thumbnail && it.thumbnail) existing.thumbnail = it.thumbnail;
      }
    });
    
    const deduped = Array.from(seen.values());

    // Include minimal pagination hint from SlotsLaunch if present
    const pagination = slJson?.total_pages
      ? { total: slJson.total, total_pages: slJson.total_pages, page: Number(page || 1), limit }
      : undefined;
    const payload = exhaustive ? deduped : deduped.slice(0, limit);
    
    // Include rate limit warnings in response if applicable
    const warnings: string[] = [];
    if (ssRateLimited) warnings.push("Slot Streamers API rate limited");
    if (slRateLimited) warnings.push("SlotsLaunch API rate limited");
    
    // Include metadata about which APIs were used
    const metadata: any = {
      primarySource: ssItems.length > 0 ? "slot-streamers" : (slGames.length > 0 ? "slotslaunch" : "none"),
      usedFallback: usedSlotsLaunch,
      slotStreamersResults: ssItems.length,
      slotsLaunchResults: slGames.length,
    };
    
    return NextResponse.json({ 
      success: true, 
      data: payload, 
      pagination,
      metadata,
      ...(warnings.length > 0 && { warnings, rateLimited: true })
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";

