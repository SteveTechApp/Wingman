export type CompareRunHistoryEntry = {
  id: string;
  brand: string;
  sku: string;
  productUrl?: string;
  lookedUpAt: string;
  competitorUrl?: string;
  competitorLookupMode?: string;
  topMatchSku?: string;
  topMatchName?: string;
  confidence?: string;
  matchType?: string;
  readinessStatus?: string;
  summary?: string;
};

const HISTORY_KEY = "wm_compare_run_history_v1";
const HISTORY_LIMIT = 12;

function tidy(value: unknown): string {
  return String(value ?? "").trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeEntry(value: unknown): CompareRunHistoryEntry | null {
  if (!isRecord(value)) return null;

  const brand = tidy(value.brand);
  const sku = tidy(value.sku);
  const lookedUpAt = tidy(value.lookedUpAt);
  if (!brand || !sku || !lookedUpAt) return null;

  return {
    id: tidy(value.id) || `${brand.toLowerCase()}::${sku.toLowerCase()}::${lookedUpAt}`,
    brand,
    sku,
    productUrl: tidy(value.productUrl) || undefined,
    lookedUpAt,
    competitorUrl: tidy(value.competitorUrl) || undefined,
    competitorLookupMode: tidy(value.competitorLookupMode) || undefined,
    topMatchSku: tidy(value.topMatchSku) || undefined,
    topMatchName: tidy(value.topMatchName) || undefined,
    confidence: tidy(value.confidence) || undefined,
    matchType: tidy(value.matchType) || undefined,
    readinessStatus: tidy(value.readinessStatus) || undefined,
    summary: tidy(value.summary) || undefined,
  };
}

export function readCompareRunHistory(): CompareRunHistoryEntry[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown[];
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => normalizeEntry(item))
      .filter((item): item is CompareRunHistoryEntry => item !== null)
      .sort((left, right) => String(right.lookedUpAt).localeCompare(String(left.lookedUpAt)));
  } catch {
    return [];
  }
}

function writeCompareRunHistory(entries: CompareRunHistoryEntry[]): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, HISTORY_LIMIT)));
  } catch {
  }
}

export function appendCompareRunHistory(entry: CompareRunHistoryEntry): CompareRunHistoryEntry[] {
  const next = [
    entry,
    ...readCompareRunHistory().filter((item) => item.id !== entry.id),
  ].slice(0, HISTORY_LIMIT);

  writeCompareRunHistory(next);
  return next;
}

export function clearCompareRunHistory(): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(HISTORY_KEY);
  } catch {
  }
}
