// Wingman Service Worker — offline caching for call cards and battle cards.
// Caches the product intelligence index, competitor catalog, and key static
// assets so the app works without network.

// Version string: bump on every deploy to invalidate old caches.
// Set by the build process — the Vite build replaces this token.
const SW_VERSION = "__SW_VERSION__";
const CACHE_PREFIX = "wingman-";
const DATA_CACHE = `${CACHE_PREFIX}data-${SW_VERSION}`;
const STATIC_CACHE = `${CACHE_PREFIX}static-${SW_VERSION}`;
const BATTLE_CARDS_CACHE = `${CACHE_PREFIX}battle-cards-${SW_VERSION}`;
const CALL_CARDS_CACHE = `${CACHE_PREFIX}call-cards-${SW_VERSION}`;

// Assets to pre-cache on install
const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/product-intelligence-index.json",
  "/product-call-card-products.json",
  "/data/catalog/competitor-products.generated.json",
  "/data/catalog/battle-cards.generated.json",
];

// Install: pre-cache critical data
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        console.warn("[SW] Pre-cache partial failure:", err);
        // Don't fail install if some URLs aren't available yet
      });
    })
  );
  self.skipWaiting();
});

// Activate: clean ALL old caches (any wingman- prefixed cache from a previous version)
self.addEventListener("activate", (event) => {
  const validCaches = new Set([DATA_CACHE, STATIC_CACHE, BATTLE_CARDS_CACHE, CALL_CARDS_CACHE]);
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => !validCaches.has(key))
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch: network-first for API calls, cache-first for static data
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== "GET") return;

  // Skip chrome-extension and other non-http(s) schemes
  if (!url.protocol.startsWith("http")) return;

  // Network-first for API calls (always try network, fall back to cache)
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Cache-first for battle cards data
  if (url.pathname.includes("battle-cards") || url.pathname.includes("competitor-products")) {
    event.respondWith(cacheFirstThenNetwork(event.request, BATTLE_CARDS_CACHE));
    return;
  }

  // Cache-first for call cards data
  if (url.pathname.includes("call-card-products") || url.pathname.includes("product-intelligence-index")) {
    event.respondWith(cacheFirstThenNetwork(event.request, CALL_CARDS_CACHE));
    return;
  }

  // Cache-first for product data JSON files (these change infrequently)
  if (url.pathname.endsWith(".json")) {
    event.respondWith(cacheFirstThenNetwork(event.request, DATA_CACHE));
    return;
  }

  // Cache-first for static assets (JS, CSS, fonts, images)
  if (
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".woff2") ||
    url.pathname.endsWith(".woff") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".ico")
  ) {
    event.respondWith(cacheFirstThenNetwork(event.request, STATIC_CACHE));
    return;
  }

  // Network-first for everything else (HTML pages, etc.)
  event.respondWith(networkFirst(event.request));
});

// Cache-first with network fallback — for data that changes rarely
async function cacheFirstThenNetwork(request, cacheName = DATA_CACHE) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Return a basic offline response for JSON files
    if (request.url.endsWith(".json")) {
      return new Response("{}", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response("Offline", { status: 503 });
  }
}

// Network-first with cache fallback — for pages and API
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DATA_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    // Return offline page for HTML requests
    if (request.headers.get("accept")?.includes("text/html")) {
      return new Response(offlineHtml(), {
        status: 200,
        headers: { "Content-Type": "text/html" },
      });
    }

    return new Response("Offline", { status: 503 });
  }
}

function offlineHtml() {
  return `<!DOCTYPE html>
<html lang="en-GB">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Wingman — Offline</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #000810;
      color: #e2f2ff;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 2rem;
    }
    .offline-card {
      max-width: 28rem;
      border: 1px solid rgba(103, 232, 249, 0.2);
      border-radius: 1rem;
      padding: 2.5rem;
      text-align: center;
      background: rgba(2, 14, 25, 0.8);
    }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; color: #67e8f9; }
    p { font-size: 0.9rem; opacity: 0.7; line-height: 1.5; margin-top: 0.75rem; }
    .icon { font-size: 3rem; margin-bottom: 1rem; }
    button {
      margin-top: 1.5rem;
      padding: 0.7rem 1.5rem;
      border: 1px solid #67e8f9;
      border-radius: 0.5rem;
      background: transparent;
      color: #67e8f9;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
    }
    button:hover { background: rgba(103, 232, 249, 0.1); }
  </style>
</head>
<body>
  <div class="offline-card">
    <div class="icon">📡</div>
    <h1>You're offline</h1>
    <p>Wingman can't reach the server right now. Call cards and battle cards are available from your local cache.</p>
    <p>Reconnect and try again when you have network access.</p>
    <button onclick="window.location.reload()">Retry</button>
  </div>
</body>
</html>`;
}
