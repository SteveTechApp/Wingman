# Evidence-freshness refresh pass plan — pre-staged 2026-10-01

Keeps the evidence-freshness gate (warn 60d / fail 120d, thresholds in
`data/governance/profile-confirmation-aging.json`) permanently green. The
refresh is a **re-check, not a re-confirmation**: confirm the official page is
live and the profile's values still match it, then append a new dated evidence
entry — no value change where nothing changed. All figures below are computed
from the tracked store (`data/governance/wyrestorm-technical-profiles.json`),
not estimated.

## Computed schedule (the real answer to "who ages first")

The 206 verified profiles sit in exactly **two evidence cohorts**:

| Cohort | Profiles | Newest evidence | Warn (+60d) | Fail (+120d) |
|---|---|---|---|---|
| Aug-16 pass (batches 1–2) | **116** | 2026-08-16 | **2026-10-15** | 2026-12-14 |
| Sep-30 pass (R1–R5) | **90** | 2026-09-30 | 2026-11-29 | 2027-01-28 |

**The first wave is 116 profiles tripping the warn threshold on Wed 2026-10-15
— two weeks out, not late November.** The second wave (90) trips Nov 29. No
profile is undatable; no other evidence dates exist in the store.

## Recommended posture: one combined sitting inside the C2 pilot window, Oct 13–16

**(Adopted 2026-10-01 — supersedes the original Nov 16–20 recommendation,
which remains below as the documented fallback.)** The closure plan's C2 pilot
observation window (Oct 12–19, see
[release-evidence-closure-plan-2026-10-01.md](release-evidence-closure-plan-2026-10-01.md))
contains wave 1's Oct 15 warn date, so the sitting runs **Oct 13–16 as launch
action C2b**: wave 1 is re-evidenced at day 58–61 of its evidence age — at or
just past the warn line — leaving **59–62 days of remaining freshness budget**
against the new 120-day fail horizon (~Feb 10–13, 2027), roughly double the
24–28 days the November posture left. Wave 2 is re-evidenced while still
fresh, the amber lane never accumulates during the go/no-go run-up, and the
freshness leg of the governed-profile-confirmation criterion stays green
through the Oct 23 v1.0 decision. After the sitting all 206 profiles share
October evidence dates (next annual sitting ~mid-December 2026, or January
for a comfortable margin).

*Fallback posture (was the original recommendation): one combined sitting,
week of Nov 16–20.* Let wave 1 sit in the amber lane for ~5 weeks and refresh
both cohorts then: wave 1 at ~92–96 days — 24–28 days of margin before its
Dec 14 hard-fail, the whole week as slack — and wave 2 at ~48–52 days (still
fresh, refreshed anyway). After the sitting all 206 profiles share November
evidence dates: one annual rhythm, next sitting due by mid-April 2027. The
amber "116 evidence aging" chips appearing Oct 15 are expected and scheduled
in this posture — that is the warn lane doing its job, not a regression, and
PR #253's filter chips are the working surface either way. Use this posture
only if the C2 sitting cannot be staffed during the pilot week — the cost is
five weeks of amber chips on the governance dashboard crossing the Oct 23
go/no-go.

*Second alternative (staggered):* refresh wave 1 in the week of Oct 19–23 and
wave 2 in the week of Nov 30–Dec 4. Zero amber time, but two sittings forever
and permanently staggered clocks.

## The re-check procedure (per profile)

1. **Open the profile's `evidenceUrl`** (the official WyreStorm page from the
   newest evidence entry). Page must return 200 — the daily liveness gate
   catches dead pages the same morning, so a 404 here means re-source first
   (same discipline as the 2026-09-30 liveness catch, commit `931b39cf`).
2. **Compare the profile's spec-critical fields** (max-resolution, routed-io,
   power, profile-scope) against the live page.
3. **Value changed?** Fix the governed value FIRST, with the page capture in
   the evidence entry — a reviewer confirms the corrected value, never a
   known-wrong one (the rule the A1 triage record enforced).
4. **Values unchanged?** Append a new evidence entry:
   `reviewedOn: <today>`, same `sourceUrl`, reviewer of record
   (`verifiedBy` stays the attribution identity, "Steve Goodwin"), a short
   capture quote. No value edits.
5. **Batch it**: work lane-filtered batches in the Governed Profiles browser
   (PR #253's "evidence aging" chip scopes the table), then sign the pass
   through `node tools/apply-governed-review-pass.mjs` — it prompts for the
   reviewer of record and refuses unsigned passes (test-pinned refusal).
6. **Gate the result**: `npm run govern:wyrestorm` re-runs the strict gate;
   done when `check:technical-data:strict` exits 0 with
   "0 past the 60-day warn threshold" and the per-cohort chips read zero.

## Pre-staged batches (for the Nov sitting; split by product class, computed from the store)

The Aug-16 cohort is signal-distribution hardware — a different mix from the
Sep-30 pass's accessory-heavy R1–R5 families — so the batches follow the
Aug-16 cohort's actual product-class composition:

| Batch | Cohort | Profiles | Scope (computed product classes) | Reviewer fit |
|---|---|---|---|---|
| F1 | Aug-16 | 38 | HDBASET extenders/scalers (38) | HDBaseT-familiar reviewer |
| F2 | Aug-16 | 20 | AVoIP encoders/decoders (20) | AVoIP-familiar reviewer (network-speed fields) |
| F3 | Aug-16 | 18 | MATRIX switchers (18) | matrix-routing reviewer |
| F4 | Aug-16 | 13 | PRESENTATION 11 + WIRELESS_PRESENTATION 1 + MULTIVIEW 1 | presentation-workstream reviewer |
| F5 | Aug-16 | 27 | DISTRIBUTION 5, UC/UNIFIED_COMMUNICATIONS 5, CONTROL 4, AUDIO 3, CAMERA 3, SWITCHER 2, VIDEO_WALL 2, USB_EXTENSION 1, ACCESSORY 1, ACCESSORY_OTHER 1 | senior reviewer (widest class spread) |
| F6 | Sep-30 | 90 | All R1–R5 families, refreshed together (single lane) | any engineering reviewer |

38+20+18+13+27 = 116 ✓; F6 covers the Sep-30 cohort of 90. Exact SKU lists
render lane-filtered in the dashboard — the table above is the working
pattern and reviewer assignment, not a hand-maintained roster.

## Calendar integration (adopted C2b schedule)

- **Oct 13–16 (C2b)**: combined sitting F1–F6 inside the C2 pilot window
  (≈4–5 h total, ≈45–60 min per batch, engineering reviewer(s) sign with the
  reviewer of record recorded). ~1.5 batches/day; F6's 90-profile lane last.
- **Oct 15**: wave 1's warn date lands mid-sitting — expected; F1–F5 work
  clears the lane as it appears.
- **Dec 14**: wave 1's old hard-fail date — retired by the sitting; the next
  hard-fail horizon is ~mid-February 2027 (October evidence + 120d).
- **Next annual sitting**: ~mid-December 2026 at the earliest, January 2027
  for a comfortable margin (all 206 on one October clock after C2b).

Historical note: the original plan targeted Nov 16–20 (fallback posture
above); wiring the sitting into the closure plan's C2 window tightened it by
a month and eliminated the amber-lane run-up to the go/no-go.
