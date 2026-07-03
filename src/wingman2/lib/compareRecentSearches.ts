const STORAGE_KEY = "wingman-compare-recent-searches-v1";
const MAX_RECENT_SEARCHES = 8;

function hasWindow(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readRecentCompareSearches(): string[] {
  if (!hasWindow()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((value): value is string => typeof value === "string" && value.trim().length > 0);
  } catch {
    return [];
  }
}

/** Records a search, most-recent-first, deduped case-insensitively, capped at MAX_RECENT_SEARCHES. */
export function recordRecentCompareSearch(query: string): string[] {
  const trimmed = query.trim();
  if (!trimmed) {
    return readRecentCompareSearches();
  }

  const existing = readRecentCompareSearches();
  const deduped = existing.filter((value) => value.toLowerCase() !== trimmed.toLowerCase());
  const next = [trimmed, ...deduped].slice(0, MAX_RECENT_SEARCHES);

  if (hasWindow()) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage may be unavailable (private browsing, quota) - the caller still
      // gets the updated in-memory list for this render.
    }
  }

  return next;
}

export function clearRecentCompareSearches(): string[] {
  if (hasWindow()) {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  return [];
}
