# Product-index split — network waterfall audit

Measured proof for the `perf(data)` product-intelligence split (commit
`11256ce7`): the app's eager payload is the 2.8 MB summary plus a 26 KB
manifest, per-SKU detail files load only when a surface opens, and the retired
10.7 MB monolith is gone from the build. Companion to the delivery-contract
test (`src/__tests__/productIntelligenceIndexCacheUsage.test.ts`) — that test
pins the contract in CI, this document pins the measured runtime numbers.

- **Date / environment:** 2026-09-29 · local production build
  (`npm run build`, then `vite preview` on `http://localhost:4173`),
  Chromium browser, fresh profile.
- **Method:** `performance.getEntriesByType("resource")` after each journey
  (dashboard → call-card page → card click → compare), cross-checked with
  direct HTTP requests and byte counts on the served files.
- **Result: PASS** on all four checks (§1–§4).

## 1. Eager cost — summary + manifest (SW precache)

`public/sw.js` precaches exactly these product-intelligence URLs at install:
`/product-intelligence-summary.json` and `/product-intelligence-details.json`
(no per-SKU files). Measured while cached and over the wire:

| Asset | Raw bytes | gzip (wire estimate) | Role |
|---|---|---|---|
| `product-intelligence-summary.json` | 2,774,083 | 197,194 | All surfaces: product selector, family/pitch/call-card pages, Guru |
| `product-intelligence-details.json` (manifest) | 26,055 | 4,288 | Detail file index (`{sku → path, bytes}`) |

Pre-split eager equivalent, `public/product-intelligence-index.json`
(git `HEAD~1`): **10,696,415 bytes raw / 1,073,513 bytes gzipped** — and it
was precached by the same service-worker list, so eager cost dropped
~7.9 MB raw. (Measured gzip is not a like-for-like wire win on a local
preview — real transfer size depends on the host's compression — but it
corrects the naive assumption that JSON compresses to a third: dense
product JSON only compresses ~10×.) The dashboard initially fetched zero product-intelligence
files over the wire (served from precache by design), and no surface ever
requested the retired URL.

## 2. Per-SKU detail — loaded only on open

Focused call-card view (`/wingman/product-call-cards`): the 14-card page
rendered from the summary alone; **no detail request** was made. Clicking the
MX-0402-MST card triggered exactly one detail fetch:

| Asset | Bytes | gzip | Status |
|---|---|---|---|
| `product-intelligence-details/mx0402mst.json` | 39,093 | 7,470 | 200 |

Lazy hydration of a single SKU costs 39 KB raw (~7 KB gzipped) against the
monolith's 10.7 MB — the same open costs ~0.36 % of the old eager payload.

## 3. Full-records consumers hydrate on demand

`/wingman/compare` (a `loadProductIntelligenceDetailRecords` consumer — the
compare engine needs every record hydrated) fetched the manifest and then the
detail files it did not yet hold:

- Detail files fetched: **220**, total **5,399,033 bytes** (≈5.27 MB raw),
  all HTTP 200.
- Deliberate, not eager: these requests happen when the compare surface
  opens — the dashboard and call-card journeys above made none.

This is the intended trade: surfaces that genuinely need full records
(including the cross-SKU evidence the compare engine audits) hydrate the tail
they need; nothing else pays for it.

## 4. Retired monolith verification

- `dist/product-intelligence-index.json` — **absent from the build output.**
- `GET /product-intelligence-index.json` — **HTTP 200 but `text/html`
  (2,275 bytes)**: the SPA fallback serves `index.html` for unknown paths, so
  the old URL can never serve the retired payload.
- `GET /product-intelligence-details/mx0402mst.json` — 200, 39,093 bytes.
- `GET /product-intelligence-details.json` — 200, 26,055 bytes.

## Summary table (the numbers to quote)

| Metric | Before (monolith) | After (split) | Measured |
|---|---|---|---|
| Eager payload (SW precache) | 10,696,415 B | 2,800,138 B (summary + manifest) | −73.8 % |
| Call-card open cost (first SKU) | — (already paid eagerly) | 39,093 B | +0 (detail never eagerly fetched) |
| Compare full hydration | 0 extra (bundled) | 5,399,033 B across 220 files, on open | on demand |
| Monolith in build output | present | **absent** | ✓ |

Reproduction: `npm run build` → `node node_modules/vite/bin/vite.js preview
--port 4173` → repeat the journeys and read
`performance.getEntriesByType("resource")`. Verify the preview port is freed
afterwards (`netstat -ano | grep :4173`; kill with
`powershell Stop-Process -Id <pid> -Force`).
