"use client";

import { InstructionsContent } from "@/components/instructions-content";
import { useEffect, useState } from "react";
import { decrypt } from "@/lib/protection";

export default function InstructionsPage() {
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);

  useEffect(() => {
    const session = localStorage.getItem("huntmaster_session");
    if (session) {
      try {
        const sessionData = JSON.parse(decrypt(session));
        setCurrentUsername(sessionData.username || null);
      } catch (err) {
        console.error("Error parsing session:", err);
        setCurrentUsername(null);
      }
    }
  }, []);

  return (
    <div className="container mx-auto p-4 max-w-5xl">
      <InstructionsContent currentUsername={currentUsername} isStandalonePage={true} />
    </div>
  );
}

