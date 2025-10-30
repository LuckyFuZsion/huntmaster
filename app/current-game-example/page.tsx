"use client";

import CurrentGameWidget from "@/components/CurrentGameWidget";
import { useSearchParams } from "next/navigation";

export default function CurrentGameExamplePage() {
  const params = useSearchParams();
  const title = params.get("title") || "Gates of Olympus";
  const provider = params.get("provider") || "Pragmatic Play";

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontWeight: 700, marginBottom: 16 }}>Current Game Widget (Example)</h1>
      <CurrentGameWidget title={title} provider={provider} />
      <div style={{ marginTop: 16, color: "#999", fontSize: 12 }}>
        Try query params like <code>?title=Sugar%20Rush&provider=Pragmatic%20Play</code>
      </div>
    </div>
  );
}
