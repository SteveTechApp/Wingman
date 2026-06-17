/**
 * Client-side CSRF wiring.
 *
 * Installs a thin wrapper around window.fetch that attaches the `X-CSRF-Token`
 * header to state-changing requests aimed at the Wingman API (`/api/*`). The
 * token is fetched once from `GET /api/csrf` and cached (the server also sets a
 * readable `wingman_csrf` cookie used as a fallback).
 *
 * This is safe to ship even when the server guard is disabled
 * (`WINGMAN_CSRF_ENFORCE` unset): the extra header is simply ignored. Once the
 * server flag is enabled, mutating calls will already carry a valid token.
 *
 * Call installCsrfFetch() once at app startup (see main.tsx).
 */

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const HEADER_NAME = "X-CSRF-Token";

let cachedToken = "";
let inflight: Promise<string> | null = null;

function readCsrfCookie(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|;\s*)wingman_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

async function ensureToken(rawFetch: typeof fetch): Promise<string> {
  if (cachedToken) return cachedToken;

  const fromCookie = readCsrfCookie();
  if (fromCookie) {
    cachedToken = fromCookie;
    return cachedToken;
  }

  if (!inflight) {
    inflight = rawFetch("/api/csrf", { credentials: "include", cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { token?: string } | null) => {
        cachedToken = (data && typeof data.token === "string" ? data.token : "") || readCsrfCookie();
        return cachedToken;
      })
      .catch(() => {
        cachedToken = readCsrfCookie();
        return cachedToken;
      })
      .finally(() => {
        inflight = null;
      });
  }

  return inflight;
}

function describeRequest(
  input: RequestInfo | URL,
  init?: RequestInit,
): { method: string; isApi: boolean } {
  const method = String(
    init?.method ?? (input instanceof Request ? input.method : "GET"),
  ).toUpperCase();

  let raw: string;
  if (typeof input === "string") {
    raw = input;
  } else if (input instanceof URL) {
    raw = input.href;
  } else {
    raw = input.url;
  }

  let isApi = false;
  try {
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost";
    isApi = new URL(raw, origin).pathname.startsWith("/api/");
  } catch {
    isApi = false;
  }

  return { method, isApi };
}

/** Reset the cached token (e.g. after logout). The next request re-fetches it. */
export function resetCsrfToken(): void {
  cachedToken = "";
}

export function installCsrfFetch(): void {
  if (typeof window === "undefined" || typeof window.fetch !== "function") {
    return;
  }

  const flagged = window as unknown as { __wingmanCsrfFetchInstalled?: boolean };
  if (flagged.__wingmanCsrfFetchInstalled) {
    return;
  }
  flagged.__wingmanCsrfFetchInstalled = true;

  const rawFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    try {
      const { method, isApi } = describeRequest(input, init);

      if (isApi && MUTATING_METHODS.has(method)) {
        const token = await ensureToken(rawFetch);
        if (token) {
          const headers = new Headers(
            init?.headers ?? (input instanceof Request ? input.headers : undefined),
          );
          if (!headers.has(HEADER_NAME)) {
            headers.set(HEADER_NAME, token);
          }
          init = { ...init, headers, credentials: init?.credentials ?? "include" };
        }
      }
    } catch {
      // Never block a request because of CSRF wiring.
    }

    return rawFetch(input as RequestInfo, init);
  };
}
