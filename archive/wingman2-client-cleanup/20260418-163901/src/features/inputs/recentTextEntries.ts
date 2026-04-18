export const RECENT_TEXT_HISTORY_KEYS = {
  customer: "customer",
  site: "site",
  roomName: "room-name",
  roomType: "room-type",
  application: "application",
} as const;

export const RECENT_TEXT_HISTORY_SCOPES = {
  discoveryPage: "discovery-page",
  discoveryWizard: "discovery-wizard",
  importIntake: "import-intake",
  projectNew: "project-new",
} as const;

const STORAGE_PREFIX = "wm_recent_text_entries_v1";
const ENTRY_LIMIT = 5;

type RecentTextHistoryOptions = {
  scope?: string;
  limit?: number;
};

function getStorage(): Storage | null {
  try {
    return typeof globalThis !== "undefined" && "localStorage" in globalThis
      ? globalThis.localStorage
      : null;
  } catch {
    return null;
  }
}

function normalizeScope(scope?: string): string {
  return String(scope ?? "").trim().toLowerCase().replace(/\s+/g, "-");
}

function resolveLimit(limit?: number): number {
  return Number.isFinite(limit) && Number(limit) > 0
    ? Math.max(1, Math.trunc(Number(limit)))
    : ENTRY_LIMIT;
}

function storageKey(historyKey: string, scope?: string): string {
  const normalizedScope = normalizeScope(scope);
  return normalizedScope
    ? `${STORAGE_PREFIX}:${normalizedScope}:${historyKey}`
    : `${STORAGE_PREFIX}:${historyKey}`;
}

function normalizeEntry(value: string): string {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function sanitizeEntries(value: unknown, limit = ENTRY_LIMIT): string[] {
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
    if (entries.length >= limit) break;
  }

  return entries;
}

export function getRecentTextEntries(historyKey: string, options?: RecentTextHistoryOptions): string[] {
  const storage = getStorage();
  if (!storage) return [];

  try {
    const raw = storage.getItem(storageKey(historyKey, options?.scope));
    if (!raw) return [];
    return sanitizeEntries(JSON.parse(raw), resolveLimit(options?.limit));
  } catch {
    return [];
  }
}

export function rememberRecentTextEntry(
  historyKey: string,
  value: string,
  options?: RecentTextHistoryOptions,
): string[] {
  const storage = getStorage();
  const normalized = normalizeEntry(value);
  const limit = resolveLimit(options?.limit);
  const existing = getRecentTextEntries(historyKey, options);

  if (!normalized) return existing;

  const next = [
    normalized,
    ...existing.filter((item) => item.toLowerCase() !== normalized.toLowerCase()),
  ].slice(0, limit);

  if (!storage) return next;

  try {
    storage.setItem(storageKey(historyKey, options?.scope), JSON.stringify(next));
  } catch {
  }

  return next;
}
