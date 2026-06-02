export type GameSearchSource = "game_reviews" | "slotslaunch"

export interface GameSearchResult {
  id: number | string
  slug: string
  title: string
  provider?: string
  thumbnail?: string | null
  maxWin?: string
  volatility?: string
  releaseDate?: string
  source: GameSearchSource
}

/** `game_reviews` uses `developer` for studio name (no `provider` column in DB). */
export const GAME_REVIEWS_SELECT =
  "id, slug, title, developer, thumbnail_url, banner_url, max_win, volatility, release_date, features"

export const SLOTSLAUNCH_SELECT =
  "id, slug, name, provider, provider_slug, thumbnail_url, banner_url, max_win, volatility, release_date"

/** Shared title normalization for search, dedupe, and widget matching. */
export function normalizeGameTitle(str: string): string {
  return (str || "")
    .toLowerCase()
    .trim()
    .replace(/[™®©]/g, "")
    .replace(/&/g, " and ")
    .replace(/\band\b/g, " and ")
    .replace(/[-–—]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function gameReviewProvider(row: Record<string, unknown>): string | undefined {
  const dev = row.developer ? String(row.developer).trim() : ""
  const prov = row.provider ? String(row.provider).trim() : ""
  return dev || prov || undefined
}

const INVALID_PROVIDER_TOKENS = new Set([
  "",
  "-",
  "—",
  "n/a",
  "na",
  "unknown",
  "null",
  "undefined",
  "none",
  "not detected",
  "detecting...",
  "detecting",
]);

/**
 * Provider is optional — many casinos only expose the game name.
 * Returns undefined when missing or not a real studio label.
 */
export function sanitizeProviderFilter(provider?: string | null): string | undefined {
  if (provider == null) return undefined;
  const trimmed = provider.trim();
  if (!trimmed) return undefined;
  const lower = trimmed.toLowerCase();
  if (INVALID_PROVIDER_TOKENS.has(lower)) return undefined;
  if (lower.length < 2) return undefined;
  return trimmed;
}

/** Loose provider match (Pragmatic ↔ Pragmatic Play). Only used when a provider hint exists. */
export function providerMatches(
  itemProvider: string | undefined,
  filter: string | undefined,
): boolean {
  if (!filter?.trim()) return true
  if (!itemProvider?.trim()) return true
  const a = normalizeGameTitle(itemProvider)
  const b = normalizeGameTitle(filter)
  return a.includes(b) || b.includes(a)
}

export function filterExactTitleMatches<T extends { title?: string }>(
  items: T[],
  query: string,
): T[] {
  const normalizedQuery = normalizeGameTitle(query)
  return items.filter(
    (item) => item.title && normalizeGameTitle(item.title) === normalizedQuery,
  )
}

export function preferProviderMatch<T extends { provider?: string }>(
  items: T[],
  providerFilter: string | undefined,
): T[] {
  const filter = sanitizeProviderFilter(providerFilter);
  if (!filter || items.length <= 1) return items;
  const matched = items.filter((item) => providerMatches(item.provider, filter));
  return matched.length > 0 ? matched : items;
}

export function dedupeKeyByTitle(item: { title?: string }): string {
  return normalizeGameTitle(item.title || "")
}

export function mapGameReviewRow(g: Record<string, unknown>): GameSearchResult {
  const technicalSpecs = (g.features as Record<string, unknown> | undefined)?.technical_specs as
    | Record<string, unknown>
    | undefined
  const maxWinVal = g.max_win ?? technicalSpecs?.max_win
  const volatilityVal = g.volatility ?? technicalSpecs?.volatility

  const title = String(g.title ?? "")
  return {
    id: g.id as number | string,
    slug: String(g.slug || title.toLowerCase().replace(/\s+/g, "-") || g.id),
    title,
    provider: gameReviewProvider(g),
    thumbnail: (g.thumbnail_url || g.banner_url || null) as string | null,
    maxWin: maxWinVal != null && String(maxWinVal).trim() !== "" ? String(maxWinVal).trim() : undefined,
    volatility:
      volatilityVal != null && String(volatilityVal).trim() !== "" ? String(volatilityVal).trim() : undefined,
    releaseDate:
      g.release_date != null && String(g.release_date).trim() !== "" ? String(g.release_date).trim() : undefined,
    source: "game_reviews",
  }
}

export function mapSlotsLaunchRow(g: Record<string, unknown>): GameSearchResult {
  const name = String(g.name ?? "")
  const maxWinVal = g.max_win
  return {
    id: Number(g.id) || (g.id as string),
    slug: String(g.slug || name.toLowerCase().replace(/\s+/g, "-") || g.id),
    title: name,
    provider: g.provider ? String(g.provider) : g.provider_slug ? String(g.provider_slug) : undefined,
    thumbnail: (g.thumbnail_url || g.banner_url || null) as string | null,
    maxWin: maxWinVal != null && String(maxWinVal).trim() !== "" ? String(maxWinVal).trim() : undefined,
    volatility:
      g.volatility != null && String(g.volatility).trim() !== "" ? String(g.volatility).trim() : undefined,
    releaseDate:
      g.release_date != null && String(g.release_date).trim() !== "" ? String(g.release_date).trim() : undefined,
    source: "slotslaunch",
  }
}

/** Prefer game_reviews when the same title exists in both tables (e.g. provider string differs). */
export function mergeGameSearchResults(
  reviewItems: GameSearchResult[],
  slotsLaunchItems: GameSearchResult[],
): GameSearchResult[] {
  const seen = new Map<string, GameSearchResult>()

  for (const item of reviewItems) {
    const key = dedupeKeyByTitle(item)
    if (!key) continue
    seen.set(key, { ...item, source: "game_reviews" })
  }

  for (const item of slotsLaunchItems) {
    const key = dedupeKeyByTitle(item)
    if (!key) continue
    const existing = seen.get(key)
    if (!existing) {
      seen.set(key, { ...item, source: "slotslaunch" })
      continue
    }
    if (existing.source === "game_reviews") {
      if (!existing.thumbnail && item.thumbnail) existing.thumbnail = item.thumbnail
      if (!existing.maxWin && item.maxWin) existing.maxWin = item.maxWin
      if (!existing.volatility && item.volatility) existing.volatility = item.volatility
      if (!existing.releaseDate && item.releaseDate) existing.releaseDate = item.releaseDate
      if (!existing.provider && item.provider) existing.provider = item.provider
    }
  }

  return Array.from(seen.values())
}

export function rankGameSearchResults(items: GameSearchResult[], query: string): GameSearchResult[] {
  const normalizedQuery = normalizeGameTitle(query)

  const score = (normalizedTitle: string) => {
    if (normalizedTitle === normalizedQuery) return 0
    if (normalizedTitle.startsWith(normalizedQuery)) return 1
    if (normalizedTitle.includes(normalizedQuery)) return 2
    return 3
  }

  return [...items].sort((a, b) => {
    const sa = score(normalizeGameTitle(a.title))
    const sb = score(normalizeGameTitle(b.title))
    if (sa !== sb) return sa - sb
    if (a.source === "game_reviews" && b.source !== "game_reviews") return -1
    if (b.source === "game_reviews" && a.source !== "game_reviews") return 1
    return 0
  })
}

export function hasExactTitleMatch(items: { title?: string }[], query: string): boolean {
  const normalizedQuery = normalizeGameTitle(query)
  return items.some((item) => item.title && normalizeGameTitle(item.title) === normalizedQuery)
}

/**
 * Widget helper: match by game title only; provider is an optional tie-breaker.
 * Always prefers game_reviews over slotslaunch for the same title.
 */
export function pickExactGameMatch<T extends { title?: string; source?: string; provider?: string }>(
  items: T[],
  targetTitle: string,
  providerFilter?: string,
): T | undefined {
  let matches = filterExactTitleMatches(items, targetTitle);
  matches = preferProviderMatch(matches, providerFilter);
  return matches.find((item) => item.source === "game_reviews") ?? matches[0];
}

export function prependUniqueByTitle(
  prioritized: GameSearchResult[],
  others: GameSearchResult[],
): GameSearchResult[] {
  const seen = new Set<string>()
  const merged: GameSearchResult[] = []
  for (const item of [...prioritized, ...others]) {
    const key = dedupeKeyByTitle(item)
    if (!key || seen.has(key)) continue
    seen.add(key)
    merged.push(item)
  }
  return merged
}
