# Product Intelligence API Contract

## Purpose
Canonical, evidence-backed product records for WyreStorm and competitor SKUs with approval workflow support.

## Base endpoint
- `GET /api/product-intelligence`
- Health: `GET /api/product-intelligence/health`
- Refresh seed: `POST /api/product-intelligence/refresh`
- Upsert record: `POST /api/product-intelligence/upsert`
- Update approval status: `POST /api/product-intelligence/status`
- Add evidence: `POST /api/product-intelligence/evidence`

## Record model (core fields)
```json
{
  "id": "wyrestorm::wyrestorm::EX-70-H2",
  "vendorType": "wyrestorm",
  "brand": "WyreStorm",
  "sku": "EX-70-H2",
  "name": "18Gbps 4K HDR HDBaseT Extender",
  "status": "approved",
  "confidence": 0.87,
  "sourceType": "catalog",
  "sourceUrls": ["https://www.wyrestorm.com/"],
  "lastCapturedAt": "2026-03-10T09:40:00.000Z",
  "lastReviewedAt": "2026-03-10T09:40:00.000Z",
  "evidence": [
    {
      "id": "ex70h2-summary",
      "type": "spec",
      "label": "Catalog Summary",
      "value": "4K HDR HDBaseT extender for long-distance HDMI extension.",
      "sourceUrl": "https://www.wyrestorm.com/",
      "capturedAt": "2026-03-10T09:40:00.000Z",
      "confidence": 0.87
    }
  ]
}
```

## Status values
- `draft`
- `approved`
- `expired`

## Evidence type values
- `spec`
- `io`
- `compatibility`
- `positioning`
- `application`
- `other`

## Query filters
`GET /api/product-intelligence` supports:
- `vendorType`
- `status`
- `brand`
- `sku`
- `q`
- `limit`
