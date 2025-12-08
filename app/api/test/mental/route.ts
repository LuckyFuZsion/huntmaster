import { NextResponse } from "next/server";

export async function GET() {
  try {
    const apiKey = process.env.SLOT_STREAMERS_API_KEY;
    const base = process.env.SLOT_STREAMERS_API_URL || "https://www.slot-streamers.com/api/commercial";
    
    if (!apiKey) {
      return NextResponse.json({ success: false, error: "API key not configured" }, { status: 500 });
    }

    const results: any = {
      query: "mental",
      slotStreamers: null,
      slotsLaunch: null,
    };

    // Test Slot Streamers API
    const ssUrl = `${base}/game-reviews?search=mental&limit=50`;
    console.log("Testing Slot Streamers API:", ssUrl);
    
    try {
      const ssRes = await fetch(ssUrl, {
        headers: {
          "x-api-key": apiKey,
          "Accept": "application/json",
        },
        cache: "no-store",
      });

      if (ssRes.ok) {
        const ssData = await ssRes.json();
        const games = Array.isArray(ssData?.data) ? ssData.data : [];
        
        // Filter to only games with "mental" in title
        const filtered = games.filter((g: any) => 
          g.title && g.title.toLowerCase().includes("mental")
        );
        
        results.slotStreamers = {
          total: games.length,
          filtered: filtered.length,
          games: filtered.map((g: any) => ({
            title: g.title,
            provider: g.developer,
            slug: g.slug,
          })),
          allTitles: games.map((g: any) => g.title).slice(0, 20), // First 20 for debugging
        };
      } else {
        results.slotStreamers = { error: `Status ${ssRes.status}`, errorText: await ssRes.text() };
      }
    } catch (e: any) {
      results.slotStreamers = { error: e.message };
    }

    // Test SlotsLaunch API
    const slBase = process.env.SLOTSLAUNCH_API_BASE_URL || process.env.SLOT_STREAMERS_API_BASE_URL || "https://slot-streamers.com";
    const slUrl = `${slBase}/api/commercial/slotslaunch?search=mental&limit=50`;
    console.log("Testing SlotsLaunch API:", slUrl);
    
    try {
      const slRes = await fetch(slUrl, {
        headers: {
          "x-api-key": apiKey,
          "Accept": "application/json",
        },
        cache: "no-store",
      });

      if (slRes.ok) {
        const slData = await slRes.json();
        const games = Array.isArray(slData?.games) ? slData.games : [];
        
        // Filter to only games with "mental" in title
        const filtered = games.filter((g: any) => 
          g.name && g.name.toLowerCase().includes("mental")
        );
        
        results.slotsLaunch = {
          total: games.length,
          filtered: filtered.length,
          games: filtered.map((g: any) => ({
            title: g.name,
            provider: g.provider || g.provider_slug,
            slug: g.slug,
          })),
          allTitles: games.map((g: any) => g.name).slice(0, 20), // First 20 for debugging
        };
      } else {
        results.slotsLaunch = { error: `Status ${slRes.status}`, errorText: await slRes.text() };
      }
    } catch (e: any) {
      results.slotsLaunch = { error: e.message };
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || String(error) },
      { status: 500 }
    );
  }
}

