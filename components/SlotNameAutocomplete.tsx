"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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

  const queryUrl = useMemo(() => {
    if (!value || value.trim().length < minChars) return null;
    const p = new URLSearchParams({ q: value.trim(), limit: "8" });
    return `/api/slots-suggest?${p.toString()}`;
  }, [value, minChars]);

  useEffect(() => {
    // Don't search if we just selected an item and the value matches the selection
    if (justSelectedRef.current && value === lastSelectedValueRef.current) {
      justSelectedRef.current = false; // Reset flag after one skip
      setOpen(false); // Keep dropdown closed
      return;
    }

    let cancelled = false;
    const handler = setTimeout(async () => {
      if (!queryUrl) {
        setItems([]);
        setOpen(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(queryUrl, { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        
        // Check for rate limiting
        if (data.rateLimited || data.warnings) {
          console.warn('SlotNameAutocomplete: API rate limited', {
            warnings: data.warnings,
            query: value
          });
          // Still try to show any partial results we got
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
        
        setItems(deduplicated);
        // Only open dropdown if user is actively typing (not after selection)
        if (!justSelectedRef.current) {
          setOpen(deduplicated.length > 0);
        }
        setHighlight(0);
      } catch (error) {
        if (!cancelled) {
          console.error('SlotNameAutocomplete: Error fetching suggestions', error);
          setItems([]);
          setOpen(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 200); // debounce

    return () => {
      cancelled = true;
      clearTimeout(handler);
    };
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
    if (!open || items.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      selectItem(items[highlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
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
        className="w-full border rounded px-3 py-2 bg-background text-foreground"
      />
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
