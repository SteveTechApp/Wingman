const ANALYTICS_STORAGE_KEY = "wingman:analytics-events";
const MAX_EVENTS = 1000;
const RETENTION_DAYS = 90;

export type StoredFeatureEvent = {
  kind: string;
  feature: string;
  timestamp: string;
  metadata?: Record<string, string | number | boolean>;
};

export function getStoredFeatureEvents(): StoredFeatureEvent[] {
  try {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(ANALYTICS_STORAGE_KEY);
    return raw ? JSON.parse(raw) as StoredFeatureEvent[] : [];
  } catch {
    return [];
  }
}

export function trackFeatureUsage(
  kind: string,
  feature: string,
  metadata?: Record<string, string | number | boolean>,
): void {
  try {
    if (typeof window === "undefined") return;
    const events = getStoredFeatureEvents();
    events.push({ kind, feature, timestamp: new Date().toISOString(), metadata });
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
    localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(events.filter((event) => event.timestamp > cutoff).slice(-MAX_EVENTS)));
  } catch {
    // Storage may be full or unavailable; activity tracking must not interrupt work.
  }
}

export function clearStoredFeatureEvents(): void {
  try {
    if (typeof window !== "undefined") localStorage.removeItem(ANALYTICS_STORAGE_KEY);
  } catch {
    // Storage may be unavailable.
  }
}
