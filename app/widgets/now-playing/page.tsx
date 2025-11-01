"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ExtensionGameWidget from "@/components/ExtensionGameWidget";
import BonusHuntGameWidget from "@/components/BonusHuntGameWidget";

function NowPlayingWidgetContent() {
  const params = useSearchParams();
  const username = params.get("user") || undefined;
  const title = params.get("title") || undefined;
  const provider = params.get("provider") || undefined;
  const source = params.get("source") || "extension"; // "extension" or "hunt"

  // Minimal wrapper to embed in OBS/browser source like other widgets
  // Supports URL params: 
  //   ?user=Username&title=Game Name&provider=Provider Name&source=extension|hunt
  //   source=extension (default): Shows game from browser extension
  //   source=hunt: Shows next game from active bonus hunt
  //   If title is provided, it will show that specific game instead of auto-detecting
  return (
    <div style={{ padding: 8, background: "transparent" }}>
      {source === "hunt" ? (
        <BonusHuntGameWidget username={username} title={title} provider={provider} />
      ) : (
        <ExtensionGameWidget username={username} title={title} provider={provider} />
      )}
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
