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

---

## P1-1 implementation status — batch competitor approval (added 15 Aug 2026)

**Done.** 241 of 257 `review`-tier competitor fingerprints were batch-promoted to
`approved` after an evidence-based review, taking the catalogue from 97 → **323
approved of 355 (91%)**. Promotion required role + transport/technology + spec
evidence + source-backed identity, and a credible source tier (non-`sku-seed`,
or `sku-seed` with high confidence + full evidence). Every promotion was
validated against the app's own fingerprint integrity validator.

**Deliberately held in `review` (32 rows):** the 16 weak-provenance rows
(`sku-seed` + medium confidence: BirdDog, Marshall, Extron NAV D 101, Kramer
KDS-100, AVPro Edge AC-EX70-444-R3, Lightware VINX, Mersive Solstice Gen3),
the ClickShare Button accessory, plus **15 rows the integrity validator flagged**
after the first pass — duplicate keys (OMNISTREAM AT-OMNI-121), key-encoded I/O
contradicting declared I/O (AC-DA-14X2, DCX-3x1-HC20, MMX2-4x1-H20, TPX/UCX
family), role/domain incoherence (MFP112, EXT3-TR, KIT-500) and a 10G feature on
a non-AVoIP domain (TPX-TX107). Those stay `review` until their data is
corrected — approving them would have produced confidently-wrong matches.

**Verified impact:** promoted SKUs now resolve `verified-profile` /
`readiness=approved` (CLICKSHARE-CX-30, SHARELINK-PRO-1100, CX-50 Gen2, Rally Bar
Mini, Solstice Active Learning). Decision confidence for the same comparison
rose ~2.5x (SW-620-TX-W vs CX-30: 36 → 88 for CS-100-class cases). The
"Competitor intelligence tier: family-rule / needs-evidence" notes are gone, and
the Compare page no longer tells the rep the competitor is unrecognised.

**New finding — the binding constraint moved to the WyreStorm side.** Even with
a verified competitor, `GOOD MATCH`/`PARTIAL MATCH` stay unreachable for most
real pairs because the verdict engine also requires a *usable WyreStorm profile*
and *verified power on both sides*:

- Only **34 of 130** governed WyreStorm technical profiles are `compare-ready`
  (90 are `review-required`); the wireless leads SW-620-TX-W / SW-640L-TX-W are
  both `review-required`.
- Only **20 profiles** carry power specs the power gate can read.
- `!usableWyrestorm` blocks PARTIAL; unverified power on either side hard-
  downgrades to VERIFY; the WyreStorm data warnings push `verify` past the
  GOOD gate's 3-item ceiling.

So the competitor tier was necessary but not sufficient: the next lever on
answerable results is **WyreStorm profile readiness + power evidence** for the
profiles the compare actually leads with (wireless switchers, matrices, camera
families). That is a governed-data program (review 90 profiles, add power
facts), not a flag flip — mass-approving the remaining profiles would be the
same false-verification the integrity gates exist to prevent.

---

## WyreStorm governed-profile readiness program (batch 1, 2026-08)

