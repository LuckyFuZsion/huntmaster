"use client";

import { useEffect, useMemo, useState } from "react";

interface CurrentGameWidgetProps {
  title?: string; // current game title (from stream or tracker)
  provider?: string; // optional provider name
  username?: string; // when provided, auto-detect next slot title from DB
  size?: number; // thumbnail size in px
}

interface SimplifiedGame {
  id: number;
  slug: string;
  title: string;
  provider?: string;
  thumbnail?: string | null;
  maxWin?: string | number | null;
}

export default function CurrentGameWidget({ title: titleProp, provider, username, size = 160 }: CurrentGameWidgetProps) {
  const [autoTitle, setAutoTitle] = useState<string | null>(null);
  const [game, setGame] = useState<SimplifiedGame | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overallBests, setOverallBests] = useState<{ bestWinAmount: number | null; bestXWin: number | null; bestWinGame?: string; bestXWinGame?: string; } | null>(null);
  const [imageError, setImageError] = useState(false);

  // Auto-load next slot title if username provided and no explicit title
  useEffect(() => {
    let cancelled = false;
    async function loadNext() {
      if (!username || titleProp) {
        setAutoTitle(null);
        return;
      }
      try {
        const res = await fetch(`/api/current-game/next?username=${encodeURIComponent(username)}`, { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        const t = data?.data?.title || null;
        setAutoTitle(t);
      } catch (e) {
        if (!cancelled) setAutoTitle(null);
      }
    }
    loadNext();
    const interval = username && !titleProp ? setInterval(loadNext, 2000) : null;
    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [username, titleProp]);

  const effectiveTitle = titleProp || autoTitle || "";

  const suggestUrl = useMemo(() => {
    if (!effectiveTitle) return null;
    const p = new URLSearchParams();
    p.set("q", effectiveTitle);
    if (provider) p.set("provider", provider);
    p.set("limit", "10");
    // exhaustive=1 ensures full-table search on SlotsLaunch side
    p.set("exhaustive", "1");
    return `/api/slots-suggest?${p.toString()}`;
  }, [effectiveTitle, provider]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!suggestUrl) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(suggestUrl, { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          const preferred = data.data.find((it: any) => it.maxWin && String(it.maxWin).trim() !== "") || data.data[0];
          setGame(preferred);
          setImageError(false); // Reset image error when loading new game
          if (preferred?.thumbnail) {
            console.log("Loading thumbnail:", preferred.thumbnail);
          }
        } else {
          // Fallback: try legacy single-source search
          const params = new URLSearchParams();
          params.set("title", effectiveTitle);
          if (provider) params.set("provider", provider);
          params.set("limit", "5");
          const legacy = await fetch(`/api/slot-streamers/search-game?${params.toString()}`, { cache: "no-store" });
          const legacyJson = await legacy.json();
          if (!cancelled && legacyJson.success && Array.isArray(legacyJson.data) && legacyJson.data.length > 0) {
            const preferredLegacy = legacyJson.data.find((it: any) => it.maxWin && String(it.maxWin).trim() !== "") || legacyJson.data[0];
            setGame(preferredLegacy);
            setImageError(false); // Reset image error when loading new game
          } else {
            setGame(null);
            setImageError(false);
          }
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load game info");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [suggestUrl, effectiveTitle, provider]);

  // Load overall personal bests (highest across all games) for this user
  useEffect(() => {
    let cancelled = false;
    async function loadOverallBests() {
      if (!username) {
        setOverallBests(null);
        return;
      }
      try {
        const res = await fetch(`/api/user-wins/overall-best?username=${encodeURIComponent(username)}`, { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        if (data.success) {
          setOverallBests(data.data || null);
        } else {
          setOverallBests(null);
        }
      } catch {
        if (!cancelled) setOverallBests(null);
      }
    }
    loadOverallBests();
    const interval = username ? setInterval(loadOverallBests, 5000) : null;
    return () => { cancelled = true; if (interval) clearInterval(interval); };
  }, [username]);

  if (!effectiveTitle) return null;

  // Generate proxy URL for thumbnail if available
  const thumbnailUrl = useMemo(() => {
    if (!game?.thumbnail) return null;
    try {
      // Use proxy endpoint to bypass CORS
      return `/api/image-proxy?url=${encodeURIComponent(game.thumbnail)}`;
    } catch {
      return null;
    }
  }, [game?.thumbnail]);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ width: size, height: size, borderRadius: 6, overflow: "hidden", background: "#111", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {thumbnailUrl && !imageError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img 
            src={thumbnailUrl} 
            alt={game.title} 
            width={size} 
            height={size} 
            style={{ objectFit: "cover", width: "100%", height: "100%" }}
            onError={() => {
              console.error("Failed to load proxied image:", thumbnailUrl);
              setImageError(true);
            }}
            onLoad={() => setImageError(false)}
          />
        ) : (
          <span style={{ color: "#999", fontSize: Math.max(10, size * 0.07) }}>
            {loading ? "Loading..." : game?.thumbnail ? "Image failed" : "No image"}
          </span>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: Math.max(24, size * 0.15), lineHeight: 1.2, marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{effectiveTitle}</div>
        {(provider || game?.provider) && (
          <div style={{ color: "#aaa", fontSize: Math.max(20, size * 0.125), lineHeight: 1.2, marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{provider || game?.provider || ""}</div>
        )}
        {game?.maxWin && String(game.maxWin).trim() !== "" && (
          <div style={{ color: "#ddd", fontSize: Math.max(18, size * 0.11), lineHeight: 1.2, marginBottom: 3 }}>Max: {game.maxWin}</div>
        )}
        {overallBests?.bestWinAmount != null && (
          <div style={{ color: "#9ad97a", fontSize: Math.max(18, size * 0.11), lineHeight: 1.2, marginBottom: 2 }}>Best Win: {overallBests.bestWinAmount}</div>
        )}
        {overallBests?.bestXWin != null && (
          <div style={{ color: "#9ad97a", fontSize: Math.max(18, size * 0.11), lineHeight: 1.2, marginBottom: 3 }}>Best X: {overallBests.bestXWin}x</div>
        )}
        {error && <div style={{ color: "#f66", fontSize: Math.max(16, size * 0.1), lineHeight: 1.2 }}>{error}</div>}
      </div>
    </div>
  );
}
