/**
 * Stateless double-submit CSRF protection.
 *
 * Design:
 *  - GET /api/csrf issues a random token in a readable (non-HttpOnly) cookie
 *    `wingman_csrf` and also returns it in the JSON body.
 *  - The browser client echoes that token in the `X-CSRF-Token` header on every
 *    state-changing request. The server checks the header equals the cookie.
 *  - This is defence-in-depth on top of the SameSite=Strict session cookie,
 *    which already blocks cross-site cookie use in production.
 *
 * SAFETY: enforcement is OFF unless `WINGMAN_CSRF_ENFORCE=true`. With it off,
 * `enforceCsrf` always returns true (no behaviour change) — so this can ship
 * dark and be enabled only after the client is wired and the soap-test passes.
 */

import crypto from "node:crypto";

const COOKIE_NAME = "wingman_csrf";
const HEADER_NAME = "x-csrf-token"; // Node lower-cases request header names
const TOKEN_TTL_SECONDS = Number(process.env.WINGMAN_CSRF_TTL_SECONDS || 12 * 60 * 60);

const COOKIE_SECURE = !["0", "false", "off", "no"].includes(
  String(
    process.env.WINGMAN_SESSION_COOKIE_SECURE ??
      (process.env.NODE_ENV === "production" ? "true" : "false"),
  ).toLowerCase(),
);

const COOKIE_SAMESITE = (() => {
  const value = String(
    process.env.WINGMAN_SESSION_COOKIE_SAMESITE ??
      (process.env.NODE_ENV === "production" ? "Strict" : "Lax"),
  ).trim();
  return ["Strict", "Lax", "None"].includes(value) ? value : "Lax";
})();

/** Whether CSRF checks are actively enforced. Default: false. */
export const CSRF_ENFORCE =
  String(process.env.WINGMAN_CSRF_ENFORCE || "").toLowerCase() === "true";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Paths exempt from CSRF (token bootstrap + unauthenticated auth entry points). */
const EXEMPT_PATHS = new Set([
  "/api/csrf",
  "/api/wingman/auth/login",
  "/api/wingman/auth/signup",
]);

export function mintCsrfToken() {
  return crypto.randomBytes(32).toString("hex");
}

function readCookie(req, name) {
  const header = typeof req?.headers?.cookie === "string" ? req.headers.cookie : "";
  if (!header) return "";

  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    if (part.slice(0, index).trim() === name) {
      return part.slice(index + 1).trim();
    }
  }
  return "";
}

export function buildCsrfCookie(token) {
  const parts = [
    `${COOKIE_NAME}=${token}`,
    "Path=/",
    `Max-Age=${TOKEN_TTL_SECONDS}`,
    `SameSite=${COOKIE_SAMESITE}`,
  ];
  if (COOKIE_SECURE) parts.push("Secure");
  // Intentionally NOT HttpOnly: the SPA must read it to echo in the header.
  return parts.join("; ");
}

function tokensMatch(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length === 0 || a.length !== b.length) {
    return false;
  }
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

/** GET /api/csrf — issue a token cookie and return it in the body. */
export function issueCsrf(req, res, sendJson) {
  const token = mintCsrfToken();
  res.setHeader("Set-Cookie", buildCsrfCookie(token));
  sendJson(res, 200, { ok: true, token, header: "X-CSRF-Token" });
}

/**
 * Guard for state-changing requests. Returns true if the request may proceed;
 * if it returns false it has already sent a 403 response.
 */
export function enforceCsrf(req, res, url, sendJson) {
  if (!CSRF_ENFORCE) return true;

  const method = String(req?.method || "GET").toUpperCase();
  if (!MUTATING_METHODS.has(method)) return true;
  if (url && EXEMPT_PATHS.has(url.pathname)) return true;

  const cookieToken = readCookie(req, COOKIE_NAME);
  const headerToken = req?.headers?.[HEADER_NAME];
  const headerValue = Array.isArray(headerToken) ? headerToken[0] : headerToken;

  if (tokensMatch(cookieToken, headerValue)) return true;

  sendJson(res, 403, {
    ok: false,
    error: "Invalid or missing CSRF token. Fetch /api/csrf and send the value in the X-CSRF-Token header.",
  });
  return false;
}
