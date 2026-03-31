import type { CompetitorLiveRecord, CompetitorLookupInput } from "./competitorLiveTypes";

const CACHE_KEY = "wm_competitor_live_cache_v1";

function normalise(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function makeKey(input: CompetitorLookupInput): string {
  return `${normalise(input.manufacturer)}::${normalise(input.model)}`;
}

function readCacheMap(): Record<string, CompetitorLiveRecord> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, CompetitorLiveRecord>;
    return parsed ?? {};
  } catch {
    return {};
  }
}

function writeCacheMap(data: Record<string, CompetitorLiveRecord>) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(data));
}

export function readCompetitorLiveCache(input: CompetitorLookupInput): CompetitorLiveRecord | null {
  const cache = readCacheMap();
  return cache[makeKey(input)] ?? null;
}

export function upsertCompetitorLiveCache(record: CompetitorLiveRecord): void {
  const cache = readCacheMap();
  cache[makeKey({ manufacturer: record.manufacturer, model: record.model })] = record;
  writeCacheMap(cache);
}