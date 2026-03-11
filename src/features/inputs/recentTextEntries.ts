export const RECENT_TEXT_HISTORY_KEYS = {
  customer: "customer",
  site: "site",
  roomName: "room-name",
  roomType: "room-type",
  application: "application",
} as const;

const STORAGE_PREFIX = "wm_recent_text_entries_v1";
const ENTRY_LIMIT = 5;

function getStorage(): Storage | null {
  try {
    return typeof globalThis !== "undefined" && "localStorage" in globalThis
      ? globalThis.localStorage
      : null;
  } catch {
    return null;
  }
}

function storageKey(historyKey: string): string {
  return `${STORAGE_PREFIX}:${historyKey}`;
}

function normalizeEntry(value: string): string {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function sanitizeEntries(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const entries: string[] = [];

  for (const item of value) {
    const normalized = normalizeEntry(String(item ?? ""));
    if (!normalized) continue;
    const dedupeKey = normalized.toLowerCase();
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    entries.push(normalized);
    if (entries.length >= ENTRY_LIMIT) break;
  }

  return entries;
}

export function getRecentTextEntries(historyKey: string): string[] {
  const storage = getStorage();
  if (!storage) return [];

  try {
    const raw = storage.getItem(storageKey(historyKey));
    if (!raw) return [];
    return sanitizeEntries(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function rememberRecentTextEntry(historyKey: string, value: string): string[] {
  const storage = getStorage();
  const normalized = normalizeEntry(value);
  const existing = getRecentTextEntries(historyKey);

  if (!normalized) return existing;

  const next = [
    normalized,
    ...existing.filter((item) => item.toLowerCase() !== normalized.toLowerCase()),
  ].slice(0, ENTRY_LIMIT);

  if (!storage) return next;

  try {
    storage.setItem(storageKey(historyKey), JSON.stringify(next));
  } catch {
  }

  return next;
}
