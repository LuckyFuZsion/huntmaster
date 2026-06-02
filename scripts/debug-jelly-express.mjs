import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnv() {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  } catch (e) {
    console.error("Could not read .env.local", e.message);
  }
}

loadEnv();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Missing Supabase env");
  process.exit(1);
}

const sb = createClient(url, key);
const q = "Jelly Express";

const sel = "id, slug, title, developer, provider, thumbnail_url, max_win";
const selLegacy = "id, slug, title, developer, thumbnail_url, max_win";

async function main() {
  console.log("=== game_reviews (with provider column) ===");
  let { data, error } = await sb
    .from("game_reviews")
    .select(sel)
    .or(`title.ilike.%${q}%`)
    .limit(20);
  if (error) {
    console.log("Error with provider col:", error.message);
    ({ data, error } = await sb
      .from("game_reviews")
      .select(selLegacy)
      .or(`title.ilike.%${q}%`)
      .limit(20));
  }
  console.log("broad count:", data?.length ?? 0, error?.message || "ok");
  for (const row of data || []) {
    console.log(" -", JSON.stringify(row));
  }

  const { data: exact, error: exactErr } = await sb
    .from("game_reviews")
    .select(selLegacy)
    .ilike("title", q)
    .limit(5);
  console.log("\n=== game_reviews exact ilike title ===");
  console.log("count:", exact?.length ?? 0, exactErr?.message || "ok");
  for (const row of exact || []) console.log(" -", JSON.stringify(row));

  const slug = "jelly-express";
  const { data: bySlug } = await sb
    .from("game_reviews")
    .select(selLegacy)
    .or(`slug.eq.${slug},slug.ilike.%${slug}%`)
    .limit(5);
  console.log("\n=== game_reviews by slug ===");
  for (const row of bySlug || []) console.log(" -", JSON.stringify(row));

  console.log("\n=== slotslaunch_games ===");
  const { data: sl, error: slErr } = await sb
    .from("slotslaunch_games")
    .select("id, slug, name, provider, thumbnail_url, max_win")
    .or(`name.ilike.%${q}%`)
    .limit(10);
  console.log("count:", sl?.length ?? 0, slErr?.message || "ok");
  for (const row of sl || []) console.log(" -", JSON.stringify(row));
}

main().catch(console.error);
