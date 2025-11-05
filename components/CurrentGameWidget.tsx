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
  volatility?: string | null;
  releaseDate?: string | null;
}

export default function CurrentGameWidget({ title: titleProp, provider: providerProp, username, size = 160 }: CurrentGameWidgetProps) {
  const [autoTitle, setAutoTitle] = useState<string | null>(null);
  const [autoProvider, setAutoProvider] = useState<string | null>(null);
  const [game, setGame] = useState<SimplifiedGame | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gameBests, setGameBests] = useState<{ bestWinAmount: number | null; bestXWin: number | null; } | null>(null);
  const [imageError, setImageError] = useState(false);
  const [showBestWins, setShowBestWins] = useState(true);

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
        console.log('CurrentGameWidget: Using cached game data', {
          title: cached.title,
          maxWin: cached.maxWin,
          volatility: cached.volatility,
          releaseDate: cached.releaseDate,
          provider: cached.provider
        });
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
            console.log('CurrentGameWidget: Loaded game data', {
              title: exactMatch.title,
              maxWin: exactMatch.maxWin,
              volatility: exactMatch.volatility,
              releaseDate: exactMatch.releaseDate,
              provider: exactMatch.provider
            });
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
              console.log('CurrentGameWidget: Loaded game data (fallback)', {
                title: exactMatch.title,
                maxWin: exactMatch.maxWin,
                volatility: exactMatch.volatility,
                releaseDate: exactMatch.releaseDate,
                provider: exactMatch.provider
              });
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

  // Revolving screens: Switch between Best Wins screen and Game Info screen every 5 seconds
  useEffect(() => {
    const hasBestWins = gameBests?.bestWinAmount != null || gameBests?.bestXWin != null;
    const hasGameInfo = (game?.maxWin != null && String(game.maxWin).trim() !== "") ||
                       (game?.volatility != null && String(game.volatility).trim() !== "") ||
                       (game?.releaseDate != null && String(game.releaseDate).trim() !== "");

    console.log('CurrentGameWidget: Revolving stats check', {
      hasBestWins,
      bestWinAmount: gameBests?.bestWinAmount,
      bestXWin: gameBests?.bestXWin,
      hasGameInfo,
      gameIsNull: game === null,
      gameIsUndefined: game === undefined,
      gameObject: game,
      maxWin: game?.maxWin,
      maxWinType: typeof game?.maxWin,
      volatility: game?.volatility,
      volatilityType: typeof game?.volatility,
      releaseDate: game?.releaseDate,
      releaseDateType: typeof game?.releaseDate,
      currentShowBestWins: showBestWins
    });

    // Always enable rotation if we have any data to show
    // If one screen is empty, it will show "No wins yet" or "Game info not available"
    const shouldRotate = hasBestWins || hasGameInfo;

    if (!shouldRotate) {
      // No data at all - don't set up rotation
      setShowBestWins(true);
      return;
    }

    // Start with Best Wins screen if it has data, otherwise start with Game Info
    // Always start with Best Wins if we have both, so user sees their wins first
    if (hasBestWins) {
      setShowBestWins(true);
    } else {
      setShowBestWins(false);
    }

    // Only rotate if we have both screens with data, or if we want to show empty states
    const interval = setInterval(() => {
      setShowBestWins((prev) => {
        const next = !prev;
        console.log('CurrentGameWidget: Rotating to', next ? 'Best Wins' : 'Game Info');
        return next;
      });
    }, 5000); // 5 seconds

    return () => clearInterval(interval);
  }, [game?.maxWin, game?.volatility, game?.releaseDate, gameBests?.bestWinAmount, gameBests?.bestXWin]);

  // Format release date if present
  const formatReleaseDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return dateStr;
    }
  };

  // Early return after all hooks
  if (!effectiveTitle) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ width: size * 1.5, height: size, borderRadius: size * 0.15, overflow: "hidden", background: "#111", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {thumbnailUrl && !imageError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img 
            src={thumbnailUrl} 
            alt={game?.title || "Game"} 
            width={size * 1.5} 
            height={size} 
            style={{ objectFit: "contain", width: "100%", height: "100%" }}
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
        <div style={{ 
          fontWeight: 700, 
          fontSize: Math.max(24, size * 0.15), 
          lineHeight: 1.2, 
          marginBottom: 3, 
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          maxHeight: `calc(${Math.max(24, size * 0.15)} * 1.2 * 2)`, // 2 lines max
          wordBreak: "break-word"
        }}>
          {(() => {
            // Format title to ~20 characters per line, max 2 lines, breaking only at word boundaries
            const charsPerLine = 20;
            if (effectiveTitle.length <= charsPerLine) {
              return <span>{effectiveTitle}</span>;
            }
            
            // Find the last space before or at 20 characters for the first line
            let firstLineBreak = charsPerLine;
            if (effectiveTitle.length > charsPerLine) {
              // Look for the last space within the first 20 characters
              const firstPart = effectiveTitle.substring(0, charsPerLine + 1);
              const lastSpaceIndex = firstPart.lastIndexOf(' ');
              if (lastSpaceIndex > 0 && lastSpaceIndex <= charsPerLine) {
                firstLineBreak = lastSpaceIndex;
              }
            }
            
            const firstLine = effectiveTitle.substring(0, firstLineBreak).trim();
            const remaining = effectiveTitle.substring(firstLineBreak).trim();
            
            if (remaining.length === 0) {
              return <span>{firstLine}</span>;
            }
            
            if (remaining.length <= charsPerLine) {
              // For second line, also break at word boundaries if possible
              return (
                <>
                  <span>{firstLine}</span>
                  <span>{remaining}</span>
                </>
              );
            } else {
              // Truncate to fit 2 lines, breaking at word boundary if possible
              const secondPart = remaining.substring(0, charsPerLine + 1);
              const lastSpaceIndex = secondPart.lastIndexOf(' ');
              let secondLineBreak = charsPerLine;
              if (lastSpaceIndex > 0 && lastSpaceIndex <= charsPerLine) {
                secondLineBreak = lastSpaceIndex;
              }
              const secondLine = remaining.substring(0, secondLineBreak).trim();
              return (
                <>
                  <span>{firstLine}</span>
                  <span>{secondLine}</span>
                </>
              );
            }
          })()}
        </div>
        {(effectiveProvider || game?.provider) && (
          <div style={{ color: "#aaa", fontSize: Math.max(20, size * 0.125), lineHeight: 1.2, marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{effectiveProvider || game?.provider || ""}</div>
        )}
        {/* Screen 1: Best Wins */}
        {showBestWins && (
          <>
            {gameBests?.bestWinAmount != null && (
              <div style={{ color: "#9ad97a", fontSize: Math.max(18, size * 0.11), lineHeight: 1.2, marginBottom: 2 }}>Best Win: ${Number(gameBests.bestWinAmount).toFixed(2)}</div>
            )}
            {gameBests?.bestXWin != null && (
              <div style={{ color: "#9ad97a", fontSize: Math.max(18, size * 0.11), lineHeight: 1.2, marginBottom: 2 }}>Best X: {gameBests.bestXWin}x</div>
            )}
            {/* Add blank line after wins for consistent spacing */}
            {(gameBests?.bestWinAmount != null || gameBests?.bestXWin != null) && (
              <div style={{ height: Math.max(18, size * 0.11) * 1.2 }}></div>
            )}
            {/* Show message if no best wins data */}
            {(!gameBests?.bestWinAmount && !gameBests?.bestXWin) && (
              <>
                <div style={{ color: "#9ad97a", fontSize: Math.max(18, size * 0.11), lineHeight: 1.2, marginBottom: 2 }}>No wins recorded yet</div>
                <div style={{ height: Math.max(18, size * 0.11) * 1.2 }}></div>
                <div style={{ height: Math.max(18, size * 0.11) * 1.2 }}></div>
              </>
            )}
          </>
        )}
        {/* Screen 2: Game Info (Max Win, Volatility, Release Date) */}
        {!showBestWins && (
          <>
            {(() => {
              const hasMaxWin = game?.maxWin != null && String(game.maxWin).trim() !== "";
              const hasVolatility = game?.volatility != null && String(game.volatility).trim() !== "";
              const hasReleaseDate = game?.releaseDate != null && String(game.releaseDate).trim() !== "";
              const missingCount = (hasMaxWin ? 0 : 1) + (hasVolatility ? 0 : 1) + (hasReleaseDate ? 0 : 1);
              
              return (
                <>
                  {hasMaxWin && (
                    <div style={{ color: "#ddd", fontSize: Math.max(18, size * 0.11), lineHeight: 1.2, marginBottom: 2 }}>Max Win: {game.maxWin}</div>
                  )}
                  {hasVolatility && (
                    <div style={{ color: "#ddd", fontSize: Math.max(18, size * 0.11), lineHeight: 1.2, marginBottom: 2 }}>Volatility: {game.volatility}</div>
                  )}
                  {hasReleaseDate && (
                    <div style={{ color: "#ddd", fontSize: Math.max(18, size * 0.11), lineHeight: 1.2, marginBottom: 2 }}>Release Date: {formatReleaseDate(game.releaseDate)}</div>
                  )}
                  {/* Show message if no game info available */}
                  {!hasMaxWin && !hasVolatility && !hasReleaseDate && (
                    <div style={{ color: "#ddd", fontSize: Math.max(18, size * 0.11), lineHeight: 1.2, marginBottom: 2 }}>Game info not available</div>
                  )}
                  {/* Add blank lines for missing fields */}
                  {Array.from({ length: missingCount }).map((_, idx) => (
                    <div key={idx} style={{ height: Math.max(18, size * 0.11) * 1.2 }}></div>
                  ))}
                </>
              );
            })()}
          </>
        )}
        {error && <div style={{ color: "#f66", fontSize: Math.max(16, size * 0.1), lineHeight: 1.2 }}>{error}</div>}
      </div>
    </div>
  );
}
