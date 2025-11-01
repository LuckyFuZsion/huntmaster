"use client";

import { Suspense } from "react";
import ExtensionGameWidget from "@/components/ExtensionGameWidget";
import { useSearchParams } from "next/navigation";

function CurrentGameExampleContent() {
  const params = useSearchParams();
  const title = params.get("title") || "Gates of Olympus";
  const provider = params.get("provider") || "Pragmatic Play";

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontWeight: 700, marginBottom: 16 }}>Current Game Widget (Example)</h1>
      <ExtensionGameWidget title={title} provider={provider} />
      <div style={{ marginTop: 16, color: "#999", fontSize: 12 }}>
        Try query params like <code>?title=Sugar%20Rush&provider=Pragmatic%20Play</code>
      </div>
    </div>
  );
}

export default function CurrentGameExamplePage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading...</div>}>
      <CurrentGameExampleContent />
    </Suspense>
  );
}
