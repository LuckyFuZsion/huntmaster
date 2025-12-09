"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";

interface Suggestion {
  id: number;
  slug: string;
  title: string;
  provider?: string;
  thumbnail?: string | null;
}

interface SlotNameAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (item: Suggestion) => void;
  placeholder?: string;
  minChars?: number;
}

export default function SlotNameAutocomplete({ value, onChange, onSelect, placeholder = "Slot Name", minChars = 2 }: SlotNameAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const justSelectedRef = useRef(false); // Track if we just selected an item
  const lastSelectedValueRef = useRef<string>(""); // Track the last selected value
  const lastSearchedRef = useRef<string>(""); // Track last API search to avoid duplicate calls
  const searchCacheRef = useRef<Map<string, Suggestion[]>>(new Map()); // Client-side cache for instant results

  const queryUrl = useMemo(() => {
    if (!value || value.trim().length < minChars) return null;
    const p = new URLSearchParams({ q: value.trim(), limit: "50" }); // Increased from 8 to 50 for better coverage
    return `/api/slots-suggest?${p.toString()}`;
  }, [value, minChars]);

  // OPTIMIZATION: Show user's previously used games as suggestions (no API call)
  const [userSlots, setUserSlots] = useState<Suggestion[]>([]);
  
  useEffect(() => {
    // Load user's slots for quick suggestions (one-time load, no API cost)
    const loadUserSlots = async () => {
      try {
        const session = localStorage.getItem("huntmaster_session");
        if (!session) return;
        
        const res = await fetch("/api/slots", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session, action: "get" }),
        });
        const data = await res.json();
        
        if (data.success && Array.isArray(data.slots)) {
          // Convert slots to suggestions format
          const suggestions: Suggestion[] = data.slots
            .map((slot: any, idx: number) => ({
              id: idx,
              slug: slot.name.toLowerCase().replace(/\s+/g, "-"),
              title: slot.name,
              provider: undefined,
            }))
            .slice(0, 50); // Limit to 50 most recent
          
          setUserSlots(suggestions);
        }
      } catch (error) {
        // Silently fail - this is just for convenience
        console.log("Could not load user slots for suggestions:", error);
      }
    };
    
    loadUserSlots();
  }, []);

  // COST OPTIMIZATION: Autocomplete is now completely optional - no API calls by default
  // Users can type freely without triggering expensive API calls
  // Only search when explicitly requested (Enter or search button)
  useEffect(() => {
    if (!value || value.trim().length < minChars) {
      setItems([]);
      setOpen(false);
      return;
    }

    const query = value.trim().toLowerCase();
    
    // OPTIMIZATION: Show matching games from user's previous slots (no API call)
    const matchingUserSlots = userSlots.filter((slot) =>
      slot.title.toLowerCase().includes(query)
    );
    
    if (matchingUserSlots.length > 0) {
      setItems(matchingUserSlots);
      setOpen(true);
      setHighlight(0);
      return;
    }
    
    // Check client-side cache for instant results (exact match or partial match)
    // Try exact match first, then try partial matches (e.g., "buffalo" matches cache for "buffalo king")
    let cached: Suggestion[] | undefined = searchCacheRef.current.get(query);
    
    // If no exact match, try to find cached results that contain the query
    if (!cached) {
      // Check all cache entries to find ones that match the current query
      for (const [cachedQuery, cachedResults] of searchCacheRef.current.entries()) {
        // If the cached query contains the current query, use those results (filtered)
        if (cachedQuery.includes(query) && cachedQuery.length > query.length) {
          // Filter cached results to only show ones that match the current query
          const filtered = cachedResults.filter((item) =>
            item.title.toLowerCase().includes(query)
          );
          if (filtered.length > 0) {
            cached = filtered;
            break;
          }
        }
        // Also check if current query is a prefix of cached query (e.g., "buff" matches "buffalo")
        if (query.length >= 3 && cachedQuery.startsWith(query)) {
          const filtered = cachedResults.filter((item) =>
            item.title.toLowerCase().includes(query)
          );
          if (filtered.length > 0) {
            cached = filtered;
            break;
          }
        }
      }
    }
    
    if (cached) {
      // Filter cached results to ensure they match the current query
      const filtered = cached.filter((item) =>
        item.title.toLowerCase().includes(query)
      );
      if (filtered.length > 0) {
        setItems(filtered);
        setOpen(true);
        setHighlight(0);
        return;
      }
    }

    // COST OPTIMIZATION: Don't show empty state or call API automatically
    // User must explicitly press Enter or click search button to trigger API call
    // This prevents accidental API calls while typing
    // Cached results will show instantly if available, but API search is still available
    setItems([]);
    setOpen(false);
  }, [value, minChars, userSlots]);

  // Function to perform actual API search (called on Enter or search button)
  const performSearch = useCallback(async () => {
    if (!queryUrl) {
      setItems([]);
      setOpen(false);
      return;
    }

    const query = value.trim().toLowerCase();
    
    // Show cached results immediately for instant feedback while API loads
    const cached = searchCacheRef.current.get(query);
    if (cached) {
      // Filter to ensure cached results match the query
      const filtered = cached.filter((item) =>
        item.title.toLowerCase().includes(query)
      );
      if (filtered.length > 0) {
        setItems(filtered);
        setOpen(filtered.length > 0);
        setHighlight(0);
        // Show cached results immediately, but always proceed to API search below
      }
    }
    
    // Always make API call when user explicitly searches (Enter/button)
    // This ensures fresh/complete results even if cache exists
    // The cache is only for instant display while typing, not for blocking searches

    setLoading(true);
    try {
      // Get session for usage tracking
      const session = localStorage.getItem("huntmaster_session");
      
      // Always make external API call to get all matching games
      // The database check optimization was too aggressive - for search/autocomplete,
      // we want to show all matching games, not just the one in the database
      
      // Fallback to external API if not found in database
      const urlWithSession = session 
        ? `${queryUrl}&session=${encodeURIComponent(session)}`
        : queryUrl;
      
      const res = await fetch(urlWithSession, { cache: "no-store" });
      const data = await res.json();
      
      // Check for limit exceeded
      if (data.limitExceeded) {
        console.warn('SlotNameAutocomplete: API limit exceeded', {
          monthlySearches: data.monthlySearches,
          monthlyLimit: data.monthlyLimit,
          remaining: data.remaining
        });
        setItems([]);
        setOpen(false);
        // Could show a toast/alert here if you have a toast system
        alert(data.message || "Monthly API limit exceeded. Please upgrade your plan or wait for the next billing cycle.");
        return;
      }
      
      // Check for rate limiting
      if (data.rateLimited || data.warnings) {
        console.warn('SlotNameAutocomplete: API rate limited', {
          warnings: data.warnings,
          query: value
        });
      }
      
      const list: Suggestion[] = data?.data || [];
      
      // Deduplicate items by title (case-insensitive) to prevent duplicates
      const seen = new Map<string, Suggestion>();
      const deduplicated: Suggestion[] = [];
      for (const item of list) {
        const key = item.title.toLowerCase().trim();
        if (!seen.has(key)) {
          seen.set(key, item);
          deduplicated.push(item);
        }
      }
      
      // Cache the results
      searchCacheRef.current.set(query, deduplicated);
      
      setItems(deduplicated);
      setOpen(deduplicated.length > 0);
      setHighlight(0);
      lastSearchedRef.current = query;
      (window as any).lastSearchTime = Date.now(); // Track when we last searched
    } catch (error) {
      console.error('SlotNameAutocomplete: Error fetching suggestions', error);
      setItems([]);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }, [queryUrl, value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function selectItem(item: Suggestion) {
    // Mark that we just selected an item to prevent immediate re-search
    justSelectedRef.current = true;
    lastSelectedValueRef.current = item.title;
    
    onChange(item.title);
    onSelect?.(item);
    setOpen(false);
    setItems([]); // Clear items to prevent dropdown from reopening
    
    // Reset the flag after a short delay to allow normal searching again
    setTimeout(() => {
      justSelectedRef.current = false;
    }, 500);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      // If dropdown is open with items, select the highlighted item
      if (open && items.length > 0 && highlight >= 0) {
        selectItem(items[highlight]);
      } else {
        // Otherwise, perform search on Enter
        performSearch();
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (open && items.length > 0) {
      // Only handle arrow keys if dropdown is open
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlight((h) => Math.min(h + 1, items.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlight((h) => Math.max(h - 1, 0));
      }
    }
  }

  return (
    <div ref={containerRef} style={{ position: "relative" }} className="flex gap-1">
      <input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          // Only open if we have items and didn't just select
          if (items.length > 0 && !justSelectedRef.current) {
            setOpen(true);
          }
        }}
        onKeyDown={onKeyDown}
        className="flex-1 border rounded px-3 py-2 bg-background text-foreground"
      />
      <button
        type="button"
        onClick={performSearch}
        disabled={!value || value.trim().length < minChars || loading}
        className="px-3 py-2 border rounded bg-background text-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
        title="Search (or press Enter)"
      >
        {loading ? "..." : "🔍"}
      </button>
      {open && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50 }}>
          <div className="mt-1 max-h-64 overflow-auto rounded border bg-popover text-popover-foreground shadow">
            {loading && items.length === 0 && (
              <div className="px-3 py-2 text-sm text-muted-foreground">Searching…</div>
            )}
            {items.map((it, idx) => (
              <button
                key={it.id + "-" + it.slug}
                type="button"
                onClick={() => selectItem(it)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm ${idx === highlight ? "bg-accent" : ""}`}
              >
                {it.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.thumbnail} alt="thumb" width={28} height={28} className="rounded object-cover" />
                ) : (
                  <div className="w-7 h-7 rounded bg-muted" />
                )}
                <div className="flex-1">
                  <div className="font-medium leading-tight">{it.title}</div>
                  <div className="text-xs text-muted-foreground">{it.provider || ""}</div>
                </div>
              </button>
            ))}
            {!loading && items.length === 0 && (
              <div className="px-3 py-2 text-sm text-muted-foreground">No matches</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
