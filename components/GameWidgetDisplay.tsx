"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useSupabaseUserWinsByGame } from "@/lib/hooks/useSupabaseUserWins";
import { pickExactGameMatch, sanitizeProviderFilter } from "@/lib/game-search-utils";

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
  const [showBestWins, setShowBestWins] = useState(true);

  const effectiveProvider = sanitizeProviderFilter(providerProp);

  // Cache game data to avoid excessive API calls
  const gameDataCacheRef = useRef<Map<string, any>>(new Map());
  
  const suggestUrl = useMemo(() => {
    if (!title) return null;
    const p = new URLSearchParams();
    p.set("q", title);
    if (effectiveProvider) p.set("provider", effectiveProvider);
    p.set("limit", "10");
    // REMOVED: exhaustive=1 - too expensive, fetches all pages (10-20+ API calls per search)
    // First page results are sufficient for widget display
    return `/api/slots-suggest?${p.toString()}`;
  }, [title, effectiveProvider]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!suggestUrl || !title) return;
      
      // Normalize title for cache key (remove hyphens, extra spaces)
      const normalizeTitle = (title: string) => {
        return title
          .toLowerCase()
          .trim()
          .replace(/[-–—]/g, ' ') // Replace hyphens, en-dashes, em-dashes with spaces
          .replace(/\s+/g, ' ') // Replace multiple spaces with single space
          .trim();
      };
      
      // Check cache first
      const cacheKey = normalizeTitle(title);
      const cached = gameDataCacheRef.current.get(cacheKey);
      if (cached && cached.source !== "slotslaunch") {
        console.log('GameWidgetDisplay: Using cached game data', {
          title: cached.title,
          source: cached.source,
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
        
        // Log which API was used (from metadata if available)
        if (data.metadata) {
          console.log('GameWidgetDisplay: API usage', {
            primarySource: data.metadata.primarySource,
            usedFallback: data.metadata.usedFallback,
            slotStreamersResults: data.metadata.slotStreamersResults,
            slotsLaunchResults: data.metadata.slotsLaunchResults
          });
        }
        
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          // Normalize title for comparison (remove hyphens, extra spaces)
          const normalizeTitle = (title: string) => {
            return title
              .toLowerCase()
              .trim()
              .replace(/[-–—]/g, ' ') // Replace hyphens, en-dashes, em-dashes with spaces
              .replace(/\s+/g, ' ') // Replace multiple spaces with single space
              .trim();
          };
          
          const normalizedTitle = normalizeTitle(title);
          // Prefer game_reviews over slotslaunch when both share the same title
          let exactMatch = pickExactGameMatch(data.data, title, effectiveProvider);
          
          // If not found, try searching again without the dash (fallback search)
          if (!exactMatch) {
            const titleWithoutDash = title.replace(/[-–—]/g, ' ').replace(/\s+/g, ' ').trim();
            if (titleWithoutDash !== title) {
              console.log('[GameWidgetDisplay] No match found, trying fallback search without dash:', titleWithoutDash);
              try {
                const fallbackParams = new URLSearchParams();
                fallbackParams.set('q', titleWithoutDash);
                if (effectiveProvider) fallbackParams.set('provider', effectiveProvider);
                fallbackParams.set('limit', '20');
                // REMOVED: exhaustive=1 - too expensive
                
                const fallbackRes = await fetch(`/api/slots-suggest?${fallbackParams.toString()}`, { cache: 'no-store' });
                const fallbackData = await fallbackRes.json();
                
                if (fallbackData.success && Array.isArray(fallbackData.data) && fallbackData.data.length > 0) {
                  exactMatch = pickExactGameMatch(fallbackData.data, title, effectiveProvider);
                  if (exactMatch) {
                    console.log('[GameWidgetDisplay] ✓ Found match in fallback search:', exactMatch.title);
                  }
                }
              } catch (fallbackError) {
                console.error('[GameWidgetDisplay] Fallback search error:', fallbackError);
              }
            }
          }
          if (exactMatch) {
            // Cache the result
            gameDataCacheRef.current.set(cacheKey, exactMatch);
            console.log('GameWidgetDisplay: Loaded game data', {
              title: exactMatch.title,
              maxWin: exactMatch.maxWin,
              volatility: exactMatch.volatility,
              releaseDate: exactMatch.releaseDate,
              provider: exactMatch.provider,
              source: exactMatch.source || data.metadata?.primarySource || 'unknown',
            });
            setGame(exactMatch);
            setImageError(false);
            if (!cancelled) setLoading(false);
            return;
          }
          // No exact match found - game doesn't exist in database
          console.log('GameWidgetDisplay: No exact match found in results', {
            title: title,
            resultsCount: data.data.length,
            searchedIn: data.metadata?.primarySource || 'unknown'
          });
          setGame(null);
          setImageError(false);
          if (!cancelled) setLoading(false);
          return;
        } else {
          // No results from initial search - try fallback search without dash
          console.log('GameWidgetDisplay: No results from initial API search, trying fallback without dash', {
            title: title,
            searchedIn: data.metadata?.primarySource || 'none'
          });
          
          // Try searching again without the dash (fallback search)
          const titleWithoutDash = title.replace(/[-–—]/g, ' ').replace(/\s+/g, ' ').trim();
          if (titleWithoutDash !== title) {
            console.log('[GameWidgetDisplay] Trying fallback search without dash:', titleWithoutDash);
            try {
              const fallbackParams = new URLSearchParams();
              fallbackParams.set('q', titleWithoutDash);
              if (effectiveProvider) fallbackParams.set('provider', effectiveProvider);
              fallbackParams.set('limit', '30');
              fallbackParams.set('exhaustive', '1');
              
              const fallbackRes = await fetch(`/api/slots-suggest?${fallbackParams.toString()}`, { cache: 'no-store' });
              const fallbackData = await fallbackRes.json();
              
              if (fallbackData.success && Array.isArray(fallbackData.data) && fallbackData.data.length > 0) {
                console.log('[GameWidgetDisplay] Fallback search returned', fallbackData.data.length, 'results');
                
                // Normalize title for comparison
                const normalizeTitle = (title: string) => {
                  return title
                    .toLowerCase()
                    .trim()
                    .replace(/[-–—]/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();
                };
                
                const normalizedTitle = normalizeTitle(title);
                const exactMatch = pickExactGameMatch(fallbackData.data, title, effectiveProvider);
                
                if (exactMatch) {
                  console.log('[GameWidgetDisplay] ✓ Found match in fallback search:', exactMatch.title);
                  const cacheKey = normalizeTitle(title);
                  gameDataCacheRef.current.set(cacheKey, exactMatch);
                  setGame(exactMatch);
                  setImageError(false);
                  if (!cancelled) setLoading(false);
                  return;
                } else {
                  console.log('[GameWidgetDisplay] ⚠️ No match found in fallback search');
                }
              } else {
                console.log('[GameWidgetDisplay] Fallback search returned no results');
              }
            } catch (fallbackError) {
              console.error('[GameWidgetDisplay] Fallback search error:', fallbackError);
            }
          }
          
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
    console.log('GameWidgetDisplay: bestWins updated', {
      username,
      title,
      bestWins,
      bestWinAmount: bestWins?.bestWinAmount,
      bestXWin: bestWins?.bestXWin
    });
    if (bestWins) {
      setGameBests(bestWins);
    } else {
      setGameBests(null);
    }
  }, [bestWins, username, title]);

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

  // Revolving screens: Switch between Best Wins screen and Game Info screen every 5 seconds
  useEffect(() => {
    const hasBestWins = gameBests?.bestWinAmount != null || gameBests?.bestXWin != null;
    const hasGameInfo = (game?.maxWin != null && String(game.maxWin).trim() !== "") ||
                       (game?.volatility != null && String(game.volatility).trim() !== "") ||
                       (game?.releaseDate != null && String(game.releaseDate).trim() !== "");

    console.log('GameWidgetDisplay: Revolving stats check', {
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
        console.log('GameWidgetDisplay: Rotating to', next ? 'Best Wins' : 'Game Info');
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
  if (!title) return null;

  // Use database title if available (correct formatting), otherwise use detected title
  const displayTitle = game?.title || title;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ width: size * 1.5, height: size, borderRadius: size * 0.15, overflow: "hidden", background: "#111", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {(thumbnailUrl || (useOriginalUrl && game?.thumbnail)) && !imageError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img 
            src={useOriginalUrl && game?.thumbnail ? game.thumbnail : thumbnailUrl || ""} 
            alt={game?.title || "Game"} 
            width={size * 1.5} 
            height={size} 
            style={{ objectFit: "contain", width: "100%", height: "100%" }}
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
            if (displayTitle.length <= charsPerLine) {
              return <span>{displayTitle}</span>;
            }
            
            // Find the last space before or at 20 characters for the first line
            let firstLineBreak = charsPerLine;
            if (displayTitle.length > charsPerLine) {
              // Look for the last space within the first 20 characters
              const firstPart = displayTitle.substring(0, charsPerLine + 1);
              const lastSpaceIndex = firstPart.lastIndexOf(' ');
              if (lastSpaceIndex > 0 && lastSpaceIndex <= charsPerLine) {
                firstLineBreak = lastSpaceIndex;
              }
            }
            
            const firstLine = displayTitle.substring(0, firstLineBreak).trim();
            const remaining = displayTitle.substring(firstLineBreak).trim();
            
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

