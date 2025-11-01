"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useSupabaseCurrentGame } from "@/lib/hooks/useSupabaseCurrentGame";
import { useSupabaseUserWinsByGame } from "@/lib/hooks/useSupabaseUserWins";

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

export default function CurrentGameWidget({ title: titleProp, provider: providerProp, username, size = 160 }: CurrentGameWidgetProps) {
  const [autoTitle, setAutoTitle] = useState<string | null>(null);
  const [autoProvider, setAutoProvider] = useState<string | null>(null);
  const [game, setGame] = useState<SimplifiedGame | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gameBests, setGameBests] = useState<{ bestWinAmount: number | null; bestXWin: number | null; } | null>(null);
  const [imageError, setImageError] = useState(false);

  // Use real-time subscription for current game
  const { currentGame } = useSupabaseCurrentGame(username && !titleProp ? username : null);

  // Update title from real-time current game
  useEffect(() => {
    if (!username || titleProp) {
      setAutoTitle(null);
      setAutoProvider(null);
      return;
    }
    
    if (currentGame?.gameTitle) {
      setAutoTitle(currentGame.gameTitle);
      setAutoProvider(currentGame.provider || null);
    } else {
      // Fallback to next slot from hunt
      fetch(`/api/current-game/next?username=${encodeURIComponent(username)}`, { cache: "no-store" })
        .then((res) => res.json())
        .then((data) => {
          const t = data?.data?.title || null;
          setAutoTitle(t);
          setAutoProvider(null);
        })
        .catch(() => setAutoTitle(null));
    }
  }, [currentGame, username, titleProp]);

  const effectiveTitle = titleProp || autoTitle || "";
  const effectiveProvider = providerProp || autoProvider || undefined;

  const suggestUrl = useMemo(() => {
    if (!effectiveTitle) return null;
    const p = new URLSearchParams();
    p.set("q", effectiveTitle);
    if (effectiveProvider) p.set("provider", effectiveProvider);
    p.set("limit", "10");
    // exhaustive=1 ensures full-table search on SlotsLaunch side
    p.set("exhaustive", "1");
    return `/api/slots-suggest?${p.toString()}`;
  }, [effectiveTitle, effectiveProvider]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!suggestUrl || !effectiveTitle) return;
      
      // Check cache first
      const cacheKey = effectiveTitle.toLowerCase().trim();
      const cached = gameDataCacheRef.current.get(cacheKey);
      if (cached) {
        setGame(cached);
        setLoading(false);
        setError(null);
        return;
      }
      
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(suggestUrl, { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          // Only use game data if there's an exact title match (case-insensitive)
          const titleLower = effectiveTitle.toLowerCase().trim();
          const exactMatch = data.data.find((it: any) => 
            it.title?.toLowerCase().trim() === titleLower
          );
          if (exactMatch) {
            // Cache the result
            gameDataCacheRef.current.set(cacheKey, exactMatch);
            setGame(exactMatch);
            setImageError(false);
            if (!cancelled) setLoading(false);
            return;
          }
          // No exact match found - game doesn't exist in database
          setGame(null);
          setImageError(false);
          if (!cancelled) setLoading(false);
          return;
        } else {
          // Fallback: try legacy single-source search (only if not in cache)
          const params = new URLSearchParams();
          params.set("title", effectiveTitle);
          if (effectiveProvider) params.set("provider", effectiveProvider);
          params.set("limit", "5");
          const legacy = await fetch(`/api/slot-streamers/search-game?${params.toString()}`, { cache: "no-store" });
          const legacyJson = await legacy.json();
          if (!cancelled && legacyJson.success && Array.isArray(legacyJson.data) && legacyJson.data.length > 0) {
            // Only use game data if there's an exact title match
            const titleLower = effectiveTitle.toLowerCase().trim();
            const exactMatch = legacyJson.data.find((it: any) => 
              it.title?.toLowerCase().trim() === titleLower
            );
            if (exactMatch) {
              // Cache the result
              gameDataCacheRef.current.set(cacheKey, exactMatch);
              setGame(exactMatch);
              setImageError(false);
              if (!cancelled) setLoading(false);
              return;
            }
          }
          // No exact match found in either search
          setGame(null);
          setImageError(false);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load game info");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [suggestUrl, effectiveTitle, effectiveProvider]);

  // Use real-time subscription for user wins instead of polling
  const { bestWins } = useSupabaseUserWinsByGame(username || null, effectiveTitle || null);
  
  useEffect(() => {
    if (bestWins) {
      setGameBests(bestWins);
    } else {
      setGameBests(null);
    }
  }, [bestWins]);

  // Generate proxy URL for thumbnail if available
  // Must be called before any conditional returns to maintain hook order
  const thumbnailUrl = useMemo(() => {
    if (!game?.thumbnail) return null;
    try {
      // Use proxy endpoint to bypass CORS
      return `/api/image-proxy?url=${encodeURIComponent(game.thumbnail)}`;
    } catch {
      return null;
    }
  }, [game?.thumbnail]);

  // Early return after all hooks
  if (!effectiveTitle) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ width: size, height: size, borderRadius: 6, overflow: "hidden", background: "#111", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {thumbnailUrl && !imageError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img 
            src={thumbnailUrl} 
            alt={game?.title || "Game"} 
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
          // eslint-disable-next-line @next/next/no-img-element
          <img 
            src="/HM.png" 
            alt="HuntMaster Logo" 
            width={size} 
            height={size} 
            style={{ objectFit: "contain", width: "100%", height: "100%", padding: Math.max(4, size * 0.05) }}
            onError={() => {
              setImageError(true);
            }}
          />
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: Math.max(24, size * 0.15), lineHeight: 1.2, marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{effectiveTitle}</div>
        {(effectiveProvider || game?.provider) && (
          <div style={{ color: "#aaa", fontSize: Math.max(20, size * 0.125), lineHeight: 1.2, marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{effectiveProvider || game?.provider || ""}</div>
        )}
        {game?.maxWin && String(game.maxWin).trim() !== "" && (
          <div style={{ color: "#ddd", fontSize: Math.max(18, size * 0.11), lineHeight: 1.2, marginBottom: 3 }}>Max: {game.maxWin}</div>
        )}
        {gameBests?.bestWinAmount != null && (
          <div style={{ color: "#9ad97a", fontSize: Math.max(18, size * 0.11), lineHeight: 1.2, marginBottom: 2 }}>Best Win: {gameBests.bestWinAmount}</div>
        )}
        {gameBests?.bestXWin != null && (
          <div style={{ color: "#9ad97a", fontSize: Math.max(18, size * 0.11), lineHeight: 1.2, marginBottom: 3 }}>Best X: {gameBests.bestXWin}x</div>
        )}
        {error && <div style={{ color: "#f66", fontSize: Math.max(16, size * 0.1), lineHeight: 1.2 }}>{error}</div>}
      </div>
    </div>
  );
}
