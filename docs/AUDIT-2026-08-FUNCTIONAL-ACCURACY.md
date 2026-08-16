# Wingman Functional & Accuracy Audit — 15 Aug 2026

Audit scope: whole-app functionality and the accuracy of results, with a
deep dive on **Competitor Compare** and **document parsing (Request Decoder /
Ingest)**. All findings were reproduced against the real engine, real data
(`public/product-intelligence-index.json`, `data/catalog/competitor-products.generated.json`)
and the running app (`npm run dev`).

Method: ran the project's own audit/check scripts for a baseline, read the
decision-engine source, drove the live pipeline with representative competitor
scenarios, and exercised the Compare page in the browser.

---

## Baseline: what the existing checks say

Every existing guard passes:

- `audit:compare-candidate-gate` — candidate lanes per technology class OK
- `check:competitor-intelligence`, `audit:competitor-intelligence` — OK (355 SKUs, 54 family rules)
- `check:compare-sku-normalization` (7 tests), `check:compare-decision`,
  `check:compare-evidence-led-wording`, `check:compare-output-scenarios`,
  `audit:compare-output-quality` — all pass
- `check:routes` — 26 routes OK
- The verdict engine is genuinely fail-closed: `GOOD MATCH` requires a
  verified competitor profile, usable WyreStorm profile, confidence ≥ 78,
  zero gaps and ≤ 3 verify items. `NO MATCH` is only ever produced from a real
  blocker. This is well designed.

The defects below are therefore **not** caught by the existing checks: they
live in the interactions between layers (role equivalence, eligibility
support-only heuristics, wireless-casting rule injection, product copy) and in
the conservative parsing vocabulary.

---

## Findings

### P0-1 — Wireless-presentation comparisons are effectively broken end-to-end

Reproduced with `Barco CLICKSHARE-CX-30`, `Extron SHARELINK-PRO-1100` and
`Atlona AT-UHD-SW-510W` (three of the most common wireless competitor queries).

On the live Compare page, selecting Barco → CLICKSHARE-CX-30 (a SKU that is in
the local competitor catalogue) renders:

> ASSESSMENT: No match — "No suitable WyreStorm match found from the current data"
> "Live lookup needs attention"

…while WyreStorm ships two products that directly answer this requirement
(`SW-620-TX-W`, `SW-640L-TX-W`). Root cause chain, verified in code and by
driving the pipeline:

