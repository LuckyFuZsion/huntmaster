"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useSupabaseUserWinsByGame } from "@/lib/hooks/useSupabaseUserWins";

interface SimplifiedGame {
  id: number;
  slug: string;
  title: string;
  provider?: string;
  thumbnail?: string | null;
  maxWin?: string | number | null;
}

interface GameWidgetDisplayProps {
  title: string;
  provider?: string;
  username?: string;
  size?: number;
}

// Shared rendering component used by both ExtensionGameWidget and BonusHuntGameWidget
export function GameWidgetDisplay({ title, provider: providerProp, username, size = 160 }: GameWidgetDisplayProps) {
  const [game, setGame] = useState<SimplifiedGame | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gameBests, setGameBests] = useState<{ bestWinAmount: number | null; bestXWin: number | null; } | null>(null);
  const [imageError, setImageError] = useState(false);

  const effectiveProvider = providerProp || undefined;

  // Cache game data to avoid excessive API calls
  const gameDataCacheRef = useRef<Map<string, any>>(new Map());
  
  const suggestUrl = useMemo(() => {
    if (!title) return null;
    const p = new URLSearchParams();
    p.set("q", title);
    if (effectiveProvider) p.set("provider", effectiveProvider);
    p.set("limit", "10");
    // exhaustive=1 ensures full-table search on SlotsLaunch side
    p.set("exhaustive", "1");
    return `/api/slots-suggest?${p.toString()}`;
  }, [title, effectiveProvider]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!suggestUrl || !title) return;
      
      // Check cache first
      const cacheKey = title.toLowerCase().trim();
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
          const titleLower = title.toLowerCase().trim();
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
          params.set("title", title);
          if (effectiveProvider) params.set("provider", effectiveProvider);
          params.set("limit", "5");
          const legacy = await fetch(`/api/slot-streamers/search-game?${params.toString()}`, { cache: "no-store" });
          const legacyJson = await legacy.json();
          if (!cancelled && legacyJson.success && Array.isArray(legacyJson.data) && legacyJson.data.length > 0) {
            // Only use game data if there's an exact title match
            const titleLower = title.toLowerCase().trim();
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
  }, [suggestUrl, title, effectiveProvider]);

  // Use real-time subscription for user wins instead of polling
  const { bestWins } = useSupabaseUserWinsByGame(username || null, title || null);
  
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

  // Fallback to original URL if proxy fails
  const [useOriginalUrl, setUseOriginalUrl] = useState(false);

  // Reset fallback when game changes
  useEffect(() => {
    setUseOriginalUrl(false);
    setImageError(false);
  }, [game?.thumbnail]);

  // Early return after all hooks
  if (!title) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ width: size, height: size, borderRadius: 6, overflow: "hidden", background: "#111", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {(thumbnailUrl || (useOriginalUrl && game?.thumbnail)) && !imageError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img 
            src={useOriginalUrl && game?.thumbnail ? game.thumbnail : thumbnailUrl || ""} 
            alt={game?.title || "Game"} 
            width={size} 
            height={size} 
            style={{ objectFit: "cover", width: "100%", height: "100%" }}
            onError={() => {
              if (!useOriginalUrl && thumbnailUrl) {
                // Try original URL as fallback if proxy fails
                console.warn("Proxy image failed, trying original URL:", game?.thumbnail);
                setUseOriginalUrl(true);
                setImageError(false); // Reset to try again
              } else {
                console.error("Failed to load image:", useOriginalUrl ? game?.thumbnail : thumbnailUrl);
                setImageError(true);
              }
            }}
            onLoad={() => {
              setImageError(false);
            }}
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
              // Fallback to text if logo fails
              setImageError(true);
            }}
          />
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: Math.max(24, size * 0.15), lineHeight: 1.2, marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
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

