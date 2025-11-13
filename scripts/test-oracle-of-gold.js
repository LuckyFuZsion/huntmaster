const fs = require('fs');
const path = require('path');

// Read .env.local file
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim().replace(/^["']|["']$/g, '');
    envVars[key] = value;
  }
});

const apiKey = envVars.SLOT_STREAMERS_API_KEY;
const base = envVars.SLOT_STREAMERS_API_URL || "https://www.slot-streamers.com/api/commercial";
const slBase = envVars.SLOTSLAUNCH_API_BASE_URL || envVars.SLOT_STREAMERS_API_BASE_URL || "https://slot-streamers.com";

if (!apiKey) {
  console.error("API key not configured");
  process.exit(1);
}

async function testAPIs() {
  console.log("Testing Slot Streamers API...");
  const ssUrl = `${base}/game-reviews?search=Oracle%20of%20Gold&limit=5`;
  
  try {
    const ssRes = await fetch(ssUrl, {
      headers: {
        "x-api-key": apiKey,
        "Accept": "application/json",
      },
    });

    console.log(`Slot Streamers Status: ${ssRes.status}`);
    
    if (ssRes.ok) {
      const ssData = await ssRes.json();
      const ssGame = ssData?.data?.find((g) => 
        g.title && g.title.toLowerCase().includes("oracle of gold")
      );
      
      if (ssGame) {
        console.log("\n=== Slot Streamers - Oracle of Gold ===");
        console.log("Title:", ssGame.title);
        console.log("Provider:", ssGame.developer);
        console.log("Release Date:", ssGame.release_date);
        console.log("\nMax Win Fields:");
        console.log("  max_win (top):", ssGame.max_win);
        console.log("  max_win (features.technical_specs):", ssGame.features?.technical_specs?.max_win);
        console.log("\nVolatility Fields:");
        console.log("  volatility (top):", ssGame.volatility);
        console.log("  volatility (features.technical_specs):", ssGame.features?.technical_specs?.volatility);
        console.log("\nAll Keys:", Object.keys(ssGame));
        console.log("\nFull Features Object:", JSON.stringify(ssGame.features, null, 2));
      } else {
        console.log("Oracle of Gold not found in Slot Streamers results");
        console.log("Available games:", ssData?.data?.map(g => g.title) || []);
      }
    } else {
      const errorText = await ssRes.text();
      console.log("Slot Streamers Error:", errorText);
    }
  } catch (e) {
    console.error("Slot Streamers Error:", e.message);
  }

  console.log("\n\nTesting SlotsLaunch API...");
  const slUrl = `${slBase}/api/commercial/slotslaunch?search=Oracle%20of%20Gold&limit=5`;
  
  try {
    const slRes = await fetch(slUrl, {
      headers: {
        "x-api-key": apiKey,
        "Accept": "application/json",
      },
    });

    console.log(`SlotsLaunch Status: ${slRes.status}`);
    
    if (slRes.ok) {
      const slData = await slRes.json();
      const slGame = slData?.games?.find((g) => 
        g.name && g.name.toLowerCase().includes("oracle of gold")
      );
      
      if (slGame) {
        console.log("\n=== SlotsLaunch - Oracle of Gold ===");
        console.log("Name:", slGame.name);
        console.log("Provider:", slGame.provider);
        console.log("Release Date:", slGame.release_date);
        console.log("\nMax Win Fields:");
        console.log("  max_win:", slGame.max_win);
        console.log("  max_win_x:", slGame.max_win_x);
        console.log("  max_win_multiplier:", slGame.max_win_multiplier);
        console.log("  maxwin:", slGame.maxwin);
        console.log("  maximum_win:", slGame.maximum_win);
        console.log("  max_win_amount:", slGame.max_win_amount);
        console.log("\nVolatility Fields:");
        console.log("  volatility:", slGame.volatility);
        console.log("  volatility_level:", slGame.volatility_level);
        console.log("\nAll Keys:", Object.keys(slGame));
        console.log("\nFull Object:", JSON.stringify(slGame, null, 2));
      } else {
        console.log("Oracle of Gold not found in SlotsLaunch results");
        console.log("Available games:", slData?.games?.map(g => g.name) || []);
      }
    } else {
      const errorText = await slRes.text();
      console.log("SlotsLaunch Error:", errorText);
    }
  } catch (e) {
    console.error("SlotsLaunch Error:", e.message);
  }
}

testAPIs();

