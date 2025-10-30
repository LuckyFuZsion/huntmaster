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

  const queryUrl = useMemo(() => {
    if (!value || value.trim().length < minChars) return null;
    const p = new URLSearchParams({ q: value.trim(), limit: "8" });
    return `/api/slots-suggest?${p.toString()}`;
  }, [value, minChars]);

  useEffect(() => {
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
        const list: Suggestion[] = data?.data || [];
        setItems(list);
        setOpen(list.length > 0);
        setHighlight(0);
      } catch {
        if (!cancelled) {
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
  }, [queryUrl]);

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
    onChange(item.title);
    onSelect?.(item);
    setOpen(false);
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
        onFocus={() => items.length > 0 && setOpen(true)}
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