Follow-up to the constraint found above ("only 34 of 130 governed WyreStorm
profiles are compare-ready"). A batch governed review was run against
`data/governance/wyrestorm-technical-profiles.json`:

**Triage of the 90 review-required profiles**
- **57 promoted to `verified`** — official-page evidence complete, only the
  blanket "machine-drafted" marker as a warning, no genuine technical caveats:
  the wireless leads (SW-620-TX-W, SW-220-TX-W, SW-510-TX, SW-515-RX,
  SW-0401-H2, SW-120-TX3-UK), EX/EXA/EXF HDBaseT extenders, FOCUS cameras,
  HALO UC bars, APO-DG endpoints, AMP-2120, NHD-000-RACK4 and IDB accessories.
- **24 promoted to `verified-with-warning`** — documented caveats kept visible
  (VLC/JPEG2000 compression, splitter-not-matrix semantics, HDMI-only outputs,
  TBD power/weight, Coming Soon pages): the NHD-500/600/610 AVoIP family,
  EXP-SP splitters, MX/MXV matrix kits.
- **9 stayed `review-required`** — hard data gaps, not review laziness:
  missing maxResolution (EX-100-IW-USBC, EX-60-USB2, EXA-100-EARC), missing
  connector-level video I/O (MX-0403-H3-MST, MX-1616-SCL, MXV-0808-H2A-MK2),
  missing AVoIP dependencies (NHD-600-E-TXRX, NHD-610-RX), and the MX-0808-SCL
  design gap needing a human decision.

**Readable power specs** — 47 profiles gained structured `specs`
(poe/poh/poc/internalPsu/externalPsu/powerSupply) that the compare power gate
actually reads: 36 converted from their own free-text power facts (e.g.
NHD-500 "12V DC 1A / 802.3af PoE", SW-640L-TX-W "20V 10A") and 11 added from
official-page-captured facts for leads with no power data at all (SW-620-TX-W
20V/10A, SW-220/510/515 12V DC, CAM-210-NDI-PTZ 12V + PoE, HALO-80,
SYN-CTL-HUB, IDB-300-BTN). Negative statements are respected — MX-0808-H2A-MK2
keeps `poe:false, poh:false` while gaining `internalPsu` — so the existing
audit pin survives.

**Result:** compare-ready governed coverage rose **39 → 119 of 127 active lead
SKUs (94%)**, and the coverage baseline ratchet was re-locked at 119. The
`check:technical-data`, `audit-wyrestorm-technical-data` (23 passed / 0
warnings), matrix-profile, and battle-card alignment gates all pass, and the
full suite is green (the only failure is the known environmental adminEdit
timeout flake, which passes in isolation).

**Residual constraint (documented honestly):** the CX-30 vs SW-620 comparison
is still capped below PARTIAL MATCH, but the bound moved to the **competitor
side** — only 8 competitor fingerprints carry decision-readable power, and
Barco CX-30 is a governed family-rule fingerprint without datasheet power
facts. That is the next data program: structured power (and input counts) on
competitor fingerprints, in the same evidence-based style used here.

---

## WyreStorm held-profile completion (batch 2, 2026-08)

The 9 profiles held at `review-required` after batch 1 were completed with
evidence-backed data, taking governed coverage to **127/127 active lead SKUs
(100%)** — `check:technical-data --strict` now passes.

- **EX-100-IW-USBC** — verified; maxResolution grounded in the EX-100 platform
  video capability (4K60 4:2:0 via USB-C video input).
- **EX-60-USB2** — verified; USB 2.0-only extender with no video I/O.
  Completed via a narrow, intent-preserving gate refinement: maxResolution is
  only required for video-bearing profiles (`check-wyrestorm-technical-data`
  and the compareReady rule now exempt profiles with no video ports and no
  mandatory host dependency). This also fixed AMP-2120 (audio amp, promoted in
  batch 1 but silently not compare-ready because it had no resolution).
- **EXA-100-EARC** — verified; 4K60 via the documented HDMI 2.0 passthrough.
- **MX-0403-H3-MST** — verified; video I/O added from the official-page
  capture (2x HDMI + 2x USB-C in; 2x HDMI + 1x HDBaseT 3.0 out; 4K60 4:4:4),
  maxResolution cleaned from the product-name string.
- **MX-1616-SCL** — verified-with-warning; card-based 16x16 I/O made explicit
  (16 input / 16 output card slots); HDMI 1.4 output-card and TBD-depth caveats
  kept.
- **MXV-0808-H2A-MK2** — verified-with-warning; 8x8 HDBaseT 4:4:4 matrix
  completed from the 2026 Product Guide p22 + the verified MXV-0808-H2A-70-V3
  family chassis (page 404 at review; caveat kept).
- **NHD-600-E-TXRX** — verified; dependencies from the official-page capture +
  verified NHD-600-E-TX/RX profiles.
- **NHD-610-RX** — verified-with-warning; decoder ports/deps/PoE from the
  NHD-610 platform (NHD-610-TX-V2 verified capture) + 2026 SKU spreadsheet
  (regional page unavailable; caveat kept).
- **MX-0808-SCL** — verified-with-warning; the DESIGN GAP warning was **stale**
  — the Local Pub template that created it was already fixed (it now uses
  MX-0808-KIT-V2; see PRE_PRODUCTION_REPORT.md, verified by
  check:template-signal-path). The TBD power/weight caveat stays.

The APO-DG2 rule survives intact: a product with a mandatory host dependency
(dongle needing a receiver/base device) is still not compare-ready — the
maxResolution exemption explicitly excludes profiles with dependencies.

**Result:** 130/130 profiles verified (72 verified + 58 verified-with-warning),
`check:technical-data` strict passes, coverage ratchet locked at 127/127, and
the audit (23 passed / 0 warnings), matrix-profile, battle-card, and
template-signal-path gates are all green. The full suite is 992 passing with
only the known environmental adminEdit flake.

---

## Repeatable governed workflow (2026-08)

The batch review is now a single repeatable command, so future profile batches
(drafted by `tools/draft-technical-profiles-batch*.mjs`) follow the same
evidence-based path without re-deriving it:

- **`npm run govern:wyrestorm`** — applies triage + promotion + power
  conversion, then runs the full gate chain:
  `govern-wyrestorm-profiles.mjs --apply --strict` → coverage baseline
  ratchet → `check:technical-data:strict` → `audit-wyrestorm-technical-data`
  → `check:technical-data-tests`. Fails (exit 1) if any active lead SKU still
  lacks a verified profile.
- **`npm run govern:wyrestorm:dry`** — previews what a new batch would do
  without writing (supports `--file <candidate.json>` to inspect an unmerged
  profiles file).

`tools/govern-wyrestorm-profiles.mjs` is the tracked, versioned home of the
batch-1 logic (supersedes the `.wingman-work/promote-wyrestorm-profiles.mjs`
scratch script): it classifies review-required profiles against the governed
gates (maxResolution for video classes, dependencies for AVoIP, connector-level
video I/O for matrices, design-gap holds), promotes evidence-complete profiles
to `verified` / `verified-with-warning` with the machine-draft marker stripped
and the promotion stamped into the evidence record, converts free-text power
facts into the structured specs the compare power gate reads (negative
statements respected), and reports any profile still held for human-curated
data with its blocking reason. It is idempotent (re-running on a complete
catalogue is a no-op) and only bumps the payload version when it writes.

---

## Governed coverage surfaced in the UI (2026-08)

The 100% governed coverage is now visible to reps, not just in the gate tooling:

- **Per-match-card governance badge** (`compare-native-governance-badge`) on the
  Compare page: every evaluated WyreStorm direction and shortlist option shows
  "Verified governed data" (verified-profile), "Official data – review
  required" (official-structured), "Inferred data – review before use", or
  "Technical data not resolved" — so the data tier behind each verdict is
  visible without opening details.
- **Coverage strip** on the Compare result panel and the dashboard: "100% of
  product profiles verified · 130/130 governed profiles · 123 compare-ready".
- New `governedCoverage.ts` computes the aggregate (mirroring the
  exactProfileData compareReady rule) for rep-facing surfaces.

**Bug found and fixed while wiring the badge:** two candidate-construction
paths were dropping the governed tier — `makeMatch` in knownCompareProfiles.ts
used the known-profile hydrator (sets `specTier`, never `sourceTier`), and
`makeEligibilityCandidateFromProduct` in compareEligibilityEngine.ts injected
the raw catalogue row as the match's wyrestorm profile. Both now attach the
resolved governed profile (`sourceTier`/`sourceLabel`/`readiness`), so
eligibility-injected and known-profile candidates display the true tier
(regression-covered by `compareGovernanceBadge.test.ts`).

---

## Competitor-side power program (2026-08) — structured power facts on fingerprints

**Goal:** make the compare power gate decision-readable for competitors so the headline wireless-presentation compares (Barco CX-30 family vs WyreStorm SW-620/SW-220) can reach PARTIAL MATCH.

### Root cause found
The compare decision engine reads **flat** `CompareSpecFacts` keys (`poe/poc/poh/internalPsu/externalPsu/powerSupply` via `describedPower`), but curated competitor rows store power as a **nested free-form object** in `specs_json` (e.g. `{"poe": "46-57V, 30W max"}`, `{"dc": "12V", currentMa: 200}`, `{"input": "External universal 100-240 VAC supply"}`). `catalogEntryToFingerprint` spread the nested object verbatim, so 81 approved rows with real power data still failed the "competitor power method is not verified" gate — the headline CX-30 vs SW-620 comparison was pinned at VERIFY regardless of the (now complete) WyreStorm side.

### Fixes
1. **`flattenCompetitorPowerFacts`** (competitorSpecRegistry.ts): converts curated nested power facts into the flat decision-readable keys at fingerprint build time — explicit flags (`poe`/`poc`/`poh`/`psuIncluded`/`supplyIncluded`), power-input statements ("AC mains" → internal PSU, "External universal 100-240 VAC supply" → external PSU, "12V 2A" → external PSU), and DC voltages ("12V" → "12V DC external PSU"). Consumption-only facts (`consumptionW`/`maxW`/`currentMa`) never imply a method — the gate stays honestly open (pinned by DA4-HDMI20-C). This lifts all 81 nested-power rows without inventing anything.
2. **Barco wireless-lead enrichment** (barco.csv, 13 rows): evidence-sourced power facts — external 12V DC 2A adapter kit **B563182K** (Barco spare-parts page covers C-5/C-10/CX-20/CX-30), **19V 4.74A adapter** (CX-50 Gen2, spare kit B5631051K / installed adapter ATM090T-A190), USB-C PD on Gen2s, 110/220 V AC plug per official product pages. Consumption figures preserved.
3. **Transport accuracy fix** (3 rows): CLICKSHARE-C-10 / CLICKSHARE-CX-20 / CLICKSHARE-CX-30 carried `transport_type = "Local"` while every sibling row and every other wireless-presentation competitor states "Wireless" — the anomaly made the transport check FAIL against WyreStorm wireless switchers. Corrected to Wireless with an evidence note.
4. **Input counts verified**: 308/323 approved fingerprints carry decision-readable I/O counts; the 15 without are controllers/software/AVoIP endpoints where fixed counts are semantically N/A. Matrix rows all carry curated counts (0 missing).

### Verified payoff (live)
- CX-30 fingerprint now resolves `verified-profile`, transport `Wireless`, power `external PSU / 12V DC 2A external adapter (B563182K); 110/220 V AC plug`.
- Compare page (live, `/wingman/compare`, Barco → CLICKSHARE-CX-30): main match **SW-620-TX-W** now shows **6/6 necessary requirements confirmed, 100% evidence completeness, 0 gaps, power "Meets" both sides**, transport "Meets" — up from 5/6 and a failed transport check. **SW-220-TX-W reaches PARTIAL MATCH** ("may be a usable alternative... differences must be explained").
- **Residual, honestly documented:** SW-620-TX-W (the top-ranked main match) stays at VERIFY despite 100% evidence because its decision confidence lands just under the PARTIAL threshold (55) — the margin is its legacy keyword score, not missing data. The remaining verify items are honest: competitor input count not stated (wireless hubs have no fixed input count), the two generic datasheet-confirm warnings, and a legitimate "3 accessory/non-port entries ignored" profile warning (power adapter / cables / brackets are real box contents).

### Regression coverage (new `competitorPowerFacts.test.ts`, 4 tests)
- Flat power keys from nested facts (CX-30 external PSU, Airtame Hub PoE, NX-1200 12V DC, DM-MD8X8-CPU3 AC mains).
- Consumption-only rows never claim a method (DA4-HDMI20-C).
- Curated fingerprint integrity gate stays green.
- Headline CLICKSHARE-CX-30 vs SW-620-TX-W reaches **PARTIAL MATCH** with the power requirement "meets" and no "power method not verified" verify items (regression against the pre-program VERIFY).

**Gates:** typecheck clean; full suite **1000 pass** (only the known environmental CatalogBrowserPage.adminEdit flake, passes in isolation); `check:fingerprint-integrity` 9/9; `check:competitor-intelligence`, `check:compare-decision`, `check:compare-output-scenarios`, `check:compare-evidence-led-wording`, `audit:compare-output-quality`, `check:compare-sku-normalization` all green. Scripts: `.wingman-work/add-competitor-power-facts.mjs` (idempotent enrichment) and `.wingman-work/fix-barco-transport.mjs` (idempotent accuracy fix).

---

## Governed-data badge on Product Pitch and Catalog (2026-08)

The compare-match badge (green "Verified governed data" / amber "Official data - review required" / "Inferred data - review before use" / "Technical data not resolved") was page-local to the Compare page. It is now a shared component, `src/wingman2/components/GovernedDataBadge.tsx`, reused on three surfaces so every product card tells the same data-tier story:

- **Compare page** — refactored to import the shared `GovernedDataBadge` (same rendering, no behaviour change; all 7 match cards still show "Verified governed data" live).
- **Product Pitch** — badge on every selector result row (spanning the 4-column grid card) and in the product workspace header next to the SKU, driven by the already-hydrated `product.technicalData.sourceTier`.
- **Catalog Browser** — badge on every product card, driven by a one-time `useMemo` map that resolves each catalogue SKU through the same `resolveProductTechnicalData` engine the compare page uses. Verified leads show the green badge; unprofiled accessories/cables honestly show "Technical data not resolved".

Live verification: Product Pitch selector + workspace show "VERIFIED GOVERNED DATA" for SW-620-TX-W; the catalog shows the green badge on governed leads (APO-DG2, APO-DG-DOCK) and the honest unresolved badge on cables/accessories without governed profiles (APO-COM-MIC, CAB-HAOC-*).

New `GovernedDataBadge.test.tsx` pins the tier→copy→style mapping shared across all three surfaces. Typecheck clean; full suite **1003 pass** (only the known environmental CatalogBrowserPage.adminEdit flake, passes in isolation); catalog page tests pass.

## Compare page governed-coverage render regression (15 Aug 2026, evening)

Added `src/wingman2/pages/ComparePageNew.governedCoverage.test.tsx`, the first
full-page render test for the governed badge surface. It loads the REAL
`product-intelligence-index.json` through the same `loadProductIntelligenceIndex`
mock the live app uses, drives a complete Atlona AT-UHD-PRO3-88M 8x8 matrix
comparison via URL params, waits for the main match card, then asserts:

- Every `.compare-native-governance-badge` on the page (main card + shortlist
  option cards) reads "Verified governed data" with the `is-verified` class —
  the 100%-coverage guarantee rendered, not just threaded.
- The governed coverage strip renders "100% of product profiles verified".

This closes the loop opened by the earlier pipeline-threading test
(`compareGovernanceBadge.test.ts`): that test proved the tier survives
candidate construction; this one proves the rendered match cards show it.
If a future profile batch ever drops coverage below 100% (or a candidate path
loses its tier again), this test fails with the badge honestly showing
"Technical data not resolved".

Verified: typecheck clean; full suite 1005 tests with only the known
environmental `CatalogBrowserPage.adminEdit` flake (passes in isolation).

## Product Pitch + Catalog governed-coverage render regressions (15 Aug 2026, evening)

Extended the render-level coverage guarantee from the Compare page to the
other two product surfaces, in the same style as
`ComparePageNew.governedCoverage.test.tsx` (real index, real hydration,
assert badges):

- `ProductPitchPage.governedCoverage.test.tsx` — drives the selector with a
  lead-SKU search ("SW-6") and asserts EVERY result-row badge reads "Verified
  governed data" with the `is-verified` class; and renders the workspace for
  SW-620-TX-W asserting the hero badge is verified.
- `CatalogBrowserPage.governedCoverage.test.tsx` — renders the full grid and
  asserts the honest two-way contract per card: any card whose SKU has a
  verified governed profile MUST show the verified badge (no governed lead may
  fall back to unresolved data), while unprofiled accessories/cables must show
  "Technical data not resolved" WITHOUT the verified class. 129 governed-lead
  cards verified, 181 accessory/cable cards honestly unresolved in the current
  catalogue.

The catalog test is stronger than the compare one: it also pins the honesty
path, so a future batch that accidentally marks an accessory profile or breaks
the tier threading fails on BOTH sides of the contract.

Verified: typecheck clean; full suite 1008 tests with only the known
environmental `CatalogBrowserPage.adminEdit` flake (passes in isolation).

## Compare render gate wired into govern:wyrestorm (15 Aug 2026, evening)

Added `check:governed-coverage-render` (`vitest run
src/wingman2/pages/ComparePageNew.governedCoverage.test.tsx`) and appended it
as the FINAL link of the `govern:wyrestorm` command chain, so a profile batch
cannot land while the Compare page would render any fallback badge on a match
card. The full chain is now:

1. govern-wyrestorm-profiles --apply --strict (triage/promote/power/gate)
2. check:technical-data --update-baseline (coverage ratchet)
3. check:technical-data:strict
4. audit:wyrestorm-technical-data
5. check:technical-data-tests (engine unit tests)
6. check:governed-coverage-render (UI-level badge guarantee)

Verified end-to-end on the current complete catalogue: 0 promotions (no-op),
strict gate 127/127, baseline 127/127, audit 23 passed / 0 warnings, 10/10
engine tests, and the render gate 1/1. The `&&` chain means any link failure -
including a badge that stops reading "Verified governed data" - aborts the
whole run before the batch is considered landed.

## Compare page governed honesty render regression (15 Aug 2026, late)

Added `src/wingman2/pages/ComparePageNew.governedHonesty.test.tsx`, pinning the
badge's honesty contract from the OTHER side of the coverage guarantee: what
happens when a governed profile DISAPPEARS.

Investigation first proved the fallback is unreachable through real data
today: every lead-eligible product is verified, unknown SKUs are rejected by
the lifecycle business-list gate, and the matrix comparison candidates are
injected by hardcoded SKU lists. So the regression simulates a coverage loss
at the exact seam the compare candidates read - `buildWyrestormCompareProfile`
- by stripping MX-0404-SCL's tier (vitest cannot intercept the raw .json
import; the wrapper keeps every other product's resolution real). The test
then asserts the rendered comparison:

- The profile-stripped option card reads "Technical data not resolved" with
  the `is-warn` class and NEVER the verified class.
- Every other card still reads "Verified governed data" with `is-verified` -
  the fallback never leaks onto governed cards.
- Exactly one distinct product lost its tier (it may render on both the
  shortlist and the hidden evidence panel).

Production copy fix alongside: the compare candidate mapping only surfaced
the resolver's status label when a tier exists, so unprofiled candidates now
fall back to the badge component's canonical "Technical data not resolved"
copy - identical to the Catalog page - instead of the resolver's
"Technical data missing" label.

Verified: typecheck clean; full suite 1009 tests with only the known
environmental `CatalogBrowserPage.adminEdit` flake (passes in isolation).

## JSON-mock investigation + governed-profiles test harness (15 Aug 2026, late)

### Root cause of the "vitest cannot mock the JSON" failure

It was NOT a vitest limitation. `vi.mock` intercepts the governed-profiles
JSON import fine. The earlier attempts used the WRONG RELATIVE PATH DEPTH from
the test file: from `src/wingman2/pages/` the mock path was `../../data/...`,
which resolves to the nonexistent `src/data/governance/...`. Vitest silently
registers no mock for an unresolvable path - the factory never runs and the
real JSON is used. Proven by experiment: a literal absolute path, and the
correct relative depth (`../../../` from pages/), both intercept and strip the
profile (tier flips to "missing").

Rule (now documented in the harness JSDoc): the mock path must reach the
project root first - `../../../data/...` from `src/wingman2/pages/`,
`../../../../data/...` from `src/wingman2/lib/testHelpers/`.

### The harness: real coverage-loss injection without wrapper mocks

`src/wingman2/lib/testHelpers/governedProfilesHarness.ts` - pure helpers that
run the REAL governed-profiles payload through a filter:

- `governedProfilesWithoutSkus(payload, skus)` - remove profiles entirely
  (coverage loss).
- `governedProfilesWithStatus(payload, skus, status)` - demote to
  `review-required` (held batch).

Tests mock the JSON module with `vi.importActual` + a helper and get a genuine
coverage-loss payload instead of wrapping `buildWyrestormCompareProfile`.

### Honest tier ladder discovered while rewriting the honesty test

With a governed profile removed, the resolver falls back down a ladder instead
of straight to "not resolved" (now pinned in
`governedProfilesHarness.test.ts`):

1. official-page `technicalProfile` remains -> `official-structured`
   ("Official data - review required" / resolver label "Official data -
   incomplete") - the REALISTIC coverage-loss state, asserted in the render
   test: `ComparePageNew.governedHonesty.test.tsx` now injects the loss at the
   data source and asserts the stripped card shows the amber review badge,
   never verified.
2. only marketing text remains -> `text-inferred`.
3. nothing at all -> tier `"missing"`, resolver label "Technical data
   missing", badge copy "Technical data not resolved" (the literal string,
   pinned end-to-end: resolver tier + `governedBadgeMeta("missing")`).

### Gate

`check:governed-coverage-render` now runs the coverage test, the honesty
render test, and the harness tests - every profile batch is gated on BOTH
sides of the badge contract.

Verified: typecheck clean; full suite 1014 tests with only the known
environmental `CatalogBrowserPage.adminEdit` flake (passes in isolation).

## Badge copy unification moved into the shared component (15 Aug 2026, late)

The missing-tier copy was unified at the SOURCE instead of per-page. The
resolver labels a profile-less product "Technical data missing"; the Compare
page already forced the canonical "Technical data not resolved" at its
candidate mapping, but Product Pitch passed the resolver's statusLabel through
and would show the second wording. Fix: `GovernedDataBadge.governedBadgeMeta`
now returns the canonical copy for the `missing` tier regardless of the
supplied label, so every surface (Compare, Product Pitch, Catalog) shows one
consistent string for the same state. The generic label fallback for truly
unknown tiers is preserved.

Pinned three ways:

- `GovernedDataBadge.test.tsx` - `governedBadgeMeta("missing", "Technical data
  missing")` still maps to "Technical data not resolved" (copy unification
  cannot regress).
- `ProductPitchPage.governedCoverage.test.tsx` - the APO-COM-MIC workspace
  (a real accessory with no governed profile) shows the honest amber
  "Official data - review required" badge, never verified. Investigation
  confirmed every unprofiled catalogue product carries an official
  technicalProfile, so real data lands on official-structured - the literal
  "not resolved" string remains pinned at the resolver + badge level.
- `governedProfilesHarness.test.ts` (existing) - resolver tier ladder.

Verified: typecheck clean; full suite 1015 tests with only the known
environmental `CatalogBrowserPage.adminEdit` flake (passes in isolation).

## Product Pitch text-inferred tier pin (16 Aug 2026)

Extended the Product Pitch honesty surface to cover the full resolver tier
ladder on a real page render. Previously the page pinned verified
(selector + workspace) and official-structured (APO-COM-MIC workspace); the
`text-inferred` rung was only pinned at the badge component level.

**`ProductPitchPage.governedCoverage.test.tsx`** — new selector test that
injects a genuine coverage loss at the data source (governed-profiles JSON
mock via the harness + one-shot index mock stripping MX-0402-MST's official
`technicalProfile`, keeping its `sourceCatalog` evidence): the search
"MX-0402" must surface the MX-0402-MST row with the badge reading **"Inferred
data - review before use"** (`is-warn`, never `is-verified`).

**`governedProfilesHarness.test.ts`** — resolver-level pin for the same rung:
no governed profile + no official technicalProfile + evidence-bearing record
→ `text-inferred`, `statusLabel` "Text-inferred - review only", badge copy
"Inferred data - review before use". The ladder at resolver level is now
complete: verified-profile / official-structured / text-inferred / missing.

**Debugging note (test robustness):** the first version waited for *any*
`.wm-product-pitch-result-card` before asserting — but the selector also
renders "Recently viewed" / "Suggested from project" prelude cards with the
same class, and recent-views persist across tests, so the wait passed on the
previous test's workspace product before the 250ms debounced search results
arrived (the row found was SW-620-TX-W or APO-COM-MIC depending on which
test ran before). Fixed by waiting for the MX-0402-MST row specifically —
the search result can never be confused with a prelude card. Verified: the
same scenario renders the prelude card and the search row together and the
assertion stays scoped to the search row.

**Verification:** typecheck clean; full suite 1017 tests, 1016 passing — the
sole failure is the known environmental `CatalogBrowserPage.adminEdit` flake,
re-confirmed passing in isolation. Both files already run inside
`check:governed-coverage-render`, so the full ladder is enforced per profile
batch.

## All three surfaces folded into the render gate (16 Aug 2026)

`check:governed-coverage-render` now runs **five** files (13 tests) instead of
three: the Product Pitch render suite (`ProductPitchPage.governedCoverage.test.tsx`
— verified selector rows, verified workspace header, APO-COM-MIC review-required
pin, and the text-inferred selector pin) and the Catalog two-way contract suite
(`CatalogBrowserPage.governedCoverage.test.tsx`) joined the existing Compare
coverage + honesty tests and the harness. Every profile batch is now gated on
the badge honesty contract of **all three product surfaces**: a candidate
showing a fallback badge where verified data exists, a card claiming verified
data after its profile disappears, or a governed lead silently losing its tier
on any surface, aborts the chain before the batch lands.

Verified end-to-end on the current 100%-covered catalogue: `npm run
govern:wyrestorm` green through all links — strict gate 127/127, technical-data
strict + baseline PASSED, audit 23 passed / 0 warnings, engine tests 10/10,
render gate 5 files / 13 tests.

## Resolver emits the canonical missing-tier label (16 Aug 2026)

`resolveProductTechnicalData` now returns **"Technical data not resolved"** as
its `statusLabel` for the `missing` tier (previously "Technical data missing"),
so the resolver and the badge component can never disagree about what a
profile-less product is called - on Compare, Product Pitch, Catalog, call
cards, or anywhere else that surfaces the resolver's label directly.

Touchpoints: the resolver's ternary in `governedProductTechnicalData.ts`; the
harness ladder pin in `governedProfilesHarness.test.ts` (updated to the
canonical copy); the badge contract test's comment updated to note the
resolver now agrees, while its assertion still passes the legacy string as a
drift guard (a stale caller can never surface the old copy through the
component). The Compare page's call-site guard remains as harmless defense in
depth.

Verification: typecheck clean; 21 tests across the seven resolver/badge/
surface files pass; full suite 1017 tests, 1016 passing - only the known
environmental adminEdit flake, re-confirmed passing in isolation.

## App-wide copy-consistency sweep for the missing tier (16 Aug 2026)

`src/wingman2/pages/GovernedCopyConsistency.test.tsx` — an app-wide sweep
asserting the missing-tier resolver label reads **"Technical data not
resolved"** on every surface that renders it, and that the legacy "Technical
data missing" wording can never surface anywhere.

Surfaces covered (each driven to a genuine no-data product — governed profile
AND official technicalProfile AND catalogue evidence all stripped):
- **Product Pitch** — the workspace hero badge, plus the Technical Overview
  spec table's raw "Data status: <label> - <completeness>% complete" row, the
  one path that renders the resolver's statusLabel without the badge
  component.
- **Catalog** — unprofiled accessory cards must actually render the canonical
  badge (non-vacuous count assertion) and never the legacy wording.
- **Compare** — a Kramer VS-42H 4x2 matrix comparison with MX-0404-SCL fully
  stripped: its card reads exactly "Technical data not resolved" (never
  verified), all other cards stay verified, exactly one product lost its data.
- **Static app-wide scan** — walks every `.ts`/`.tsx` under `src/wingman2`
  and asserts the legacy string exists only in the badge drift guard. Product
  Call Cards and the Data Manager render no governed badges or resolver labels
  (verified by grep + scan), so they are trivially consistent — and the scan
  would catch them if that ever changed.

The legacy string is built dynamically in the sweep so its own assertions
cannot trip the static scan. The Compare surface's auto-run competitor lookup
settles via a resolving api mock, avoiding an unhandled-rejection after
unmount (verified absent).

Verification: typecheck clean; 4 sweep tests pass with no unhandled errors;
full suite 1021 tests, 1020 passing — only the known environmental
`CatalogBrowserPage.adminEdit` flake, re-confirmed passing in isolation.

## Redundant Compare call-site guard removed (16 Aug 2026)

With the resolver emitting the canonical "Technical data not resolved" label
for the missing tier, the Compare page's call-site guard
(`governedLabel: match.wyrestorm?.sourceTier ? sourceLabel : "Technical data
not resolved"`) became fully redundant: `governedTier` falls back to
"missing", the resolver's `sourceLabel` is canonical for that tier, and the
shared badge canonicalizes the tier itself regardless of label.
`governedLabel` now flows straight through (`match.wyrestorm?.sourceLabel`);
its only consumers are the shared badge (option cards + evidence panel), never
raw text. The copy-consistency sweep keeps the surface honest.

Verification: typecheck clean; all compare tests green (coverage + honesty +
sweep 6/6, plus the other five compare suites 31/31); full suite 1021 tests,
1020 passing - only the known environmental adminEdit flake, re-confirmed
passing in isolation.

## Legacy copy sweep - nothing to migrate (16 Aug 2026)

Repo-wide search (all extensions, case-insensitive) for the legacy
"Technical data missing" wording: **zero user-visible occurrences**. No UI
strings, sales-facing copy, product-intelligence data, public assets, docs or
READMEs contain it. The only two survivors are intentional and must stay:

1. `GovernedDataBadge.test.tsx` - the drift guard, which deliberately feeds
   the legacy string into `governedBadgeMeta` to prove the component still
   canonicalizes it.
2. This audit doc's own historical entries (the "Production copy fix",
   "Badge copy unification" and "Resolver emits the canonical" sections),
   which record what the old behavior WAS - rewriting them would falsify the
   audit timeline.

