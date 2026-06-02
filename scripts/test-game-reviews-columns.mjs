import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
for (const line of raw.split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
}

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

const cols = [
  "id",
  "slug",
  "title",
  "developer",
  "thumbnail_url",
  "banner_url",
  "max_win",
  "volatility",
  "release_date",
  "features",
  "provider",
];

for (const col of cols) {
  const { error } = await sb.from("game_reviews").select(col).limit(1);
  console.log(col, error ? `FAIL: ${error.message}` : "ok");
}