1. **Role equivalence misses the wireless domain.** The competitor resolves
   with role `"wireless presentation"`. `ROLE_EQUIVALENTS` in
   `src/wingman2/lib/competitorCompareDecision.ts` maps `"presentation switcher"` →
   `[presentation scaler, room switcher, collaboration switcher]` but has no
   `"wireless presentation"` entry, and `rolesMatch()` does not consult the
   domain-compatibility group that already treats `presentation` and
   `wireless_presentation` as compatible. Result: `SW-620-TX-W` /
   `SW-220-TX-W` are classified **NO MATCH** ("Product role mismatch:
   competitor is wireless presentation, WyreStorm candidate is Room
   presentation and source switching core"). The governed role string
   `"Room presentation and source switching core"` is also not normalised by
   `normaliseRole()`.

2. **`SW-640L-TX-W` is blocked as a "power accessory".**
   `productIsSupportOnly()` in `src/wingman2/lib/compareEligibilityEngine.ts`
   flags any product whose text matches `\b(power supply|psu|power accessory)\b`
   as a support-only item. The SW-640L-TX-W catalogue record contains box
   contents ("1x 20V 10A power supply"), so the flagship 4-input wireless
   switcher is rejected with:
   > "Accessory, controller, rack, cable or support item cannot be a lead replacement candidate. Power accessory cannot be a lead replacement candidate."
   Same false positive hits `AMP-260-DNT` (Dante amplifier). The
   explicitly-primary-hardware whitelist covers `SW-020[46]-VW` but not the
   `SW-6xx-TX-W` family.

3. **Wireless-casting rules overwrite the ranked result with decision-less
   records.** `runCompareRuntimePipeline()` ends with
   `applyWirelessCastingRulesToRuntimeResult()`, which prepends **raw product
   index records** for `SW-620-TX-W` and `APO-DG2` via `findRuntimeProductBySku()`.
   These records carry no `decision`. The page papered over this in
   `normalizeRankedRigorousMatches()` by synthesising a fresh decision from the
   raw record — which lacks `domain`/`role`/`transport` — so the top two cards
   show degraded, noisy VERIFY verdicts instead of the real comparison. `APO-DG2`
   is a USB-C casting dongle (role `workflow-endpoint`) yet is forced to
   position #2 for every wireless query.

Net effect: the single most common competitor category (wireless presentation —
Barco, Extron ShareLink, Mersive, Airtame, Kramer VIA, Blustream WMF…) returns
"no match" to an inexperienced rep who has no idea the tool is wrong. This is
the highest-impact accuracy defect in the app.

**Fix direction** (one or more):
- Add `wireless presentation` (and `wireless collaboration`) to
  `ROLE_EQUIVALENTS["presentation switcher"]` and normalise the governed
  role strings in `governedProductTechnicalData` / `wyrestormCompareProfile`
  so wireless SW-* products get the canonical `presentation switcher` role.
- In `productIsSupportOnly()`, match PSU wording only when the SKU *is* a
  PSU/accessory (e.g. `/^PSU|^PWR|POWERADAPTER/` on the key, or `CAB-`/rack
  classes), never on a description word like "power supply" inside a primary
  product's box contents.
- Stop `applyWirelessCastingRulesToRuntimeResult` from replacing evaluated
  matches with raw records; have it re-rank existing evaluated matches (or
  carry `decision`/`wyrestorm` through) instead of prepending catalogue rows.
- Add a regression test: run the full pipeline on `Barco CLICKSHARE-CX-30` /
  `Extron SHARELINK-PRO-1100` and assert `topOutcome !== "NONE"`,
  `SW-640L-TX-W` is an accepted match with a real decision, and every match
  carries `decision.outcome`.

### P1-1 — 73% of the competitor catalogue can never reach GOOD/PARTIAL MATCH

`data/catalog/competitor-products.generated.json`: 355 entries, but only
**97 (27%) are `approved`** (verified-profile tier); 257 are `review`, 1
`draft`. Approved coverage concentrates in 12 brands (Extron 23, Atlona 22,
Crestron 13, Blustream 10, Lightware 10, Kramer 5, ZeeVee 5…). Brands reps
actually compete against — **Barco, CYP, Sony, HDANYWHERE, Just Add Power,
Poly, Logitech, Q-SYS, Mersive, Airtame, Marshall, Datapath, Matrox, Turtle AV,
SY Electronics, Black Box, AVPro Edge (1)** — have zero or near-zero approved
fingerprints.

Because GOOD/PARTIAL MATCH both require `specTier === "verified-profile"`, the
best possible outcome for ~73% of the catalogue is **VERIFY** ("more evidence
is required"). This is fail-closed by design and honest, but it means the tool
largely can't answer for most real competitor SKUs without the rep manually
adding datasheet evidence — the exact population Wingman exists to help.
Free-text searches (e.g. "Extron DTP HDMI distribution amplifier") land
`sku-only` and always VERIFY, even where a verified profile exists under a
slightly different key.

**Fix direction**: batch-review the 257 `review` entries (the data is already
present in the catalogue — it's an approval-status problem, not a data
problem), and add SKU-alias/URL-key coverage so free-text and source-URL
lookups resolve to existing fingerprints more often. Consider a tier that
allows PARTIAL MATCH with `family-rule` evidence when domain+role+transport
are confirmed and confidence is high, keeping GOOD MATCH exclusive to
verified profiles.

### P1-2 — Requirement parsing misses the most common tender phrasing

`src/wingman2/lib/requirementsParser.ts` is intentionally conservative, but
the vocabulary is too narrow for real RFQ text. Verified against the actual
parser:

- `"2x HDMI inputs and 1x 4K display."` →
  **"No structured AV requirements were detected in readable text yet."** — the
  single most common spec phrasing in tenders is invisible to it.
- `"Supply 2x HDMI inputs, 1x display, HDBaseT to 100m"` still reports
  "Confirm source/input count" and "Confirm display/output count" even though
  both were explicitly stated.
- `"3 sources to 4 screens"` — not detected (no `sources`/`screens` tokens).
- Word-form numbers ("two projectors") — not detected.

Only `(\d+)\s+(laptop|source|input)s?` and
`(\d+)\s+(display|screen|output|projector)s?` are recognised; the `x`-notation
(`2x HDMI`, `1x4`), `sources`/`screens`/`monitors`, and word-numbers are all
missing.

**Fix direction**: extend the count regexes to `\d+\s*[x×]?\s*(hdmi|dp|vga|usb-c)?\s*(inputs?|sources?|laptops?|screens?|displays?|outputs?|projectors?|monitors?)`
and add word-number parsing ("two/four/eight"); add regression tests for the
phrasings above.

### P1-3 — PDF extraction has no OCR and no page guard

`src/wingman2/lib/documentExtract.ts` extracts PDFs from the text layer only.
Scanned tender PDFs (very common in RFQ land) yield empty text, and the page
falls to "No usable text could be extracted. Paste the customer request
manually…" — the rep loses the feature exactly when it matters most. There is
also no page-count / file-size cap: a 1,000-page PDF will be fully extracted
in the browser main thread (perf/availability risk — the project already has a
performance guard script that doesn't cover this path). Legacy `.doc` is
explicitly unsupported (good, it's surfaced) but `.pptx` and `.rtf`-in-docx
edge cases are not.

**Fix direction**: add an OCR fallback for empty text layers (Tesseract.js is
not currently a dependency — evaluate before adding), surface a clearer
"scanned PDF — please OCR/convert" message, and cap pages/files (e.g. first
200 pages, 20 MB) with a warning when truncating.

### P2-1 — Candidate gate admits wired-only products into the wireless lane

`allowedClassPair()` in `src/wingman2/lib/compareCandidateGate.ts` allows
`PRESENTATION` candidates for a `WIRELESS_PRESENTATION` competitor — and every
`SW-*`/`EXP-SW-*` switcher is PRESENTATION by SKU rule. So a wired-only 2×1
switcher (`EXP-SW-0201-8K`) passes the candidate gate for a wireless
competitor. The verdict engine only catches this when the competitor
fingerprint declares `features.wireless` — reliable for the 97 approved
fingerprints, unreliable for the 257 `review`/family-rule rows. The
wireless-casting rules in `compareEligibilityEngine.ts` compensate at ranking
time, but the gate itself over-accepts.

**Fix direction**: for `WIRELESS_PRESENTATION` competitors, require wireless
evidence on the candidate (taxonomy `wireless` sub-classification, or
`wireless|casting|miracast|airplay|chromecast` in features) before allowing a
PRESENTATION-class candidate through the gate.

### P2-2 — Coarse AUDIO class makes DSP comparisons show misleading candidates

For `Biamp TesiraFORTE` (an audio DSP), the candidate gate returns amplifiers
(`AMP-2120`, `AMP-260-DNT`) and speakerphones as candidates — none are DSPs.
The final verdict correctly rejects them (NO MATCH → the page says "no
suitable match", which is right), but the candidate surface is misleading for
a rep who doesn't know the difference. WyreStorm has no DSP, so the correct
answer is usually "no direct equivalent" — the gate should surface that more
directly instead of feeding amplifier candidates into the compare.

### P2-3 — Product copy hygiene leaks into compare cards

In `public/product-intelligence-index.json`:

- `HALO-WFA-130` and `HALO-WFA-290` carry the **FOCUS-100 webcam name**
  ("1080P HD Webcam - Business USB Webcam w/ Mic | WyreStorm FOCUS 100 Web") —
  cross-SKU copy bleed in the canonical store.
- `SP-0108-SCL` and `SP-618` (splitters) are classified with role `Audio` in
  the candidate-gate output — a classification inconsistency that shows up in
  compare cards.

The `audit:product-database-quality` script exists but isn't part of the
standard verify chain for these fields.

### P3 — Dev-environment: `PORT` env collision + misleading bind log

`npm run dev` reads `PORT` from the ambient environment
(`server/competitor-lookup-server.mjs`: `Number(process.env.PORT || 8787)`).
In shells where `PORT` is set (e.g. the Freebuff sandbox exports `PORT=0`),
the API binds a random port while the Vite proxy still targets 8787 — all
`/api` calls fail silently (live lookup, product intelligence). The startup
log then prints the *configured* value, not the bound one:
`[wingman-api] listening on http://127.0.0.1:0`. Fix: validate/coerce the
port (reject 0 or non-finite), log `server.address().port` after bind, and
have the Vite proxy target the same resolved value.

---

## What is healthy (keep)

- Fail-closed verdict engine with honest wording (`NO MATCH` only from real
  blockers; VERIFY on insufficient evidence). Good.
- Verified fingerprints validated by integrity tests (overloaded alias keys,
  role/domain coherence, 10G/SDVoE placement).
- 10G/1G NetworkHD "never mix" guard, retired-platform bans, business-status
  blocks, matrix right-sizing and fan-out right-sizing — all present and
  enforced.
- Request-Decoder UX: request-type pipelines, bulk SKU triage, visual
  attachments, "intelligence inputs only" separation from the BOM — well built.
- Route registry, CSS consolidation, and the audit-script ecosystem keep the
  app coherent.

## Priority order for fixes

1. **P0-1 wireless compare chain** (role equivalence + power-accessory false
   positive + decision-less injection) — one regression test on
   CLICKSHARE/SHARELINK will lock it.
2. **P1-2 parser vocabulary** — small, high-value for every RFQ.
3. **P1-1 approved-tier expansion** — data approval work, biggest lever on
   answerable results.
4. **P1-3 PDF OCR/page caps** — product decision (new dependency) + caps.
5. P2s: wireless candidate-gate evidence, AUDIO class messaging, copy hygiene.