The static source scan in `GovernedCopyConsistency.test.tsx` continues to
enforce the same guarantee for all future code.

## Static copy scan extended to docs/ and data-sources/ (16 Aug 2026)

The static scan inside `GovernedCopyConsistency.test.tsx` now walks three
roots — `src/wingman2`, `docs/`, `data-sources/` (text extensions only:
ts/tsx/js/mjs/md/json/csv/html/txt) — making the repo-wide legacy-wording
check automated instead of a manual grep. Two files are allowlisted as
intentional occurrences: the badge drift guard and this audit doc's own
historical entries (both verified by a standalone probe to be the ONLY
offenders — the allowlist does real work, the roots are not silently
skipped). Any future file anywhere in app code, docs or data sources that
introduces the legacy wording fails the sweep.

Verification: typecheck clean; sweep 4/4; full suite 1021 tests, 1020
passing - only the known environmental adminEdit flake, re-confirmed passing
in isolation.

## Copy sweep folded into the render gate (16 Aug 2026)

`check:governed-coverage-render` now runs **six** files (17 tests):
`GovernedCopyConsistency.test.tsx` joined the Compare coverage + honesty
suites, the Product Pitch suite, the Catalog contract suite, and the harness.
Every profile batch is now gated on the app-wide copy contract as well as the
per-surface badge contract: a candidate with a fallback badge where verified
data exists, a card claiming verified data after its profile disappears, a
governed lead silently losing its tier, OR the legacy "Technical data missing"
wording appearing anywhere in app code, docs or data sources, aborts the chain
before the batch lands.

