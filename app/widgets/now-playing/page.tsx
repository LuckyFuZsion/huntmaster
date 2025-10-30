"use client";

import { useSearchParams } from "next/navigation";
import CurrentGameWidget from "@/components/CurrentGameWidget";

export default function NowPlayingWidgetPage() {
  const params = useSearchParams();
  const username = params.get("user") || undefined;

  // Minimal wrapper to embed in OBS/browser source like other widgets
  return (
    <div style={{ padding: 8, background: "transparent" }}>
      <CurrentGameWidget username={username} />
    </div>
  );
}
