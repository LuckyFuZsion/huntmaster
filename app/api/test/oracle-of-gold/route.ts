import { NextResponse } from "next/server";

export async function GET() {
  try {
    const apiKey = process.env.SLOT_STREAMERS_API_KEY;
    const base = process.env.SLOT_STREAMERS_API_URL || "https://www.slot-streamers.com/api/commercial";
    
    if (!apiKey) {
      return NextResponse.json({ success: false, error: "API key not configured" }, { status: 500 });
    }

    // Test Slot Streamers API
    const ssUrl = `${base}/game-reviews?search=Oracle%20of%20Gold&limit=5`;
    console.log("Testing Slot Streamers API:", ssUrl);
    
    const ssRes = await fetch(ssUrl, {
      headers: {
        "x-api-key": apiKey,
        "Accept": "application/json",
      },
      cache: "no-store",
    });

    let slotStreamersData: any = null;
    let slotStreamersError: any = null;
    
    if (ssRes.ok) {
      try {
        slotStreamersData = await ssRes.json();
      } catch (e) {
        slotStreamersError = { error: "Failed to parse JSON", message: String(e) };
      }
    } else {
      const errorText = await ssRes.text();
      slotStreamersError = { status: ssRes.status, error: errorText };
    }

    // Test SlotsLaunch API
    const slBase = process.env.SLOTSLAUNCH_API_BASE_URL || process.env.SLOT_STREAMERS_API_BASE_URL || "https://slot-streamers.com";
    const slUrl = `${slBase}/api/commercial/slotslaunch?search=Oracle%20of%20Gold&limit=5`;
    console.log("Testing SlotsLaunch API:", slUrl);
    
    const slRes = await fetch(slUrl, {
      headers: {
        "x-api-key": apiKey,
        "Accept": "application/json",
      },
      cache: "no-store",
    });

    let slotsLaunchData: any = null;
    let slotsLaunchError: any = null;
    
    if (slRes.ok) {
      try {
        slotsLaunchData = await slRes.json();
      } catch (e) {
        slotsLaunchError = { error: "Failed to parse JSON", message: String(e) };
      }
    } else {
      const errorText = await slRes.text();
      slotsLaunchError = { status: slRes.status, error: errorText };
    }

    // Find Oracle of Gold in each response
    const ssGame = slotStreamersData?.data?.find((g: any) => 
      g.title && g.title.toLowerCase().includes("oracle of gold")
    );
    
    const slGame = slotsLaunchData?.games?.find((g: any) => 
      g.name && g.name.toLowerCase().includes("oracle of gold")
    );

    return NextResponse.json({
      success: true,
      slotStreamers: {
        status: ssRes.status,
        error: slotStreamersError,
        game: ssGame ? {
          title: ssGame.title,
          provider: ssGame.developer,
          release_date: ssGame.release_date,
          // Check all possible locations for max_win
          max_win_top: ssGame.max_win,
          max_win_features: ssGame.features?.technical_specs?.max_win,
          max_win_any: ssGame.max_win ?? ssGame.max_win_x ?? ssGame.max_win_multiplier ?? ssGame.maxwin ?? ssGame.features?.technical_specs?.max_win,
          // Check all possible locations for volatility
          volatility_top: ssGame.volatility,
          volatility_features: ssGame.features?.technical_specs?.volatility,
          volatility_any: ssGame.volatility ?? ssGame.features?.technical_specs?.volatility,
          // All keys
          allKeys: Object.keys(ssGame),
          // Full object (truncated)
          fullObject: JSON.stringify(ssGame, null, 2).substring(0, 2000)
        } : null,
        allGames: slotStreamersData?.data?.map((g: any) => g.title) || []
      },
      slotsLaunch: {
        status: slRes.status,
        error: slotsLaunchError,
        game: slGame ? {
          name: slGame.name,
          provider: slGame.provider,
          release_date: slGame.release_date,
          // Check all possible locations for max_win
          max_win: slGame.max_win,
          max_win_x: slGame.max_win_x,
          max_win_multiplier: slGame.max_win_multiplier,
          maxwin: slGame.maxwin,
          maximum_win: slGame.maximum_win,
          max_win_amount: slGame.max_win_amount,
          // Check all possible locations for volatility
          volatility: slGame.volatility,
          volatility_level: slGame.volatility_level,
          // All keys
          allKeys: Object.keys(slGame),
          // Full object (truncated)
          fullObject: JSON.stringify(slGame, null, 2).substring(0, 2000)
        } : null,
        allGames: slotsLaunchData?.games?.map((g: any) => g.name) || []
      }
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

