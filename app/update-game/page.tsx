"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SlotNameAutocomplete from "@/components/SlotNameAutocomplete";

export default function UpdateGamePage() {
  const router = useRouter();
  const [gameTitle, setGameTitle] = useState("");
  const [provider, setProvider] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [session, setSession] = useState<string | null>(null);

  useEffect(() => {
    const s = localStorage.getItem("huntmaster_session");
    setSession(s);
    if (!s) {
      router.push("/");
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) {
      setStatus("error");
      setMessage("Not logged in");
      return;
    }

    if (!gameTitle.trim()) {
      setStatus("error");
      setMessage("Game title is required");
      return;
    }

    setLoading(true);
    setStatus("idle");
    setMessage("");

    try {
      const response = await fetch("/api/current-game/set", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session,
          gameTitle: gameTitle.trim(),
          provider: provider.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setStatus("success");
        setMessage(`Current game updated to: ${data.data.gameTitle}`);
        // Auto-clear success message after 3 seconds
        setTimeout(() => {
          setStatus("idle");
          setMessage("");
        }, 3000);
      } else {
        setStatus("error");
        setMessage(data.error || "Failed to update game");
      }
    } catch (error) {
      setStatus("error");
      setMessage("Failed to update game. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (!session) return;

    setLoading(true);
    setStatus("idle");
    setMessage("");

    try {
      // Clear by setting empty
      const response = await fetch("/api/current-game/set", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session,
          gameTitle: "",
        }),
      });

      const data = await response.json();

      if (data.success) {
        setGameTitle("");
        setProvider("");
        setStatus("success");
        setMessage("Current game cleared");
        setTimeout(() => {
          setStatus("idle");
          setMessage("");
        }, 3000);
      } else {
        setStatus("error");
        setMessage(data.error || "Failed to clear game");
      }
    } catch (error) {
      setStatus("error");
      setMessage("Failed to clear game. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return null;
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", background: "#0a0a0a" }}>
      <Card style={{ maxWidth: "500px", width: "100%" }}>
        <CardHeader>
          <CardTitle>Update Current Game</CardTitle>
          <p style={{ fontSize: "14px", color: "#666", marginTop: "8px" }}>
            Set the game you're currently playing. The Now Playing widget will automatically show this game.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500 }}>
                Game Name
              </label>
              <SlotNameAutocomplete
                value={gameTitle}
                onChange={setGameTitle}
                placeholder="Enter game name (e.g., Gates of Olympus)"
                minChars={1}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500 }}>
                Provider (Optional)
              </label>
              <Input
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                placeholder="e.g., Pragmatic Play"
              />
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <Button type="submit" disabled={loading || !gameTitle.trim()}>
                {loading ? "Updating..." : "Update Game"}
              </Button>
              <Button type="button" variant="outline" onClick={handleClear} disabled={loading}>
                Clear
              </Button>
            </div>
            {status !== "idle" && (
              <div
                style={{
                  padding: "12px",
                  borderRadius: "4px",
                  backgroundColor: status === "success" ? "#10b98120" : "#ef444420",
                  color: status === "success" ? "#10b981" : "#ef4444",
                  fontSize: "14px",
                }}
              >
                {message}
              </div>
            )}
          </form>
          <div style={{ marginTop: "24px", padding: "16px", background: "#f3f4f6", borderRadius: "8px", fontSize: "14px", color: "#666" }}>
            <strong>Tip:</strong> Keep this page open while streaming. When you switch games, just update the name here and the widget will update automatically within 2 seconds.
          </div>
          <div style={{ marginTop: "12px", padding: "16px", background: "#1a3a1a", borderRadius: "8px", fontSize: "14px", color: "#9ad97a" }}>
            <strong>💡 Browser Extension Available!</strong>
            <p style={{ marginTop: "8px", marginBottom: "8px" }}>
              Install the browser extension to automatically detect games from casino sites.
            </p>
            <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
              <Button variant="outline" size="sm" onClick={() => window.open("/get-session-token", "_blank")}>
                Get Session Token
              </Button>
            </div>
            <p style={{ marginTop: "8px", fontSize: "12px", color: "#888" }}>
              See the README.md file in the browser-extension folder for installation instructions.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

