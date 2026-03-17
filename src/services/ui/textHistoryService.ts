export const TEXT_HISTORY_MAX = 8;

const STORAGE_PREFIX = "wm_text_history_v1";

export const RECENT_TEXT_HISTORY_KEYS = {
  customer: "customer",
  site: "site",
  roomName: "roomName",
  manufacturer: "manufacturer",
  competitorModel: "competitorModel",
  projectName: "projectName",
  contactName: "contactName",
  consultant: "consultant",
  integrator: "integrator",
} as const;

export type TextHistoryKey =
  | (typeof RECENT_TEXT_HISTORY_KEYS)[keyof typeof RECENT_TEXT_HISTORY_KEYS]
  | string;

function storageKey(key: TextHistoryKey): string {
  return `${STORAGE_PREFIX}:${key}`;
}

function normalise(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function getRecentTextEntries(key: TextHistoryKey): string[] {
  try {
    const raw = localStorage.getItem(storageKey(key));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

export function saveRecentTextEntry(key: TextHistoryKey, value: string, maxItems = TEXT_HISTORY_MAX): string[] {
  const clean = normalise(value);
  if (!clean) {
    return getRecentTextEntries(key);
  }

  const existing = getRecentTextEntries(key);
  const next = [clean, ...existing.filter((item) => item.toLowerCase() !== clean.toLowerCase())].slice(0, maxItems);

  try {
    localStorage.setItem(storageKey(key), JSON.stringify(next));
  } catch {
    return existing;
  }

  return next;
}

export function clearRecentTextEntries(key: TextHistoryKey): void {
  try {
    localStorage.removeItem(storageKey(key));
  } catch {
  }
}

export function subscribeRecentTextEntries(
  key: TextHistoryKey,
  callback: () => void
): () => void {
  const handler = (event: StorageEvent) => {
    if (event.key === storageKey(key)) {
      callback();
    }
  };

  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}