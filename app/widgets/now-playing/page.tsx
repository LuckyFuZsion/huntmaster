"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import CurrentGameWidget from "@/components/CurrentGameWidget";

function NowPlayingWidgetContent() {
  const params = useSearchParams();
  const username = params.get("user") || undefined;

  // Minimal wrapper to embed in OBS/browser source like other widgets
  return (
    <div style={{ padding: 8, background: "transparent" }}>
      <CurrentGameWidget username={username} />
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
