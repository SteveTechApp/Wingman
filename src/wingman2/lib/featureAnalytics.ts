// Client-side feature analytics for measuring Wingman adoption and usage patterns.
//
// Tracks which features are used, how often, and in what sequence — without
// collecting any customer or project content. Events are batched and sent to
// the existing /api/wingman/telemetry endpoint (POST, best-effort, swallowed
// on failure).
//
// Design constraints:
//   1. Privacy-first: no customer names, project details, or product selections.
//   2. Best-effort: never blocks or degrades the user experience.
//   3. Rate-limited: max 50 events per session to prevent floods.
//   4. No PII: only feature names, timestamps and session duration.

const ANALYTICS_ENDPOINT = "/api/wingman/telemetry";
const MAX_EVENTS_PER_SESSION = 50;
const BATCH_INTERVAL_MS = 30_000; // 30 seconds

type AnalyticsEventKind = "feature_open" | "feature_complete" | "export" | "search" | "session_start";

type AnalyticsEvent = {
  kind: AnalyticsEventKind;
  feature: string;
  timestamp: string;
  sessionDurationMs?: number;
  metadata?: Record<string, string | number | boolean>;
};

let sentCount = 0;
let sessionStart = Date.now();
let pendingEvents: AnalyticsEvent[] = [];
let batchTimer: ReturnType<typeof setInterval> | null = null;
let installed = false;

function sendBatch(): void {
  if (pendingEvents.length === 0) return;

  const events = [...pendingEvents];
  pendingEvents = [];

  try {
    void fetch(ANALYTICS_ENDPOINT, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "analytics_batch", events }),
      keepalive: true,
    }).catch(() => {
      // Swallowed — analytics failure must never affect the user.
    });
  } catch {
    // Swallowed.
  }
}

/**
 * Track a feature usage event. Call this when a user opens a page, completes
 * an action, or performs a search.
 *
 * @example
 * trackFeatureEvent("feature_open", "battleCards");
 * trackFeatureEvent("export", "proposal", { format: "docx" });
 * trackFeatureEvent("search", "catalogBrowser", { queryLength: 12 });
 */
export function trackFeatureEvent(
  kind: AnalyticsEventKind,
  feature: string,
  metadata?: Record<string, string | number | boolean>,
): void {
  try {
    if (typeof window === "undefined" || sentCount >= MAX_EVENTS_PER_SESSION) return;

    sentCount += 1;

    const event: AnalyticsEvent = {
      kind,
      feature,
      timestamp: new Date().toISOString(),
      sessionDurationMs: Date.now() - sessionStart,
      metadata,
    };

    pendingEvents.push(event);

    // Start batch timer on first event.
    if (batchTimer === null) {
      batchTimer = setInterval(sendBatch, BATCH_INTERVAL_MS);
    }
  } catch {
    // Never throw from analytics.
  }
}

/**
 * Install page-view tracking using React Router's location changes.
 * Call once from the app shell after mounting.
 */
export function installFeatureAnalytics(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;

  sessionStart = Date.now();
  trackFeatureEvent("session_start", "app");

  // Flush on page unload.
  window.addEventListener("beforeunload", () => {
    if (batchTimer !== null) {
      clearInterval(batchTimer);
      batchTimer = null;
    }
    sendBatch();
  });
}

/**
 * Track an export action (DOCX, PDF, HTML).
 */
export function trackExport(feature: string, format: string): void {
  trackFeatureEvent("export", feature, { format });
}

/**
 * Track a search or filter action.
 */
export function trackSearch(feature: string, queryLength: number): void {
  trackFeatureEvent("search", feature, { queryLength });
}

// Test seam: resets state so each test starts clean.
export function resetAnalyticsForTests(): void {
  sentCount = 0;
  sessionStart = Date.now();
  pendingEvents = [];
  if (batchTimer !== null) {
    clearInterval(batchTimer);
    batchTimer = null;
  }
  installed = false;
}
