// Client-side runtime error reporting.
//
// The backend has always exposed POST /api/wingman/telemetry, and nothing in
// the client ever called it. ErrorBoundary logged to console.error, which in a
// production browser goes nowhere - so a crash for a salesperson mid-proposal
// left no trace anyone could see.
//
// This module wires the two ends together. Design constraints, in order:
//
//  1. Telemetry must never make a bad situation worse. Every failure path is
//     swallowed; a reporting error must not surface to the user or recurse
//     back into the error handlers that triggered it.
//  2. The endpoint requires an authenticated session and returns 401 otherwise.
//     A signed-out user simply produces no telemetry - that is expected, not an
//     error worth retrying.
//  3. No customer or project content is sent. Only the error itself, the route
//     it happened on, and an optional project id for correlation.

const TELEMETRY_PATH = "/api/wingman/telemetry";

// A crash loop can fire the same handler hundreds of times. Cap what we send so
// a broken render loop cannot flood the backend or the user's network.
const MAX_EVENTS_PER_SESSION = 25;
const DUPLICATE_WINDOW_MS = 10_000;

let sentCount = 0;
let installed = false;
const recentSignatures = new Map<string, number>();

export type RuntimeTelemetryKind = "error" | "unhandledrejection" | "info";

export type RuntimeTelemetryEvent = {
  kind: RuntimeTelemetryKind;
  message: string;
  stack?: string;
  source?: string;
  line?: number;
  column?: number;
  route?: string;
  projectId?: string;
  handled?: boolean;
};

function isDuplicate(signature: string, now: number) {
  const previous = recentSignatures.get(signature);
  if (previous !== undefined && now - previous < DUPLICATE_WINDOW_MS) return true;

  recentSignatures.set(signature, now);
  // Keep the map small; this only ever holds recent signatures.
  if (recentSignatures.size > 50) {
    for (const [key, seenAt] of recentSignatures) {
      if (now - seenAt >= DUPLICATE_WINDOW_MS) recentSignatures.delete(key);
    }
  }
  return false;
}

export function reportRuntimeEvent(event: RuntimeTelemetryEvent): void {
  try {
    if (typeof window === "undefined" || typeof fetch !== "function") return;
    if (sentCount >= MAX_EVENTS_PER_SESSION) return;

    const now = Date.now();
    const signature = `${event.kind}:${event.message}:${event.line ?? ""}:${event.column ?? ""}`;
    if (isDuplicate(signature, now)) return;

    sentCount += 1;

    const payload = {
      ...event,
      route: event.route ?? window.location?.pathname ?? undefined,
      timestamp: new Date(now).toISOString(),
    };

    // Deliberately not awaited: reporting is best-effort and must not block or
    // delay whatever the app is doing while recovering from the error.
    void fetch(TELEMETRY_PATH, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      // Swallowed on purpose. A telemetry failure (offline, signed out, backend
      // down) is not something to surface or retry - retrying during an outage
      // is exactly when it would do the most harm.
    });
  } catch {
    // Never let the reporter throw into its caller.
  }
}

// Installs global handlers for errors that escape React's ErrorBoundary -
// async failures, event-handler throws, and rejected promises.
export function installRuntimeTelemetry(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;

  window.addEventListener("error", (event) => {
    reportRuntimeEvent({
      kind: "error",
      message: event.message || "Uncaught error",
      stack: event.error instanceof Error ? event.error.stack : undefined,
      source: event.filename || undefined,
      line: Number.isFinite(event.lineno) ? event.lineno : undefined,
      column: Number.isFinite(event.colno) ? event.colno : undefined,
      handled: false,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    reportRuntimeEvent({
      kind: "unhandledrejection",
      message: reason instanceof Error ? reason.message : String(reason ?? "Unhandled promise rejection"),
      stack: reason instanceof Error ? reason.stack : undefined,
      handled: false,
    });
  });
}

// Test seam: resets the per-session caps so each test starts clean.
export function resetRuntimeTelemetryForTests(): void {
  sentCount = 0;
  installed = false;
  recentSignatures.clear();
}
