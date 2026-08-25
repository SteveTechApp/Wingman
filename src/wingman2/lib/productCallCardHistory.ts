// localStorage-backed tracking for recently viewed and frequently used
// product call cards. Keeps the last 8 recently viewed and top 8 frequently
// used SKUs so returning users can pick up where they left off.

const RECENTLY_VIEWED_KEY = "wingman.pcc.recentlyViewed";
const FREQUENTLY_USED_KEY = "wingman.pcc.frequentlyUsed";

const MAX_RECENT = 8;
const MAX_FREQUENT = 8;

function safeGet(key: string): string[] {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
}

function safeSet(key: string, value: string[]): void {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage may be unavailable.
  }
}

/** Record a product view. Moves the SKU to the front of the recently-viewed list. */
export function recordProductView(sku: string): void {
  if (!sku) return;
  const recent = safeGet(RECENTLY_VIEWED_KEY).filter((s) => s !== sku);
  recent.unshift(sku);
  safeSet(RECENTLY_VIEWED_KEY, recent.slice(0, MAX_RECENT));
}

/** Record a product being added to a proposal. Increments its frequency count. */
export function recordProductUse(sku: string): void {
  if (!sku) return;
  const raw = safeGet(FREQUENTLY_USED_KEY);
  const entries: Array<{ sku: string; count: number }> = [];

  // Parse existing entries — format is ["SKU:count", ...]
  for (const item of raw) {
    const colonIndex = item.indexOf(":");
    if (colonIndex > 0) {
      entries.push({ sku: item.slice(0, colonIndex), count: Number(item.slice(colonIndex + 1)) || 1 });
    } else {
      entries.push({ sku: item, count: 1 });
    }
  }

  const existing = entries.find((e) => e.sku === sku);
  if (existing) {
    existing.count += 1;
  } else {
    entries.push({ sku, count: 1 });
  }

  // Sort by count descending, take top N
  entries.sort((a, b) => b.count - a.count);
  const serialised = entries.slice(0, MAX_FREQUENT).map((e) => `${e.sku}:${e.count}`);
  safeSet(FREQUENTLY_USED_KEY, serialised);
}

/** Get recently viewed SKUs (most recent first). */
export function getRecentlyViewed(): string[] {
  return safeGet(RECENTLY_VIEWED_KEY);
}

/** Get frequently used SKUs (most used first). */
export function getFrequentlyUsed(): string[] {
  return safeGet(FREQUENTLY_USED_KEY)
    .map((item) => {
      const colonIndex = item.indexOf(":");
      return colonIndex > 0 ? item.slice(0, colonIndex) : item;
    });
}