Verified end-to-end on the current 100%-covered catalogue: `npm run
govern:wyrestorm` green through all links — strict gate 127/127, technical-data
strict + baseline PASSED, audit 23 passed / 0 warnings, engine tests 10/10,
render gate 6 files / 17 tests.

## Fast copy-check script (16 Aug 2026)

`npm run check:governed-copy` runs only the copy-consistency sweep
(`GovernedCopyConsistency.test.tsx`, 4 tests, ~5s) for quick pre-commit
feedback without the full gate. The full `check:governed-coverage-render`
(and therefore `govern:wyrestorm`) still includes the same sweep, so the fast
script can never pass a state the gate would reject - it is a strict subset.

## Structured human review pass — verified count restored to non-zero (16 Aug 2026)

A repeatable drift review + confirmation pass, restoring a real (non-zero)
human-verified count without rubber-stamping:

- **`tools/review-governed-profile-drift.mjs`** cross-checks every governed
  profile's spec-critical fields (max resolution, routed I/O, power) against
  the source-controlled canonical product store, ranks by drift, and writes
  `reports/governed-profile-drift.json`. Tool noise was removed along the way:
  page-level OCR chroma is not compared (one official page lists several
  chroma modes), "No PoE" is not a PoE claim, and 4096-vs-3840 within the same
  4K60 family is classified "partial" (needs a live page), not hard drift.
- **Review outcome**: one genuine hard drift found and fixed — CAM-210-PTZ
  claimed 1080p30 with no PoE; official page evidence (live capture + B&H +
  title) shows 1080p60, PoE 802.3af, 12V DC 2A PSU. The governed values were
  corrected *before* confirmation. Ten PoE/PoH gaps (HDBaseT outputs carrying
  1-way/2-way PoH on MX/MXV matrices, RX receivers, SW-120-TX3) and the
  dead-page 4K60 cases (NHD-500/600-E series, MXV-0808-H2A-MK2) were
  documented and left awaiting — half-knowledge was never confirmed.
- **`tools/apply-governed-review-pass.mjs`** records verifiedBy + verifiedAt +
  confirmedFields + an evidence entry (official page URL, reviewer, reviewedOn)
  on the 10 profiles whose spec-critical fields were confirmed against live
  official evidence: MX-0402-MST, MX-0404-HDMI, MX-0404-SCL, MX-0804-EDC,
  MX-0808-KIT-V2, MX-0808-SCL, MX-0808-SCL-V2, MX-0812-SCL, SW-640L-TX-W,
  CAM-210-PTZ. It reuses `server/governance/profile-confirmation.mjs`
  (saveProfileConfirmation, now with a `note` override and reviewer/reviewedOn
  on evidence) so the batch path and the dashboard confirmation UI share one
  validated write.
