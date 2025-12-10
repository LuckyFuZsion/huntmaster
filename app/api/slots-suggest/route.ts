import { NextResponse } from "next/server";
import { supabaseAdmin, getSupabaseClient } from "@/lib/supabase-admin";
import { decrypt } from "@/lib/protection";

// Set max duration for database queries
export const maxDuration = 20 // 20 seconds max

// Simple in-memory cache with TTL to reduce database queries
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000 // 30 days - game data is extremely stable (games rarely get renamed/deleted, new games don't affect cached searches)

// Query tracking for monitoring (now database queries, not API calls)
let apiCallCount = 0
let cacheHitCount = 0
let slotStreamersCallCount = 0
let slotsLaunchCallCount = 0

function getCached(key: string) {
  const cached = cache.get(key)
  if (!cached) return null
  
  const age = Date.now() - cached.timestamp
  if (age > CACHE_TTL) {
    cache.delete(key)
    return null
  }
  
  cacheHitCount++
  return cached.data
}

function setCache(key: string, data: any) {
  cache.set(key, { data, timestamp: Date.now() })
}

// Export stats for monitoring (now tracks database queries instead of API calls)
export function getApiStats() {
  return {
    totalApiCalls: apiCallCount, // Now represents database queries
    cacheHits: cacheHitCount,
    cacheHitRate: apiCallCount > 0 ? ((cacheHitCount / (apiCallCount + cacheHitCount)) * 100).toFixed(2) + '%' : '0%',
    slotStreamersCalls: slotStreamersCallCount, // Now represents game_reviews queries
    slotsLaunchCalls: slotsLaunchCallCount, // Now represents slotslaunch_games queries
    cacheSize: cache.size
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams, origin } = new URL(request.url);
    const q = searchParams.get("q") || searchParams.get("title") || "";
    const limit = Number(searchParams.get("limit") || 10);
    const page = searchParams.get("page") || undefined;
    const exhaustive = searchParams.get("exhaustive") === "1" || searchParams.get("exhaustive") === "true";
    
    // Get userId from session if provided (optional for backward compatibility)
    let userId: string | null = null;
    try {
      const sessionParam = searchParams.get("session");
      if (sessionParam) {
        const sessionData = JSON.parse(decrypt(sessionParam));
        userId = sessionData.userId || null;
      }
    } catch (e) {
      // Session not provided or invalid - continue without user tracking
    }

    if (!q || q.trim().length < 2) {
      return NextResponse.json({ success: true, data: [], total: 0, limit });
    }

    // Removed: User slots check optimization
    // This was preventing searches from getting all matching games from external APIs
    // Users should be able to search and see all available games, not just ones in their slots

    // Check cache for all requests (including browser extension)
    // Cached requests don't count toward API usage limits
    const cacheKey = `slots-suggest:${q.toLowerCase().trim()}:${limit}:${exhaustive ? '1' : '0'}:${page || '1'}`
    const cached = getCached(cacheKey)
    if (cached) {
      // Apply filtering to cached results to ensure they match the query
      // This fixes issues where cached results might be incomplete or from before filtering was added
      const normalizedQuery = q.toLowerCase().trim();
      if (cached.data && Array.isArray(cached.data)) {
        const filteredCached = cached.data.filter((item: any) => {
          if (!item.title) return false;
          const normalizedTitle = item.title.toLowerCase().trim();
          return normalizedTitle.includes(normalizedQuery);
        });
        
        // If filtering removed all results, don't use cache - fetch fresh data
        if (filteredCached.length === 0 && cached.data.length > 0) {
          console.log(`⚠️ Cache hit but filtering removed all results, fetching fresh data for: "${q}"`);
          // Continue to fetch fresh data below
        } else {
          // Return filtered cached results
          const filteredCachedResponse = {
            ...cached,
            data: filteredCached,
            metadata: {
              ...cached.metadata,
              filteredResults: filteredCached.length,
              totalBeforeFilter: cached.data.length,
              fromCache: true
            }
          };
          console.log(`✅ Cache hit for slots-suggest: "${q}" (Filtered: ${cached.data.length} → ${filteredCached.length})`)
          // IMPORTANT: Don't increment API usage for cached results
          // Cached requests are free and don't count toward limits
          return NextResponse.json(filteredCachedResponse)
        }
      } else {
        // Cached data structure is invalid, fetch fresh
        console.log(`⚠️ Cache hit but data structure invalid, fetching fresh data for: "${q}"`);
      }
    }

    // Check user's API usage limit (only if userId is provided)
    if (userId) {
      const usageCheck = await supabaseAdmin.apiUsage.checkLimit(userId);
      if (!usageCheck.canMakeRequest) {
        console.log(`🚫 API limit exceeded for user ${userId}: ${usageCheck.monthlySearches}/${usageCheck.monthlyLimit} searches used`)
        return NextResponse.json({
          success: false,
          error: "Monthly API limit exceeded",
          limitExceeded: true,
          monthlySearches: usageCheck.monthlySearches,
          monthlyLimit: usageCheck.monthlyLimit,
          remaining: usageCheck.remaining,
          message: `You've reached your monthly limit of ${usageCheck.monthlyLimit} searches. Please upgrade your plan or wait for the next billing cycle.`
        }, { status: 429 });
      }
    }

    // Track database query (no longer an API call, but keeping stats for compatibility)
    apiCallCount++
    console.log(`📊 Database Query #${apiCallCount} for slots-suggest: "${q}" (Cache: ${cacheHitCount} hits, ${cache.size} entries, User: ${userId || 'anonymous'})`)

    // PRIMARY: Query game_reviews table directly (replaces Slot Streamers API)
    slotStreamersCallCount++
    console.log(`🔍 Searching game_reviews table for: "${q}" (Query #${slotStreamersCallCount})`);
    
    let ssItems: any[] = [];
    let ssRateLimited = false; // No rate limiting for database queries
    
    try {
      // Query game_reviews table with case-insensitive search on title
      // Using ilike for case-insensitive pattern matching
      // Only select columns that exist in the database
      const { data: gameReviews, error: ssError } = await getSupabaseClient()
        .from('game_reviews')
        .select('id, slug, title, developer, thumbnail_url, banner_url, max_win, volatility, release_date, features')
        .ilike('title', `%${q}%`)
        .limit(limit);
      
      if (ssError) {
        console.error(`Error querying game_reviews table:`, ssError);
      } else {
        // Map database fields to expected format
        ssItems = (gameReviews || []).map((g: any) => {
          // Check multiple possible locations for max_win
          const maxWinVal = g.max_win ?? 
                           g.features?.technical_specs?.max_win;
          
          // Check volatility
          const volatilityVal = g.volatility ?? 
                               g.features?.technical_specs?.volatility;
          
          return {
            id: g.id,
            slug: g.slug || g.title?.toLowerCase().replace(/\s+/g, "-") || String(g.id),
            title: g.title,
            provider: g.developer || undefined,
            thumbnail: g.thumbnail_url || g.banner_url || null,
            maxWin: (maxWinVal != null && String(maxWinVal).trim() !== "") ? String(maxWinVal).trim() : undefined,
            volatility: (volatilityVal != null && String(volatilityVal).trim() !== "") ? String(volatilityVal).trim() : undefined,
            releaseDate: (g.release_date != null && String(g.release_date).trim() !== "") ? String(g.release_date).trim() : undefined,
          };
        });
        
        console.log(`✅ game_reviews table returned ${ssItems.length} results for query: "${q}"`);
        // Debug: Log sample titles
        if (ssItems.length > 0) {
          const sampleTitles = ssItems.slice(0, 5).map((item: any) => item.title).filter(Boolean);
          console.log(`📋 Sample titles from game_reviews table:`, sampleTitles);
        }
      }
    } catch (e) {
      console.error("Error querying game_reviews table:", e);
    }

    // SMART FALLBACK: Use SlotsLaunch to get additional results when needed
    // Cost optimization: Only call SlotsLaunch if:
    // 1. Slot Streamers has no results, OR
    // 2. Slot Streamers has fewer than 5 results (likely incomplete), OR
    // 3. Slot Streamers is rate limited
    // This balances coverage with cost - most searches will only use 1 API call
    // OPTIMIZATION: Never use exhaustive mode - it's too expensive (fetches all pages = 10-20+ API calls)
    // Only fetch first page of results to keep costs low
    let slJson: any = { games: [] };
    let slGames: any[] = [];
    let slRateLimited = false;
    let usedSlotsLaunch = false;

    // Only call SlotsLaunch if we need more results (cost optimization)
    // But also check if Slot Streamers results will pass the title filter
    // If they won't (e.g., searching "Mental" returns 50 results but none have "Mental" in title),
    // we need to call SlotsLaunch to get the actual game
    const MIN_RESULTS_THRESHOLD = 5; // If Slot Streamers has < 5 results, also check SlotsLaunch
    
    // Quick pre-filter check: see if Slot Streamers results will pass the title filter
    // Use the same normalize function that will be used later
    const normalizeForFilter = (str: string) => {
      return str.toLowerCase()
        .replace(/[-–—]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    };
    const normalizedQueryForFilter = normalizeForFilter(q);
    const ssFilteredCount = ssItems.filter((item: any) => {
      if (!item.title) return false;
      const normalizedTitle = normalizeForFilter(item.title);
      return normalizedTitle.includes(normalizedQueryForFilter);
    }).length;
    
    // Call SlotsLaunch if:
    // 1. Slot Streamers has no results, OR
    // 2. Slot Streamers has < 5 results, OR
    // 3. Slot Streamers is rate limited, OR
    // 4. Slot Streamers has results but none pass the title filter (filtered count is 0 or very low)
    const shouldUseSlotsLaunch = ssItems.length === 0 || 
                                  ssItems.length < MIN_RESULTS_THRESHOLD || 
                                  ssRateLimited ||
                                  (ssItems.length >= MIN_RESULTS_THRESHOLD && ssFilteredCount === 0);
    
    if (ssItems.length >= MIN_RESULTS_THRESHOLD && ssFilteredCount === 0) {
      console.log(`⚠️ Slot Streamers returned ${ssItems.length} results but none pass title filter for "${q}", calling SlotsLaunch as fallback`);
    }

    if (shouldUseSlotsLaunch) {
      usedSlotsLaunch = true;
      slotsLaunchCallCount++
      const reason = ssRateLimited ? "rate limited" : (ssItems.length === 0 ? "no results" : `only ${ssItems.length} results`);
      console.log(`🔄 Checking slotslaunch_games table for: "${q}" (Query #${slotsLaunchCallCount}, because game_reviews ${reason})`);
      
      slRateLimited = false; // No rate limiting for database queries
      
      try {
        // Query slotslaunch_games table with case-insensitive search on name
        // Only select columns that exist in the database
        const { data: slotsLaunchGames, error: slError } = await getSupabaseClient()
          .from('slotslaunch_games')
          .select('id, slug, name, provider, provider_slug, thumbnail_url, banner_url, max_win, volatility, release_date')
          .ilike('name', `%${q}%`)
          .limit(limit);
        
        if (slError) {
          console.error(`Error querying slotslaunch_games table:`, slError);
        } else {
          slGames = slotsLaunchGames || [];
          console.log(`✅ slotslaunch_games table returned ${slGames.length} results (game_reviews had ${ssItems.length} results)`);
        }
      } catch (e) {
        console.error("Error querying slotslaunch_games table:", e);
      }
    } else {
      console.log(`✅ Using game_reviews results only (${ssItems.length} results found, >= ${MIN_RESULTS_THRESHOLD} threshold)`);
    }

    // Map SlotsLaunch games to same format (from database, not API)
    const mappedSL = slGames.map((g: any) => {
      // Get max_win from database
      const maxWinVal = g.max_win;
      
      return {
        id: Number(g.id) || g.id,
        slug: g.slug || g.name?.toLowerCase().replace(/\s+/g, "-") || String(g.id),
        title: g.name,
        provider: g.provider || g.provider_slug || undefined,
        thumbnail: g.thumbnail_url || g.banner_url || null,
        maxWin: (maxWinVal != null && String(maxWinVal).trim() !== "") ? String(maxWinVal).trim() : undefined,
        volatility: (g.volatility != null && String(g.volatility).trim() !== "") ? String(g.volatility).trim() : undefined,
        releaseDate: (g.release_date != null && String(g.release_date).trim() !== "") ? String(g.release_date).trim() : undefined,
      };
    });

    // Combine results: Prioritize Slot Streamers, then add SlotsLaunch results
    // Put Slot Streamers items first, then add SlotsLaunch items that don't already exist
    const combined = [...ssItems];
    const seen = new Map<string, any>();
    
    // Add Slot Streamers items first (these take priority)
    ssItems.forEach((it) => {
      const key = (it.slug || it.title || "").toLowerCase() + "|" + (it.provider || "").toLowerCase();
      seen.set(key, it);
      
      // Log Oracle of Gold data from Slot Streamers
      if (it.title && it.title.toLowerCase().includes("oracle of gold")) {
        console.log("✅ Oracle of Gold from Slot Streamers:", {
          title: it.title,
          maxWin: it.maxWin,
          volatility: it.volatility,
          releaseDate: it.releaseDate,
          provider: it.provider
        });
      }
    });
    
    // Add SlotsLaunch items only if they don't already exist (from Slot Streamers)
    mappedSL.forEach((it) => {
      const key = (it.slug || it.title || "").toLowerCase() + "|" + (it.provider || "").toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, it);
        combined.push(it);
      } else {
        // Merge: prefer Slot Streamers data, but fill in missing fields from SlotsLaunch
        const existing = seen.get(key);
        
        // Log if we're trying to merge Oracle of Gold
        if (it.title && it.title.toLowerCase().includes("oracle of gold")) {
          console.log("⚠️ Oracle of Gold duplicate detected - merging SlotsLaunch into Slot Streamers:", {
            existingMaxWin: existing.maxWin,
            existingVolatility: existing.volatility,
            slotsLaunchMaxWin: it.maxWin,
            slotsLaunchVolatility: it.volatility,
            willKeepMaxWin: existing.maxWin || it.maxWin,
            willKeepVolatility: existing.volatility || it.volatility
          });
        }
        
        if (!existing.maxWin && it.maxWin) existing.maxWin = it.maxWin;
        if (!existing.volatility && it.volatility) existing.volatility = it.volatility;
        if (!existing.releaseDate && it.releaseDate) existing.releaseDate = it.releaseDate;
        if (!existing.provider && it.provider) existing.provider = it.provider;
        if (!existing.thumbnail && it.thumbnail) existing.thumbnail = it.thumbnail;
      }
    });
    
    const deduped = Array.from(seen.values());

    // Filter results to only include games where the title contains the search query
    // The API may match on provider/description, but we only want games with the query in the title
    // Use lenient normalization to handle special characters and spacing differences
    const normalize = (str: string) => {
      return str.toLowerCase()
        .replace(/[-–—]/g, " ")  // Replace dashes with spaces
        .replace(/\s+/g, " ")      // Normalize multiple spaces to single space
        .trim();
    };
    
    const normalizedQuery = normalize(q);
    
    // Debug: Log all titles in deduped array before filtering (for "Mental" search)
    if (normalizedQuery === "mental") {
      const allTitles = deduped.map((item: any) => ({
        title: item.title,
        slug: item.slug,
        provider: item.provider,
        normalized: normalize(item.title || "")
      }));
      console.log(`🔍 All titles in deduped array (before filtering) for "Mental" search:`, allTitles);
      console.log(`🔍 Total items in deduped: ${deduped.length}`);
    }
    const filtered = deduped.filter((item) => {
      if (!item.title) return false;
      const normalizedTitle = normalize(item.title);
      // Check if the title contains the search query (case-insensitive, lenient normalization)
      // This will match "Mental 2" when searching for "Mental" because "mental 2" includes "mental"
      // It will also match "Mental" exactly when searching for "Mental"
      const matches = normalizedTitle.includes(normalizedQuery);
      
      // Debug: Log ALL items when searching for "Mental" to see what's happening
      if (normalizedQuery === "mental") {
        const isMentalRelated = normalizedTitle.includes("mental");
        if (isMentalRelated) {
          console.log(`🔍 Mental-related item: "${item.title}" | Normalized: "${normalizedTitle}" | Query: "${normalizedQuery}" | Matches: ${matches} | ${matches ? "✅ KEPT" : "❌ REMOVED"}`);
          if (!matches) {
            console.log(`⚠️ WARNING: Mental-related game "${item.title}" is being filtered out!`);
            console.log(`   - Normalized title: "${normalizedTitle}"`);
            console.log(`   - Normalized query: "${normalizedQuery}"`);
            console.log(`   - Includes check result: ${normalizedTitle.includes(normalizedQuery)}`);
            console.log(`   - Full item:`, JSON.stringify(item, null, 2));
          }
        }
      }
      
      return matches;
    });
    
    // Debug: Check specifically for "Mental" when searching for "Mental"
    if (normalizedQuery === "mental") {
      const exactMental = deduped.find((item: any) => normalize(item.title || "") === "mental");
      const mental2 = deduped.find((item: any) => normalize(item.title || "") === "mental 2");
      console.log(`🔍 Searching for "Mental" - Found in API results:`, {
        exactMental: exactMental ? exactMental.title : "NOT FOUND",
        mental2: mental2 ? mental2.title : "NOT FOUND",
        totalResults: deduped.length
      });
    }
    
    // Debug: Log what titles are being filtered and why
    if (deduped.length > 0) {
      const sampleTitles = deduped.slice(0, 10).map((item: any) => ({
        title: item.title,
        normalized: normalize(item.title || ""),
        matches: normalize(item.title || "").includes(normalizedQuery)
      })).filter((item: any) => item.title);
      console.log(`🔍 Filtering ${deduped.length} results for query "${q}" (normalized: "${normalizedQuery}")`);
      console.log(`📋 Sample titles and match status:`, sampleTitles);
    }
    
    // Debug: If filtering removed all results, log some sample titles to see what we got
    if (filtered.length === 0 && deduped.length > 0) {
      const sampleTitles = deduped.slice(0, 10).map((item: any) => item.title).filter(Boolean);
      console.log(`⚠️ Filtering removed all ${deduped.length} results for query "${q}". Sample titles from API:`, sampleTitles);
      console.log(`🔍 Query normalized: "${normalizedQuery}"`);
      // Show normalized versions of sample titles for debugging
      const sampleNormalized = sampleTitles.slice(0, 5).map((title: string) => ({
        original: title,
        normalized: normalize(title),
        containsQuery: normalize(title).includes(normalizedQuery)
      }));
      console.log(`🔍 Sample normalized titles:`, sampleNormalized);
    }
    
    console.log(`🔍 Filtered results: ${deduped.length} → ${filtered.length} (query: "${q}")`);
    if (filtered.length > 0) {
      const filteredTitles = filtered.slice(0, 5).map((item: any) => item.title).filter(Boolean);
      console.log(`✅ Filtered titles (sample):`, filteredTitles);
    }

    // Include minimal pagination hint from SlotsLaunch if present
    const pagination = slJson?.total_pages
      ? { total: slJson.total, total_pages: slJson.total_pages, page: Number(page || 1), limit }
      : undefined;
    const payload = exhaustive ? filtered : filtered.slice(0, limit);
    
    // Include rate limit warnings in response if applicable
    const warnings: string[] = [];
    if (ssRateLimited) warnings.push("Slot Streamers API rate limited");
    if (slRateLimited) warnings.push("SlotsLaunch API rate limited");
    
    // Include metadata about which APIs were used
    const metadata: any = {
      primarySource: ssItems.length > 0 ? "slot-streamers" : (slGames.length > 0 ? "slotslaunch" : "none"),
      usedFallback: usedSlotsLaunch,
      slotStreamersResults: ssItems.length,
      slotsLaunchResults: slGames.length,
      filteredResults: filtered.length,
      totalBeforeFilter: deduped.length,
    };
    
    const response = { 
      success: true, 
      data: payload, 
      pagination,
      metadata,
      ...(warnings.length > 0 && { warnings, rateLimited: true })
    }
    
    // Cache all successful responses (including browser extension)
    setCache(cacheKey, response)
    
    // Increment user's API usage count (only if userId provided and actual API call was made)
    // NOTE: This only runs if we didn't return early from cache, so cached requests don't increment
    if (userId) {
      try {
        const usage = await supabaseAdmin.apiUsage.increment(userId);
        console.log(`📈 API usage updated for user ${userId}: ${usage.monthlySearches}/${usage.monthlyLimit || 'unlimited'} (${usage.remaining || 'unlimited'} remaining)`)
        // Add usage info to response
        response.metadata = {
          ...response.metadata,
          apiUsage: {
            monthlySearches: usage.monthlySearches,
            monthlyLimit: usage.monthlyLimit,
            remaining: usage.remaining
          }
        }
      } catch (error) {
        console.error('Error incrementing API usage (non-blocking):', error)
        // Don't fail the request if usage tracking fails
      }
    }
    
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";

