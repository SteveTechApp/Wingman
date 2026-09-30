# Outbound SSRF guard coverage — measured 2026-09-30

Evidence for release criterion `outbound-ssrf-guard-coverage`. Every first-party
outbound fetch path in the server now classifies its target against the IANA
special-purpose address registry before (and, where async, after DNS) issuing a
request. Committed as `ea33bb48` on `codex/proposal-sales-narrative`.

## Scope audit (all first-party outbound paths)

| Path | Target provenance | Guard |
|---|---|---|
| `server/competitor/compare-intelligence.mjs` `fetchText` + every redirect hop | competitor pages — attacker-influenceable URLs | async `assertSafeFetchTarget`: post-DNS, all resolved addresses classified |
| `server/competitor/live-lookup.mjs` `fetchWithTimeout` | allowlisted vendor/search hosts + PDF ingest | allowlist guard + sync `assertSyncFetchTarget` pre-flight |
| `server/competitor/resolve-match.mjs` `fetchWithTimeout` | `https://www.wyrestorm.com/product/${sku}` — sku interpolated | sync pre-flight on every fetch |
| `server/competitor-lookup-server.mjs` `fetchTextWithRetries` | adapter URLs built from sku/query strings | sync pre-flight per attempt |
| `server/agents/lib/geminiStructuredGenerate.mjs` | fixed Google host, env-configured base URL | trusted configuration (out of scope) |
| Supabase access | official client, env-configured | trusted configuration (out of scope) |

## Gaps found and closed (live-probed against the previous classifier)

| Address | Before | After |
|---|---|---|
| `0:0:0:0:0:0:0:1` (expanded loopback) | global | refused |
| `::0.0.0.0`, `::ffff:0:0` (::/96 IPv4-compatible) | global | refused |
| `::ffff:7f00:1` (hex-group mapped loopback) | global | refused |
| `2002:7f00:1::` (6to4 embedding loopback) | global | refused |
| `2001:db8::1` (documentation) | global | refused |
| `2001:0::1` (Teredo, deprecated) | global | refused |
| `192.0.0.8` (IETF protocol assignments) | global | refused |
| `198.51.100.7`, `203.0.113.9` (TEST-NET) | global | refused |
| `192.31.196.1` (+ AS112 siblings) | global | refused |
| `URL.hostname` bracket handling | literal branch never fired for IPv6 | stripped; branch fires |

The NAT64 family: well-known `64:ff9b::/96` decodes by its embedded IPv4
(`64:ff9b::7f00:1` refused, `64:ff9b::808:808` fetchable); local-use
`64:ff9b:1::/48` is refused as a range across /48-/96 carvings and spellings.

## Tests pinning the matrix

- `server/competitor/compare-intelligence.ssrf.test.mjs` — 5 tests: full IPv4
  reserved table, IPv6 specials, decoded mapped/NAT64 forms (global embedded
  IPv4 stays fetchable), whole local-use range, negatives.
- `server/security/safe-fetch-target.test.mjs` — 8 tests: IPv4/IPv6 range
  matrix, embedded-decode positives and negatives, malformed-spelling
  rejection, URL-level classification including `.internal` / `.home.arpa`
  metadata names.

## Verification

`npx vitest run server/security/ server/competitor/` — all suites green
(2026-09-30, commit `ea33bb48`); full suite 2,676 tests / 367 files green;
`npm audit` clean (0 vulnerabilities) after the companion dependency floors.