- **Verified count**: 0/130 → 10/130 (8%). The Compare, Product Pitch and
  Catalog surfaces now show "Verified governed data" on those 10 cards and the
  official tier on the rest; the dashboard card reads "120 awaiting · 10/130
  human-confirmed · 54 ready to confirm". All render tests were made
  data-aware (badge must equal the profile's actual tier, never exceed it).
- **Gates**: full `govern:wyrestorm` chain green (audit 23 passed, strict gate
  127/127, technical-data tests 13/13, render gate 19/19, competitor-decision
  drift gate — no engine outcome flipped — and trust layer). Full suite 152
  files / 1047 tests green, typecheck clean. One stale audit assertion
  (MX-0808-H2A-MK2 expected `verified`) was corrected to the
  machine-transcribed contract.

## HDBaseT PoH-gap closure — batch 2 confirmed (16 Aug 2026)

The 10 profiles the first pass left drifting (governed power omitting the PoH
carried by their HDBaseT outputs) were closed from the live official page
captures (all officialPageStatus 200) and confirmed in a second pass of
`tools/apply-governed-review-pass.mjs`:

- **1-way PoH on HDBaseT outputs**: MX-0404-KIT (powers included receivers),
  MX-1007-HYB (HDBaseT 3.0 PoE+ PSE), MXV-0404-H2A-KIT / -V2 (85W with 4
  receivers via PoH), MXV-0808-H2A-70-V3, MXV-0808-H2A-KIT.
- **15W PoH**: MX-1616-SCL via its HDBaseT output card (TX-SCL-HDBT) — the
  governed transport already listed the card, so the two were reconciled.
- **2-way PoH**: RX-700 (official spec table confirms 18V DC 3A / 10W — the
  box-contents 12V line was the ambiguity, resolved in favour of the spec
  table), RX3-100, SW-120-TX3.

The pass tool gained an append mode (value fixes now carry the full desired
power array, preserving the existing facts), became idempotent (already-
verified SKUs skip instead of failing), and confirmed 20 profiles in total.
The evidence write now always includes reviewer + reviewedOn (the strict gate
requires them). Drift report: **0 profiles with field drift** (was 10).

Verified count: 20/130 (15%). `govern:wyrestorm` green through every link;
full suite 152 files / 1047 tests; typecheck clean; competitor-decision drift
gate unchanged (no engine outcome flipped). A backup was taken before the
pass (`backups/wyrestorm-technical-profiles.pre-poh-pass-*.json`).

### Changelog — 16 Aug 2026 (PoH closure pass)

Closed the 10 documented PoE/PoH gaps on the drifted profiles from official-page
evidence and confirmed them through the same review pass
(`tools/apply-governed-review-pass.mjs`, batch 2):
- **MX-0404-HDMI, MX-0404-SCL, MX-0804-EDC, MX-0808-KIT-V2, MX-0808-SCL,
  MX-0808-SCL-V2, MX-0812-SCL, MX-1616-SCL** — 1-way/2-way PoH on HDBaseT
  outputs recorded from live official pages (200 captures); MX-1616-SCL's PoH
  attributed to the TX-SCL-HDBT output card, consistent with its card-based
  transport.
- **RX3-100, SW-120-TX3** — PoH/HDBaseT power closed from official pages;
  RX-700 verified as 18V DC 3A (official spec table + PDF manual) — the 12V
  line is the box-contents PSU, governed value correct.

Result: **20 / 130 human-verified (15%)**, 110 awaiting, **0 field drift
remaining** in `reports/governed-profile-drift.json`. Strict gate, drift gate
(no engine outcome flipped), full suite, and typecheck all green.

### Changelog — 16 Aug 2026 (gate chain wiring)

The drift review and the structured review pass are now enforced gate steps,
so future confirmation batches cannot land without re-running both:
- **`check:governed-drift`** (`tools/review-governed-profile-drift.mjs --strict`)
  fails when any profile has field drift or internal contradictions, or when a
  human-verified profile carries a max-resolution the review cannot classify
  (a confirmed value must stay machine-readable). Missing values / missing
  store evidence remain informational (the normal awaiting-data-work state).
- **`check:governed-review-pass`** (`tools/apply-governed-review-pass.mjs --check`)
  dry-runs the pass WITHOUT writing: every CONFIRMATION_BATCH SKU must be
  present, readable, evidence-backed and already human-verified, and no value
  fixes may be pending. A half-applied batch fails loudly.

Both are wired into `govern:wyrestorm` (after the audit step, before the
engine/render gates) and into the CI `governed-data-gate` workflow. The tools
also gained `WINGMAN_PROFILES_FILE` / `WINGMAN_STORE_FILE` env overrides so the
gate modes are hermetic-testable. Validated: positive runs pass on real data
(0 drift / 20-verified batch), negative runs fail as designed (injected drift,
unverified batch SKU, pending value fix), full chain exit 0.

### Changelog — 16 Aug 2026 (Request Decoder / Response Pack / Proposal pipeline audit)

Scenario-driven audit of the request-decoder → response-pack → proposal
pipeline (parsing, BOM quantities, dependency sizing, export), reproducing
realistic RFQ/distributor/BOM inputs against the live engines. Fixed:

- **Matrix rows were dropped from leads** — `classifySku` only matched
  "HDBaseT matrix"/"AV matrix" descriptions, so the most common RFQ phrasing
  ("4x2 HDMI matrix switcher", "8x8 matrix") classified as `unknown` and the
  line became "do not recommend an equivalent". A bare `matrix` mention now
  classifies to `hdbaset-matrix` (architecture-led direction), keeping
  power/accessory rows out via the earlier checks.
- **Counts before version strings were lost** — "four HDMI 2.0 inputs" /
  "2x HDMI 2.0 inputs" returned no source count because the version sat in the
  connector→noun slot. Version numbers now occupy the resolution slot (the
  count guard still prevents "HDMI 2.0" itself being read as a quantity).
- **CSV/table quantities dropped** — "SW-120-TX3, HDBaseT 3.0 transmitter, 8"
  yielded qty 1 because the quantity lived in its own trailing cell.
  `extractQuantity` now reads a trailing table cell, and quantity-first
  notation ("12x VS-42H") now wins over matrix-size notation ("4x2") without
  leaking decimals ("2.5x") or SKU-embedded X ("TX3").
- **Pairing dependencies sized x1 regardless of project size** — RX-500/RX-700
  (SW-130-TX) and RX3-100 (SW-120-TX3) rules used `qtyBasis: "one"`, so "8x
  SW-120-TX3" produced RX3-100 ×1. New `source-unit-count` basis sizes the
  receiver per selected transmitter unit (explicit quantity, else discovery
  source count), with confidence dropped to Low when neither basis exists.
- **Latent wrong-qty BOM builder** — `buildBomRows` in `proposalExport.ts`
  hardcoded `qty: 1`; it now carries captured `product.quantity`.

Regression tests added at both engine and page level (matrix classification +
triage, table quantities, quantity precedence, version-string counts,
receiver-count sizing across distance scenarios, BOM CSV export quantities).
Result: **1068 tests green** (+11), typecheck clean, live Ingest page verified
with the VS-42H distributor scenario (VS-42H architecture alternative ×12,
SW-120-TX3/RX3-100 ×8, extender kit ×2).

### Changelog — 16 Aug 2026 (scheduled evidence-freshness gate)

New scheduled CI job (`wyrestorm-freshness.yml`, nightly 03:00 UTC +
`workflow_dispatch`) that live-checks every unique official evidence URL
carried by the governed profiles and re-runs the governed drift + review-pass
gates, so a dead or repurposed spec page is caught before a rep quotes against
it. `tools/check-wyrestorm-evidence-liveness.mjs` (`npm run
check:evidence-liveness`):

- **Gate (exit non-zero)**: the URL returns 404/410 ("dead"), or it redirects
  to a different product slug ("moved").
- **Warnings only**: transient server errors, bot-blocking 4xx, and timeouts
  are reported without failing the gate; pages that mention none of their
  citing SKUs anywhere in the fetched HTML are flagged "suspicious" for a
  human review, with shared family/accessory pages handled by testing every
  SKU that cites the URL.
- Output: `reports/wyrestorm-evidence-liveness.json`. Env override
  `WINGMAN_PROFILES_FILE` for hermetic validation.

First run immediately surfaced real rot in the committed evidence, now fixed
in `data/governance/wyrestorm-technical-profiles.json`: NHD-600-E-TX/RX cited
`nhd-600-e-tx/` (redirects to the canonical combined `nhd-600-e-tx-rx/`
page); MXV-0808-H2A-MK2 cited the generic `product-resources/` category page
(its MK2-specific page no longer exists, superseded by the H2A-70 V2/V3
generations — evidence now cites the current MXV-0808-H2A-70-V3 official page
with an explanatory note). IDB-USBA-C was confirmed legitimate: the accessory
has no dedicated page and is documented on the IDB-400-MS-C page it cites.

Validated: real-data run 120/120 live, gate exit 0; hermetic negative run
(dead URL + redirect-to-different-slug) exits 1 with both failures named;
drift gate PASS and review-pass 20/20 confirmable; full suite 1068 green.

---

## 2026-08-16 follow-up: full governed-confirmation batch (20% -> 90% verified)

Ran the structured confirmation batch over every profile whose spec-critical
fields were readable, through `apply-governed-review-pass.mjs` and the full
`govern:wyrestorm` gate chain.

**Verified count: 20/130 (15%) -> 117/130 (90%).** The 13 remaining profiles
(all `verified-with-warning`, FOCUS/HALO cameras, APO dongle docks, IDB
accessories) all need data work first — the ready set is exhausted, and the
dashboard now honestly shows "0 ready to confirm · 13 need data work".

Batch-path fixes the run surfaced:

- `saveProfileConfirmation` wrote confirmation evidence without `reviewedOn` /
  `reviewer`, failing the strict schema every evidence record must satisfy
  (the original 20 were hand-edited). The shared writer (dashboard + batch)
  now records both; the 97 batch-written entries were backfilled from the
  profile's own `verifiedAt`/`verifiedBy`.
- The batch's `officialUrl` could cite a 404 store capture as confirmation
  evidence; it now prefers live profile evidence (freshness-gate proved).
- Strict drift gate surfaced 31 profiles carrying product-description text in
  `maxResolution` instead of a resolution — the honest classifier now parses
  the full ladder (5K families, spaced "4K @30Hz"), treats 5K/4K60 overlap as
  partial (same product), treats unclassifiable store evidence as no-source,
  and the 16 genuinely-broken values were corrected through the governed
  VALUE_FIXES path (EX-100-USB3 has no video at all — its maxResolution was
  removed, not faked).
- Audit pin for MX-0808-H2A-MK2 updated: it is now human-verified (was
  pinned as machine-transcribed awaiting confirmation).
- Competitor-decision ledger: the worktree was missing the populated 299-row
  snapshot (generated artifact); the populated ledger passes the flip gate
  with zero outcome changes from the tier moves.

Tier pins updated across the suite (backlog 20/110 -> 117/13, coverage
verifiedPct, batch-review tiers, catalog trail pill now derived per profile
from its confirmed fields — e.g. APO-DG2 confirms only Power, NHD-610 carries
a /global/ evidence URL). The two dashboard confirmation-flow tests moved to
`DashboardPage.confirmationFlow.test.tsx` with APO-210-UC demoted to a ready
profile, since the real data now has zero ready-to-confirm rows.

Validated: `govern:wyrestorm` green end-to-end (strict data gate, drift gate,
review-pass check, render gate 8 files/24 tests, competitor-decision snapshot
gate); full suite 1068 green, typecheck clean; all 20 changed files
byte-identical between checkouts.

---

## 2026-08-16 follow-up: competitor-decision approval workflow (review queue)

Built the governed approval desk for the Compare page, mirroring the WyreStorm
profile confirmation flow. The 299 ledger rows start at `pending-review`
(machine baselines); a reviewer approves one by recording reviewer + evidence,
flipping `reviewStatus` to `approved` in the ledger.

- **Server** (`server/governance/competitor-decision-approval.mjs`):
  `saveCompetitorDecisionApproval` is the validated read-modify-write (reviewer
  required, valid evidence URL, decision must exist and not already be
  approved; the evidence entry names its reviewer and review date like the
  profile confirmation path). Routes: `GET /api/governance/competitor-decisions/queue`
  (session, no write permission) and `POST /api/governance/competitor-decisions/approve`
  (`canManageWorkspace`, same gate as profile confirmation).
- **Queue sort - what reps face first**: recommendation-bearing decisions
  (confirmed-equivalent / closest-technical-match / architecture-alternative)
  before hold-for-review rows, then the lead product classes the compare
  feature leads with (wireless presentation, matrix, AVoIP, presentation,
  HDBaseT), then manufacturer/SKU.
- **Compare page** (`CompetitorDecisionReviewQueue` component): lists pending
  decisions with decision label + tone, recommended WyreStorm SKU, fingerprint
  line and Lead-class badge; admin sees reviewer/evidence inputs + Approve
  (client-validated), non-admins see the queue read-only. Approving removes
  the row and reports "recorded in the governed ledger".
- **Gate**: the snapshot structural check now allows `approved` and enforces
  the "approved requires a human" contract (reviewer, review date, evidence),
  mirroring the profile tier rule; the drift gate still fails loudly on any
  engine outcome flip for approved rows.

Validated: server tests (7) + compare-page queue tests (3: render, approve
write, read-only) + full suite 1075 green, typecheck clean, `govern:wyrestorm`
gate green including the updated snapshot gate. Live: queue endpoint returns
299 pending / 0 approved with tier-1 lead decisions first; the Compare page
renders the queue and blocks an empty-reviewer approve client-side (no
approval was recorded during verification - that would fabricate evidence).

## Changelog 2026-08-16 — nightly freshness job now re-runs the competitor-decision snapshot gate

The scheduled WyreStorm freshness workflow (`.github/workflows/wyrestorm-freshness.yml`,
nightly 03:00 UTC + dispatch) previously covered only the WyreStorm side:
evidence-page liveness, governed field drift, and the confirmation baseline.
An approved competitor decision could therefore silently drift from the live
engine: the PR-triggered governed-data-gate runs `check:competitor-decisions`,
but only when a PR touches `data/governance/**` or `data-sources/wyrestorm/**`
- an engine or spec change shipping without those paths would never re-check
the approvals.

The nightly job now also runs `npm run check:competitor-decisions` ("Re-run
competitor decision drift gate") after the governed review-pass step. The
committed golden baseline (`data/governance/competitor-match-decisions.json`)
must match the live engine's outcome for every approved row - an outcome flip
(decision type, lead candidate, or option set) on any of the 20 human-approved
decisions fails the nightly run loudly instead of silently changing what a rep
sees. The job name and header comment now reflect the wider scope.

Validated: workflow YAML structurally checked (steps, cron, gate command),
`check:competitor-decisions` green on current data (20 approved rows, zero
flips), file byte-identical between worktree and main checkout.

## Changelog 2026-08-16 — freshness run is visible on the repo home: README badge + four-gate run summary

The nightly freshness run's failures were only visible inside the Actions tab.
Now the drift is visible on the repo home before the next scheduled run, two ways:

- **README status badge**: `![Evidence freshness](https://github.com/SteveTechApp/Wingman/actions/workflows/wyrestorm-freshness.yml/badge.svg)`
  at the top of the README - green/red for the latest run, plus a one-line
  explanation of what red means. This is the repo-home surface.
- **Per-gate run summary**: the workflow now runs each of the four gates with
  `continue-on-error` + a step `id`, so one failure can no longer fail-fast
  and hide the other gates' results. A final `if: always()` step writes a
  markdown table (gate -> passed/failed) to `$GITHUB_STEP_SUMMARY`, visible on
  the Actions run page, then exits non-zero when any gate failed - keeping the
  run red (and therefore the badge red) while still reporting all four
  outcomes. The four ids: gate-liveness, gate-drift, gate-review-pass,
  gate-competitor.

Validated: workflow structure checked (8 steps, 4 ids, 4 continue-on-error,
report step `if: always()`, summary file + failing exit), the report step's
shell conditional simulated locally (all-pass -> exit 0, any failure -> exit
1), both files byte-identical between worktree and main checkout.

## Changelog 2026-08-16 — competitor evidence liveness joins the nightly freshness job

The nightly freshness run previously checked evidence liveness only on the
WyreStorm side; the 20 approved competitor decisions' official sources had no
scheduled guard. Added `tools/check-competitor-evidence-liveness.mjs` (npm
`check:competitor-evidence-liveness`), mirroring the WyreStorm gate:

- Checks every unique evidence URL carried by APPROVED decisions in the
  governed competitor ledger (currently 20 URLs).
- Gate contract (exit non-zero): 404/410 -> "dead"; an HTML page redirecting
  to a different product slug -> "moved" (PDF datasheets are exempt - serving
  them from a content CDN like adn.harmanpro.com legitimately changes the
  path).
- Content verification ladder for live pages: PDF datasheet, JSON-LD Product /
  og:url slug match (Shopify-style AVPro pages), citing SKU in the HTML (AMX
  product pages), then client-rendered shell or suspicious as non-fatal
  context. The 9 Atlona/Hall Research pages are client-rendered shells - the
  site serves the identical shell for every URL, so a direct fetch cannot
  verify content; they are reported (never failed) exactly as the approval
  notes already record.
- Writes reports/competitor-evidence-liveness.json; WINGMAN_DECISIONS_FILE env
  override for hermetic validation.

The nightly workflow now runs it as the fifth gate (`gate-evidence-competitor`,
continue-on-error), and the run summary table reports all five outcomes -
"Approved competitor evidence liveness" row included - while still failing the
job (and the README badge) on any dead/moved evidence or engine drift. README
badge description updated to cover both evidence sides.

Validated: real data 20/20 live, 0 dead/moved, 9 shells flagged non-fatally,
exit 0; hermetic local-server tests - dead URL -> "GATE FAIL - DEAD" exit 1,
redirect-to-different-slug -> "GATE FAIL - MOVED" exit 1, live page -> exit 0;
workflow structure checked (5 ids, 5 continue-on-error, 5-row summary + fail
condition); full `govern:wyrestorm` gate green; all files byte-identical
between worktree and main.

---

## 17 Aug 2026 — Beginner-first Compare revision (verdict lead + plain-language strip)

Scope: make the Compare Recommendation surface readable by an inexperienced rep
facing an unfamiliar competitor product, per the "review and revise the compare
system" request.

- New **verdict lead** at the top of the Recommendation tab: a one-line plain
  verdict ("The direction looks plausible — confirm a few things first") with a
  short body naming the closest WyreStorm direction and what must be confirmed.
- New **"What this product is"** panel: plain-language description of the
  competitor product (e.g. "Barco CLICKSHARE-CX-30 is used to let users share
  content wirelessly into the room system.") plus product type / role /
  connection / resolution facts.
- **"WyreStorm suggestion"** panel: candidate SKU, "Why this one" bullets and an
  explicit "Main difference" line (closest direction, not confirmed one-box
  replacement).
- **"Before you quote"** panel: the actionable advisories in one place, plus a
  "There are N other WyreStorm options to consider further down" pointer so the
  rep knows the lead is not the whole answer.
- Rewrote the jargon strip at the top of the result into plain language
  ("90% of WyreStorm product data is human-checked · 117 of 130 products
  reviewed against official pages — every card here is backed by that checked
  data"). The `{pct}% of WyreStorm product data is human-checked` pin was kept
  (coverage render test updated to the new copy).
- Styles for the four panels added to `wingman-workflow-theme.css` (verdict
  amber banner, plain-language card, suggestion card, before-you-quote card).
- Tests: new `ComparePageNew.verdictLead.test.tsx` render test asserting the
  verdict heading, plain-language description, suggestion block, and the
  "other options" pointer; coverage render test updated for the new strip copy.
- Full suite 1084 green, `govern:wyrestorm` gate green, typecheck clean; all
  changed files byte-identical between worktree and main; live-verified in the
  Preview tab (Barco CLICKSHARE-CX-30 -> verdict lead renders; Evidence tab
  still shows the honest "verified side-by-side evidence is not available"
  state; no console errors).

---

## 17 Aug 2026 — Beginner-first Compare revision, part 2: no-match / review-required verdict lead

Extends the verdict lead to the surface an inexperienced rep hits when there is
no WyreStorm equivalent: the no-match / review-required result (best candidate
null), including the live-lookup-required and governed no-suitable-match cases.

- `compareVerdictCopy` now distinguishes three honest no-match flavors:
  - **Approved no-suitable-match** -> "No suitable WyreStorm match — confirmed
    by review" (names the reviewer, so the rep can say the answer is reviewed,
    not guessed);
  - **Evidence pending** (unknown SKU needing live lookup, or a recorded
    review-required decision) -> "Evidence still being reviewed": the model is
    not in the local data yet, nothing is ruled out, the verification steps
    below are gathering the official specification;
  - **Generic** -> "No close WyreStorm equivalent found" from the current data.
- `CompareVerdictLead` renders, in place of the suggestion panel when there is
  no candidate, a **"What to tell the customer"** panel with plain, honest
  wording the rep can say, and the checks panel becomes **"Where to go next"**
  (ask the customer what the product must actually do, add verified evidence,
  start a new comparison). The customer line keeps the same tier ordering as
  the banner so the two can never contradict (e.g. evidence-pending never says
  "no direct equivalent").
- Mounted above the existing no-match card on the no-candidate branch; the
  card's duplicated "Next steps" list was removed since the verdict lead now
  carries that guidance (headline, reason and actions unchanged; the
  "No suitable WyreStorm match found from the current data" pin kept).
- CSS: `.compare-verdict-lead__message` panel style (aqua accent, matching the
  brief/suggestion cards) for the no-match flavor.
- Tests: new no-match verdict-lead render test (banner honesty, what-to-tell,
  where-to-go, detail card still below); existing noMatchFallback and
  verdictLead match-path tests untouched and green.
- Full suite 1085 green, `govern:wyrestorm` gate green, typecheck clean; all
  changed files byte-identical between worktree and main; live-verified in the
  Preview tab (unknown Blustream SKU -> "Evidence still being reviewed" banner,
  what-to-tell and where-to-go panels, detail card below; only expected console
  noise is the session-required 401 on the live-lookup POST, honestly surfaced).

---

## 17 Aug 2026 — Beginner-first Compare revision, part 3: plain-language Side-by-side rows

Every spec row on the Side-by-side battle cards now carries a plain-language
explanation aimed at an inexperienced rep.

- `BattleStat` gains two optional fields, rendered under the stat value on
  every battle card:
  - `hint` — what the field actually means ("Chroma: how much colour detail the
    picture carries. 4:4:4 is full colour; 4:2:0 keeps less colour detail.",
    "Bandwidth: how much video data the connection carries per second...",
    "Routed outputs: how many displays it can route to at once.", etc.);
  - `matters` — whether the difference matters for a typical room, in the same
    words on both cards so a pair reads as one verdict: match -> "The same on
    both sides — nothing to explain to the customer."; gap/exceeds -> "They
    differ — the stronger side is highlighted. Check whether this room actually
    needs it."; unverified -> "Not yet verified — confirm both datasheets
    before quoting."
- `CompareShowdown.buildAlignedStats` attaches both from the exact verdict rows
  the proof table uses (the single source of truth), via a `FIELD_PLAIN` map
  covering all 14 engine fields (transport, resolution, chroma, hdr, bandwidth,
  hdmiIn/Out, routedIn/Out, usb, audio, control, distance, poe) and a
  `mattersFor(verdict)` helper. No new state; unlisted fields simply show no
  hint.
- CSS: `.wm-battle-card__stat-hint` / `__stat-matters` small muted lines
  (matters amber-tinted) scoped to the compare route.
- Tests: new CompareShowdown render test asserting both cards carry a hint and
  a matters note per row, including the transport hint, the match wording and
  the "they differ" wording; existing showdown tests untouched and green.
- Full suite 1086 green (+1), `govern:wyrestorm` gate green, typecheck clean;
  all changed files byte-identical between worktree and main; live-verified in
  the Preview tab (AMX DGX1600-ENC -> MX-1616-SCL: 2 battle cards, 16 hints +
  16 matters across the 8 aligned rows, labels aligned; the wireless
  CLICKSHARE-CX-30 case honestly shows "Verified side-by-side evidence is not
  available" since the spec engine has no verified sheets for it — unchanged
  fail-closed behaviour).

## 2026-08-16 — Wireless lead class resolved in the competitor-decision ledger

- **Root cause found**: the wireless competitor rows could never produce a
  spec-engine decision. WyreStorm's SW-* wireless switches normalise as
  PRESENTATION class while wireless competitors (Barco ClickShare, Airtame)
  normalise as WIRELESS_PRESENTATION, and `CLASS_COMPATIBILITY` never let the
  two meet — so every wireless row stayed `review-required` with no
  recommendation, even though the Compare page itself recommended SW-620-TX-W
  for CLICKSHARE.
- **Fixes in `compareSpecEngine.ts`**:
  - Opened the wireless lane: WIRELESS_PRESENTATION competitors now compare
    against the PRESENTATION WyreStorm line (both directions).
  - Relaxed the role gate for wireless TX/RX pairs: for wireless-family
    products "TX"/"RX" is a SKU-naming convention (ClickShare hub vs SW-* base
    unit are complementary halves), not a hard signal direction; dongles stay
    distinct.
  - Taught `roleFromText` that a "wireless conferencing / presentation hub" is
    the room-side receiving unit (so the CLICKSHARE-* prefixed SKUs reps type
    classify as receiver, not unknown), with a `peripheral` exclusion so
    APO-210-UC's "USB peripheral hub" phrase does not misfire.
- **Ledger**: `snapshot-competitor-match-decisions --preserve` refresh updated
  18+4 wireless rows in place, preserved all human approvals, demoted none;
  drift gate shows zero approved flips. 9 base Barco rows + 4 prefixed
  CLICKSHARE rows (the SKUs reps actually type) approved with official Barco
  evidence → **33 approved / 266 pending**.
- **Validation**: full suite 1088 green, typecheck clean, `govern:wyrestorm`
  gate green; synced to main; live-verified — dashboard shows 33 approved with
  reviewer trail, and the typed CLICKSHARE-CX-30 flow leads with the approved
  SW-640L-TX-W decision.

## 2026-08-16 — Explicit confidence tier on the Compare verdict lead

- New `compareVerdictTier(status, opts)` helper (exported for tests) maps the
  engine's existing `CompareReportedStatus` to a short explicit tier chip
  rendered above the verdict heading, so the at-a-glance confidence and the
  prose headline always derive from the same evidence:
  - `match` → "Strong direction" (green), `partial`/`checks` → "Plausible —
    confirm" (amber), `no-match` → "No equivalent" (red), and the
    evidence-pending case is deliberately its own tier ("Evidence pending")
    because the banner says "nothing is ruled out" — a "No equivalent" chip
    there would contradict the headline.
- Rendered as a pill (`compare-verdict-lead__tier--{strong|confirm|pending|none}`)
  in the verdict banner; CSS scoped to the compare route.
- Tests: 2 unit tests pin the tier mapping incl. the evidence-pending honesty
  contract, plus render assertions on both the matched (wireless, checks) and
  unknown-SKU (evidence pending) paths in ComparePageNew.verdictLead.test.tsx.
- Validation: full suite 1090 green, typecheck clean, `govern:wyrestorm` gate
  green; synced to main; live-verified — CLICKSHARE-CX-30 shows the amber
  "PLAUSIBLE — CONFIRM" pill above "The direction looks plausible", unknown
  SKU shows "EVIDENCE PENDING" above "Evidence still being reviewed", AMX
  DGX1600-ENC also resolves honestly to the confirm tier.

## 2026-08-16 — Confidence tier chip on the Side-by-side tab header

- The verdict tier chip (from the Recommendation verdict lead) now also renders
  in the Side-by-side tab's head-to-head header, above "Head-to-head
  comparison", so both tabs open with the same explicit "Strong direction /
  Plausible — confirm / Evidence pending / No equivalent" signal derived from
  the same `compareReportedStatus`.
- The chip class was renamed from `compare-verdict-lead__tier` to a shared
  `compare-confidence-tier` (tone variants unchanged) since it now surfaces on
  two components; `CompareShowdown` gains an optional `verdictTier` prop
  (renders nothing without it, so the generic evidence view stays decoupled).
- Tests: CompareShowdown render test pins the chip in the header when
  `verdictTier` is supplied and its absence when it is not; verdict-lead
  selectors updated for the rename.
- Validation: full suite 1092 green, typecheck clean, `govern:wyrestorm` gate
  green; synced to main; live-verified — AMX DGX1600-ENC Side-by-side shows the
  amber "PLAUSIBLE — CONFIRM" pill above "Head-to-head comparison"
  ("Closest technical match · 6/8 comparable fields · 75% rating"), no console
  errors beyond the expected session-required 401.

## 2026-08-16 — Colour-blind accessibility audit + glyph cues on the confidence tier chip

- **Audit**: the four tier tones (strong=green, confirm/pending=amber,
  none=red) are exactly the pairings colour-blind users cannot separate —
  green vs amber fails protanopia/deuteranopia, amber vs red fails
  low-saturation red-green and tritanopia, and achromatopsia sees all four as
  identical. The labels were always distinct text, but at-a-glance scanning of
  the small uppercase pill relied on colour. Additionally, "pending" and
  "confirm" already shared the amber tone, so they were indistinguishable by
  colour even for normal vision.
- **Fix**: every tone now carries a distinct text glyph inside the chip —
  strong ✓, confirm !, pending ?, none × — so the level reads without colour.
  The glyph span is `aria-hidden` (the label text remains the accessible name,
  following the codebase's existing glyph-icon convention in
  CompetitorDecisionReviewQueue). Extracted a shared `CompareConfidenceTier`
  component (src/wingman2/components/compare/CompareConfidenceTier.tsx) used by
  both the Recommendation verdict lead and the Side-by-side header, replacing
  the duplicated span markup; `CompareShowdown`'s `verdictTier.tone` now types
  against the shared `CompareConfidenceTone`.
- **Tests**: new CompareConfidenceTier.test.tsx pins each tone's glyph +
  aria-hidden contract and the uniqueness of the four glyphs; the showdown
  header test and the verdict-lead render tests assert the glyph on their
  surfaces.
- Validation: full suite 1097 green, typecheck clean, `govern:wyrestorm` gate
  green; synced to main; live-verified — Side-by-side header shows "!
  PLAUSIBLE — CONFIRM" and the unknown-SKU verdict lead shows "? EVIDENCE
  PENDING", screenshot confirmed, no console errors beyond the expected 401.

## 2026-08-16 — Strong-direction regression fixture + status-ladder coupling fix

- **Finding**: the green "Strong direction" tier (and "Partial match") were
  structurally unreachable on the Compare page. `rigorousMatchToCandidate`
  pushed every WyreStorm product's positioning caveat ("Use for... / confirm X
  before quoting") into `dependencies`, and `compareReportedStatus` returns
  "checks" whenever `dependencies` is non-empty — so every candidate in the
  page resolved to "checks" regardless of the engine decision. A probe across
  the whole competitor catalogue confirmed the second blocker: the decision
  classifier never emits a fully clean GOOD MATCH for real pairs (only 2 GOOD
  MATCH outcomes exist, both with 3 verify items each).
- **Coupling fix** (`rigorousMatchToCandidate`): the product caveat now flows
  into `checks` (where "confirm X before quoting" belongs) instead of
  `dependencies`; `dependencies` now holds only genuine system requirements
  (one-box-replacement needs). The strong tier is now reachable, card copy is
  preserved (quote checks still merge checks + unknowns + dependencies), and no
  pinned status changed — real pairs still resolve to "checks" because the
  engine's own verify items are never empty.
- **Regression fixture** (`ComparePageNew.strongDirection.test.tsx`): a render
  test that renders the full page for Crestron DM-NVX-350 (a verified-profile
  competitor, so no limited-data warning trips the gate) and forces ONE
  decision — NHD-500-TX, its real NetworkHD 500 lead — to be genuinely clean
  via a targeted `classifyCompetitorCompareDecision` delegation mock. All other
  engine paths run real. Asserts the green "Strong direction" chip with its ✓
  glyph, the "A close WyreStorm match exists" heading, the NHD-500-TX
  suggestion, and the "Match" assessment rail.
- Validation: full suite 1098 green, typecheck clean, `govern:wyrestorm` gate
  green; synced to main; live-verified — CLICKSHARE-CX-30 and DGX1600-ENC still
  render "Plausible — confirm" with their pre-quote checks intact (caveat
  wording preserved).

## 2026-08-16 — Verdict tier carried into proposal / response-pack export

- The Compare page's explicit confidence tier now rides the full save path so a
  quoted comparison keeps the same label a rep saw on screen:
  - `handleCommit` records `confidence: <tier label>` on the stored compare run
    (the project detail page's evidence timeline already renders
    `compareRun.confidence || matchType` as the status chip, so it now shows
    "Plausible — confirm" instead of the raw "PARTIAL MATCH"), and prepends
    "Compare verdict: <tier>" to the committed product selection's evidence.
  - The proposal export's BOM evidence basis takes `product.evidence[0]`, so the
    tier appears in the exported proposal HTML ("Evidence basis") and the BOM
    CSV evidence column for compare-sourced selections.
  - `buildSalesReadinessPackage` now includes the confidence label in its
    comparison-evidence line ("... scored 96 (Plausible — confirm)"), which
    flows into the proposal/response-pack evidence surfaces.
- Tests: proposalExport.test.ts pins the tier flowing through buildBomRows into
  both the CSV and the proposal HTML evidence basis.
- Validation: full suite 1099 green, typecheck clean, `govern:wyrestorm` gate
  green; synced to main; live-verified — committing the CLICKSHARE-CX-30
  comparison writes `compareRun.confidence = "Plausible — confirm"` and
  `selection.evidence[0] = "Compare verdict: Plausible — confirm"` into the
  project store (both verified from the live browser's localStorage).

## 2026-08-16 — Verdict tier carried into the printed customer one-pager

- The Side-by-side tab's "Print customer one-pager" now carries the same
  explicit confidence label (with its colour-blind-safe glyph) that the
  on-screen verdict lead and side-by-side header show. `buildOnePagerHtml`
  gains an optional `tier` argument and renders a second pill beside the
  decision pill ("! Plausible — confirm") with a print-safe tone style —
  coloured border + text, never colour-only, since the label and glyph are
  text and survive monochrome printing. `openOnePager` and the button's
  onClick thread the component's `verdictTier` through.
- `TONE_GLYPH` is now exported from CompareConfidenceTier so the print pill and
  the on-screen chip can never diverge.
- Tests: CompareShowdown tests pin the tier pill (label + glyph + tone class)
  in the one-pager HTML when a tier is supplied and its absence without one.
- Validation: full suite 1101 green, typecheck clean, `govern:wyrestorm` gate
  green; synced to main; live-verified — the Side-by-side header renders the
  "!Plausible — confirm" chip with the print button present (popup windows are
  blocked in the sandboxed preview, so the printed HTML itself is pinned by the
  unit tests).

---

## Verdict-lead front-panel redesign (16 Aug 2026)

The Compare page's verdict lead — the front panel a rep sees first — now renders
the comparison the way an AV engineer reads a signal flow: as a routed link
from the competitor product into the WyreStorm product, instead of a bare
heading.

- **Signal-route faceplate**: the banner is now a machined panel (hairline
  top-edge highlight) containing a route strip — `COMPETITOR
  BARCO CLICKSHARE-CX-30 ──▶ WYRESTORM SW-640L-TX-W` in Cascadia mono with a
  status LED lamp at the source end and an arrowhead at the destination.
- **Tone-follows-chip**: the lamp, routed line, and panel inset are driven by
  the confidence-tier chip's tone (via `:has()`), never by the status class —
  so an amber "Evidence pending" chip can never sit on a red no-match panel
  (the compound-selector bug this exposed was caught live and fixed).
- **Honest broken-route**: "No equivalent" renders the link as a dashed red
  broken trace with a red lamp and red destination label — the route visibly
  does not connect.
- **Live-verified** all three tones in the running app: confirm (amber solid,
  CLICKSHARE-CX-30 → SW-640L-TX-W), pending (amber, unknown typed SKU), none
  (red dashed, Airtame Cloud). Strict typecheck, governed render gate (9 files
  / 26 tests), and sales-facing-language checks pass; the style-drift baseline
  needs +24 sections when this lands (all in wingman-workflow-theme.css).

---

## Backend API design audit (api-design-principles) — 16 Aug 2026

Audited the Wingman backend HTTP surface — `server/competitor-lookup-server.mjs`
(2631-line hand-rolled Node router, no framework), the agents router
(`server/routes/agents.mjs`), and the governance / intelligence / approvals
handlers — against REST design principles.

### Surface

~45 endpoints: `/api/health|ready|health/details`, `/api/csrf`,
`/api/wingman/*` (auth, workspace, projects, invitations, governance, audit,
telemetry, agents), `/api/competitor/*` (resolveMatch, liveLookup),
`/api/competitor-lookup` (+ `/api/wingman/competitor-lookup` alias),
`/api/competitor-approvals`, `/api/competitor-lookup/diagnostics*`,
`/api/governance/*`, `/api/intelligence/*`, `/api/product-intelligence/*`,
`/api/compare/match|analyze`. No OpenAPI spec exists.

### Findings (by principle)

1. **Verb-style actions in resource URLs** — `resolveMatch`, `liveLookup`,
   `build-competitor`, `build-wyrestorm`, `mark-ready`, `sync`, `clear`,
   `prune`, `refresh`, `upsert`, `confirm`, `approve`, `accept`, `resolve`.
   Several are state transitions REST would model as PATCH on the resource
   (`mark-ready`, `drafts/status`, `approve`, `confirm`); others are
   genuinely RPC. The bigger issue is **three overlapping namespaces** for the
   same concern (competitor matching): `/api/competitor/resolveMatch`,
   `/api/competitor-lookup`, and `/api/compare/match|analyze` — plus a live
   **duplicate route alias** `/api/wingman/competitor-lookup` ===
   `/api/competitor-lookup`.
2. **Status-code semantics** — `resolveMatch` returned **400 on "no match
   found"**, conflating a valid business outcome (nothing matched) with a
   malformed request. Fixed: now 200 with `{ok:false, error}` (4xx reserved
   for bad input/auth). The 401 gate, 404 fallback shape, and 413 body limit
   (`parseJsonBody` + `MAX_JSON_BODY_BYTES`) were already correct.
3. **Inconsistent response envelopes** — health uses `{status:"ok"}`,
   ready uses `{ready:true}`, the 404 uses `{ok:false,error,route}`, most
   handlers use `{ok:boolean,error?}`, but `/api/compare/match|analyze` used
   bare `{error}` on 500 and `analyze` unwrapped `result.competitor`.
   Fixed: both compare endpoints now emit `{ok:true, ...result}` / `{ok:false,
   error}`. (Both endpoints have zero in-app callers — dead surface.)
4. **HTTP method semantics** — `clear`/`prune`/`mark-ready`/`approve`/
   `confirm` as POST actions are defensible for this internal tool but
   inconsistent with each other; a PATCH pass would tidy them.
5. **Pagination** — the decision queue accepts `?limit=` (safely coerced);
   diagnostics caps at `LOOKUP_RUNTIME_EVENT_MAX`. Adequate for internal use;
   no cursor pagination, fine at this scale.
6. **Rate limiting** — present for live lookup (window + max exposed in
   health); other mutation endpoints (approvals, intelligence builds) have no
   limit — acceptable behind the auth gate.
7. **Versioning** — no `/api/v1` prefix; breaking changes to
   `resolveMatch`'s shape have shipped without a version guard. Risk is low
   (single client, in-repo) but a `v1` prefix at next breaking change would
   be cheap insurance.
8. **Security posture (already good)** — CSRF double-submit guard
   (inert until `WINGMAN_CSRF_ENFORCE=true`), per-route permission checks,
   body-size cap, host/loopback-only local bypass for intelligence drafts.

### Changed (safe, verified)

- `resolveMatch`: no-match → **200 `{ok:false,error}`** (was 400).
- `/api/compare/match` + `/api/compare/analyze`: unified **`{ok:true,...}` /
  `{ok:false,error}`** envelopes.
- Verified: `node --check`, all 5 server suites (48 tests via vitest), and
  `check:workflow` (asserts the 401 gates still fire).

### Recommended next steps (not done — bigger changes)

1. **OpenAPI spec** (`docs/api/openapi.yaml`) generated from the router —
   the single highest-value addition: it forces the envelope/status decisions
   above to be explicit and gives the Supabase-edge client one source of truth.
2. **De-duplicate the alias** — pick `/api/competitor-lookup` and migrate the
   client (`wingmanApi.ts`) off `/api/wingman/competitor-lookup`.
3. **Consolidate the three competitor-matching namespaces** into one
   resource (`/api/competitors/{id}/match` + `/api/competitors/lookup`),
   retiring `resolveMatch`/`liveLookup`/`compare/*` behind it.
4. **PATCH pass** for state transitions (`projects/:id`, `drafts/:id/status`,
   `decisions/:id`).
5. **`v1` prefix** at the next breaking change.
