"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import CurrentGameWidget from "@/components/CurrentGameWidget";

function NowPlayingWidgetContent() {
  const params = useSearchParams();
  const username = params.get("user") || undefined;
  const title = params.get("title") || undefined;
  const provider = params.get("provider") || undefined;

  // Minimal wrapper to embed in OBS/browser source like other widgets
  // Supports URL params: ?user=Username&title=Game Name&provider=Provider Name
  // If title is provided, it will show that specific game instead of auto-detecting
  return (
    <div style={{ padding: 8, background: "transparent" }}>
      <CurrentGameWidget username={username} title={title} provider={provider} />
    </div>
  );
}

export default function NowPlayingWidgetPage() {
  return (
    <Suspense fallback={<div style={{ padding: 8, background: "transparent" }}>Loading...</div>}>
      <NowPlayingWidgetContent />
    </Suspense>
  );
}
