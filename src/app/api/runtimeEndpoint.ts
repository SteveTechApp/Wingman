function tidy(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeEndpoint(value: unknown): string {
  return tidy(value).replace(/\/$/, "");
}

function inferLocalBackendHost(): string {
  const explicitHost = tidy(import.meta.env.VITE_WINGMAN_LOCAL_BACKEND_HOST);
  if (explicitHost) return explicitHost;
  if (typeof window === "undefined") return "";

  const hostname = tidy(window.location.hostname);
  if (hostname === "127.0.0.1" || hostname === "localhost") {
    return hostname;
  }

  return "";
}

function inferLocalBackendOrigin(): string {
  const host = inferLocalBackendHost();
  if (!host) return "";

  const port = tidy(import.meta.env.VITE_WINGMAN_LOCAL_BACKEND_PORT || "8787") || "8787";
  return `http://${host}:${port}`;
}

function buildLocalEndpoint(pathname: string): string {
  const origin = inferLocalBackendOrigin();
  return origin ? `${origin}${pathname}` : "";
}

function buildFallbackEndpoint(pathname: string): string {
  return buildLocalEndpoint(pathname) || pathname;
}

function remapFromLookup(pathname: string): string {
  const lookupEndpoint = normalizeEndpoint(import.meta.env.VITE_COMPETITOR_LOOKUP_ENDPOINT);
  if (!lookupEndpoint) return "";

  try {
    const parsed = new URL(lookupEndpoint);
    const cleanPath = parsed.pathname.replace(/\/$/, "");
    parsed.pathname = cleanPath.endsWith("/api/competitor-lookup")
      ? cleanPath.replace(/\/api\/competitor-lookup$/, pathname)
      : pathname;
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

export function resolveLookupEndpoint(): string {
  const explicit = normalizeEndpoint(import.meta.env.VITE_COMPETITOR_LOOKUP_ENDPOINT);
  return explicit || buildFallbackEndpoint("/api/competitor-lookup");
}

export function resolveApprovalEndpoint(): string {
  const explicit = normalizeEndpoint(import.meta.env.VITE_COMPETITOR_APPROVAL_ENDPOINT);
  return explicit || remapFromLookup("/api/competitor-approvals") || buildFallbackEndpoint("/api/competitor-approvals");
}

export function resolveProductIntelligenceEndpoint(): string {
  const explicit = normalizeEndpoint(import.meta.env.VITE_PRODUCT_INTELLIGENCE_ENDPOINT);
  return explicit || remapFromLookup("/api/product-intelligence") || buildFallbackEndpoint("/api/product-intelligence");
}

export function resolveProductIntelligenceHealthEndpoint(productIntelligenceEndpoint: string): string {
  const explicit = normalizeEndpoint(import.meta.env.VITE_PRODUCT_INTELLIGENCE_HEALTH_ENDPOINT);
  if (explicit) return explicit;

  const base = normalizeEndpoint(productIntelligenceEndpoint);
  return base ? `${base}/health` : buildFallbackEndpoint("/api/product-intelligence/health");
}

export function resolveWingmanApiBase(): string {
  const explicit = normalizeEndpoint(import.meta.env.VITE_WINGMAN_API_BASE_URL);
  return explicit || remapFromLookup("/api/wingman") || buildFallbackEndpoint("/api/wingman");
}
