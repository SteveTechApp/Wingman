# Competitor Lookup Backend Contract

## Endpoint
- Method: `POST`
- URL: `VITE_COMPETITOR_LOOKUP_ENDPOINT`
- Content-Type: `application/json`

Local scaffold server:
- Start with `npm run dev:lookup-api`
- Health: `GET http://127.0.0.1:8787/api/health`
- Lookup: `POST http://127.0.0.1:8787/api/competitor-lookup`
- Lookup Diagnostics Feed: `GET http://127.0.0.1:8787/api/competitor-lookup/diagnostics`
- Lookup Diagnostics Clear: `POST http://127.0.0.1:8787/api/competitor-lookup/diagnostics/clear`
- Lookup Diagnostics Prune: `POST http://127.0.0.1:8787/api/competitor-lookup/diagnostics/prune`
- Approvals DB: `POST/GET http://127.0.0.1:8787/api/competitor-approvals`

Persistence modes:
- `supabase-db`: approval records are saved/read from Supabase table (`SUPABASE_COMPETITOR_APPROVALS_TABLE`).
- `file-db`: approval records are saved/read from `data/competitor-approvals.json`.
- `file-db-fallback`: Supabase write/read failed and server automatically fell back to JSON file.
- `memory`: diagnostics feed events served from in-memory buffer only.
- `memory-fallback`: diagnostics feed attempted Supabase read but fell back to in-memory buffer.

## Request payload
```json
{
  "query": "Crestron DM-NVX-360",
  "brand": "Crestron",
  "sku": "DM-NVX-360"
}
```

Rules:
- `query` is required and must be non-empty.
- `brand` and `sku` are optional helper fields parsed by Wingman.

## Response payload (accepted forms)

### Form A
```json
{
  "record": {
    "brand": "Crestron",
    "sku": "DM-NVX-360",
    "name": "DM NVX Endpoint",
    "family": "AVoIP",
    "category": "AV over IP encoder/decoder",
    "summary": "1Gb AV over IP endpoint for enterprise distribution and switching.",
    "features": ["AVoIP", "USB/KVM support"],
    "transport": "AVoIP",
    "inputs": [{ "type": "HDMI", "count": 1 }],
    "outputs": [{ "type": "HDMI", "count": 1 }],
    "video": { "maxResolution": "4K60", "hdr": true },
    "distanceMeters": 100,
    "sourceUrl": "https://example.com/product/dm-nvx-360"
  }
}
```

### Form B
```json
{
  "records": [
    {
      "brand": "Crestron",
      "sku": "DM-NVX-360"
    }
  ]
}
```

### Form C
```json
{
  "brand": "Crestron",
  "sku": "DM-NVX-360"
}
```

Rules:
- `sku` is required in each record.
- Other fields are optional but recommended for better comparison quality.
- Additional fields are allowed; Wingman ignores unknown fields.

## Failure handling
- If backend payload fails contract validation, Wingman logs a lookup warning and falls back to local curated/seed/synthetic data.
- The comparison flow remains non-throw and deterministic.

## Approval endpoint contract
- Method: `POST`
- URL: `VITE_COMPETITOR_APPROVAL_ENDPOINT`
- Content-Type: `application/json`

Request payload:
```json
{
  "cacheKey": "crestron|dmnvx360|crestrondmnvx360",
  "brand": "Crestron",
  "sku": "DM-NVX-360",
  "name": "DM NVX Endpoint",
  "source": "backend",
  "sourceUrl": "https://www.crestron.com/search-results?query=DM-NVX-360",
  "approvedAt": "2026-03-10T08:12:00.000Z",
  "approvedBy": "wingman-user",
  "notes": "Approved by support workflow"
}
```

Behavior:
- If approval endpoint is unavailable, Wingman queues approved entries locally and supports queue flush later.
- Endpoint response now includes:
  - `mode`: storage mode used for this request
  - `warnings`: fallback/diagnostic warnings (if any)

## Supabase approval storage setup
Set backend env vars before starting `npm run dev:lookup-api`:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_COMPETITOR_APPROVALS_TABLE` (optional, default `competitor_approvals`)

Apply SQL schema:
- `docs/sql/competitor-approvals.supabase.sql`

If these are not configured, server remains deterministic and uses JSON file storage.

## Runtime diagnostics persistence setup
Set optional backend env vars:
- `LOOKUP_PERSIST_RUNTIME_EVENTS` (default `true`)
- `SUPABASE_LOOKUP_DIAGNOSTICS_TABLE` (default `competitor_lookup_runtime_events`)
- `LOOKUP_RUNTIME_EVENT_RETENTION_DAYS` (default `30`)

Apply SQL schema:
- `docs/sql/competitor-lookup-runtime-events.supabase.sql`

Behavior:
- If Supabase runtime diagnostics persistence is configured and reachable, diagnostics endpoint mode is `supabase-db`.
- If Supabase is unavailable, diagnostics endpoint mode is `memory-fallback` and warnings are returned.
- If Supabase is not configured, diagnostics endpoint mode is `memory` and no fallback warning is emitted.

## Live enrichment safeguards
Live lookup now uses policy guards to keep behavior predictable:
- HTTPS-only adapter URLs
- Brand host allowlists (blocks cross-domain redirects)
- In-memory TTL cache (reduces repeat external calls)
- Per-brand rate limiting window (prevents burst traffic)

Config:
- `LOOKUP_ENABLE_LIVE_ENRICHMENT` (default `true`)
- `LOOKUP_CACHE_TTL_MS` (default `1800000`)
- `LOOKUP_CACHE_MAX_ENTRIES` (default `500`)
- `LOOKUP_RATE_LIMIT_WINDOW_MS` (default `60000`)
- `LOOKUP_RATE_LIMIT_MAX_REQUESTS` (default `12`)

Runtime visibility:
- `GET /api/health` returns enrichment/cache/rate-limit settings and Supabase configuration state.
- `GET /api/competitor-lookup/diagnostics` returns recent warning/trace events for support triage.
- Diagnostics feed response includes `mode`, `memoryCount`, `warnings`, and merged `events`.
- `POST /api/competitor-lookup/diagnostics/prune` accepts `{ "days": number }` and removes older diagnostics events.
- `POST /api/competitor-lookup/diagnostics/clear` clears diagnostics events from memory and Supabase (if enabled).
- `LOOKUP_RUNTIME_EVENT_MAX` controls the in-memory diagnostics ring buffer size (default `120`).
