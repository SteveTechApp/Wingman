# Competitor Lookup Backend Contract

## Endpoint
- Method: `POST`
- URL: `VITE_COMPETITOR_LOOKUP_ENDPOINT`
- Content-Type: `application/json`

Local scaffold server:
- Start with `npm run dev:lookup-api`
- Health: `GET http://127.0.0.1:8787/api/health`
- Lookup: `POST http://127.0.0.1:8787/api/competitor-lookup`
- Approvals DB: `POST/GET http://127.0.0.1:8787/api/competitor-approvals`

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
