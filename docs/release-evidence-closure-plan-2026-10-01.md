# Release-evidence closure plan — 2026-10-01

Closes the four blocked criteria in
[`release-evidence-manifest.json`](release-evidence/release-evidence-manifest.json)
using only instruments that already exist. Fastest realistic v1.0: **Fri
2026-10-23**. Plan owner: release owner (Steve); agent handles prep,
verification and filing. **Everything below assumes the five-decision meeting
happens Thu 2026-10-01/02** ([LAUNCH_DECISIONS_CHECKLIST.md](LAUNCH_DECISIONS_CHECKLIST.md));
every date shifts one-for-one with that meeting.

## Critical path with dates

```
D-meeting (Thu Oct 1–2, 30 min)
  └─ A2 Render stand-up (Fri Oct 2, ~2–3h incl. Steve's clicks)
       ├─ B1 A3 load test .............. Mon Oct 5  (banked, NOT row-filled)
       ├─ B2a A4 mobile UAT ............ Tue Oct 6  (~half day, 3 testers)
       ├─ B2b A4 offline UAT ........... Wed Oct 7  (~85 min, same devices)
       │    ├─ both rows filled + gates Tue Oct 7 PM (agent)
       │    └─ quality-gate fixes if UAT found defects ... Thu–Fri Oct 8–9 (buffer)
       └─ C1 production deploy ......... Mon Oct 12
            └─ C2 7-day pilot window ... Oct 12–19 (F1–F6 freshness sitting inside — C2b)
                 └─ C3 export + row fill ... Tue Oct 20 (window may close Oct 19)
                      └─ v1.0 go/no-go .... Fri Oct 23
```

## Workstream A — staging (critical path)

**A2 — Render stand-up** · Fri **Oct 2** · owner: Steve (dashboard) + agent (prep/verify)
Already prepared 2026-09-30: pre-flight verified, deploy commit pinned
`51120195`, acceptance script staged ([staging record](staging/A2-staging-record-2026-09-30.md)).
Remaining: Supabase project + schema, Blueprint apply (Starter plans), env
table, §5 acceptance checks 1–8, monitoring. Done = record's definition-of-done
section; tick the A2 row, transfer to [LAUNCH_CHECKLIST.md §4](LAUNCH_CHECKLIST.md).

## Workstream B — human evidence (parallel, after A2)

**B1 — A3 load test** · Mon **Oct 5** · owner: agent (Infrastructure sign-off)
`node tools/load-test.mjs --base-url https://<staging> --cookie <session>
--level standard --strict --evidence production-like-load` (budgets p95 ≤ 1000,
p99 ≤ 2000, error ≤ 1%). Strict-clean runs auto-write the dated artifact +
sidecar and print the paste-ready row. **Deliberately not row-filled yet** —
30-day expiry is measured from measuredAt; the row gets filled when the launch
date is fixed (see C3). Sept 30 smoke baseline: health p95 3.17 ms, project-save
p95 78.15 ms — large headroom against the 1000 ms budget.

**B2 — A4 device UAT, two sessions** · Tue **Oct 6** + Wed **Oct 7**
Both criteria can be closed by the **same testers on the same devices in one
combined visit**; the manifest keeps them as separate sessions and separate
evidence folders. Named accounts × 2, devices: small phone, large phone, tablet.

| Session | Date | Scope | Pass rule |
|---|---|---|---|
| Mobile UAT (B2a) | Tue Oct 6, ~half day | 3 money-path journeys × 3 device classes per [MOBILE_UAT_PLAN.md](MOBILE_UAT_PLAN.md) | all journeys unaided, zero open blockers |
| Offline UAT (B2b) | Wed Oct 7, ~85 min | Drills A–D per [OFFLINE_RECONNECT_UAT_PLAN.md](OFFLINE_RECONNECT_UAT_PLAN.md); real airplane mode, both conflict-banner paths, Drill B strict desktop replay | A/C/D real-device pass + B replay, zero blockers |

**B3 — fill both rows + gates** · Tue **Oct 7 PM** · owner: agent
Two dated folders per convention (uat-summary.md, defects.csv,
device-matrix.md, screenshots/, sign-off.md); Steve signs sign-off.md; agent
fills `mobile-sales-uat` + `offline-reconnect-uat` rows (measuredAt = session
date, 90-day expiry → valid into January), runs
`npm run generate:release-docs && npm run check:release-docs &&
npm run check:release-evidence`.

**Buffer Thu–Fri Oct 8–9** absorbs UAT-found defects: UAT findings that are
defects route to the queue and re-run only the failed journey/drill; findings
that are plan friction are noted in defects.csv and adjudicated by the release
owner. If either session reveals an open blocker, v1.0 slips by a week per fix
cycle — this is the plan's single largest uncertainty and the reason the row
fill is same-day, before the pilot starts.

## Workstream C — production observation (sequential, after UAT passes)

**C1 — production deploy** · Mon **Oct 12** · owner: Steve + Infrastructure
Internal-sales pilot goes live per [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md)
Phases A–E; email/password admin-provisioned accounts only; a smoke project
round-trip + one backup-restore rehearsal precede real data (per
[LAUNCH_DECISIONS_CHECKLIST.md](LAUNCH_DECISIONS_CHECKLIST.md) §2). Trigger for
C1 is B3 green — not a calendar date.

**C2 — pilot observation window** · Oct **12–19** (7 days) · owner: Operations + product analytics
Agent pre-stages the export script during B week so day 1 of the window is not
spent on tooling. Window length is agreed with Operations at C1 time; 7 days is
the fastest defensible span for a handful of reps — long enough to cover a full
weekly sales cycle, short enough to keep the 30-day expiry safe.

**C2b — evidence-freshness sitting F1–F6** · Oct **13–16** · owner: engineering
reviewer(s) + agent (batch tooling). All 206 verified profiles re-checked and
re-evidenced inside the window (procedure and batches:
[evidence-freshness-refresh-plan-2026-10-01.md](evidence-freshness-refresh-plan-2026-10-01.md)).
Wave 1 (116 profiles, Aug-16 evidence) would trip the 60-day warn on Oct 15 —
mid-sitting — so the amber lane never accumulates during the go/no-go run-up,
and the freshness leg of the governed-profile-confirmation criterion stays
green through the Oct 23 v1.0 decision. Effort ≈4–5 h across the week, data
governance only, invisible to reps.

**C3 — operational export + fill row** · Tue **Oct 20** · owner: agent, data from Operations
Fill `production-observation-window` (30-day expiry from measuredAt → covers a
v1.0 meeting any time into mid-November), re-run
`generate:release-docs` + `check:release-evidence`, then **back-fill the
`production-like-load` row from B1's banked artifact** (measured Oct 5; if more
than ~14 days have elapsed, re-run the strict command — it takes minutes).

**v1.0 go/no-go** · Fri **Oct 23** · owner: release owner. All four rows pass;
[PRE_PRODUCTION_REPORT.md](PRE_PRODUCTION_REPORT.md) regenerates green.

## Expiry ledger (the plan's hard constraints)

| Criterion | measuredAt | Expires | Coverage vs Oct 23 go/no-go |
|---|---|---|---|
| production-like-load | Oct 5 (banked) | Nov 4 | 12 days of margin — fill row at C3, re-run if > 14 d elapsed |
| mobile-sales-uat | Oct 6 | Jan 4 | 73 days of margin |
| offline-reconnect-uat | Oct 7 | Jan 5 | 74 days of margin |
| production-observation-window | Oct 19/20 | Nov 18/19 | 26 days of margin — go/no-go must not slip past Fri Oct 23 without re-running A3 |

The binding constraint is the **load-test 30-day expiry**: A3 can be banked any
time after A2, but the go/no-go must land within 30 days of it, or the row is
re-measured (cheap, but don't bank evidence into a drawer).

## Assumptions

1. The five-decision meeting happens Oct 1–2. Each day of slip moves every date
   one-for-one; the Oct 23 v1.0 date moves with them.
2. No open-blocker defects from UAT (the plan already budgets a 2-day fix
   buffer; a blocker adds a fix-cycle week).
3. Steve's dashboard availability: ~2–3 h Fri Oct 2, ~1 h Oct 7 (sign-off),
   ~1 h Oct 12 (deploy), 30 min Oct 23 (go/no-go).
4. `51120195` stays the deploy commit; if main moves first, re-pin in the
   staging record's pre-flight (same discipline as the 2026-09-30 refresh).
5. The 129 unconfirmed store SKUs and the freshness-lane branch
   (`codex/evidence-freshness-lanes`, unmerged) do **not** gate v1.0: the
   confirmation-aging gate fires only once those profiles age past 30 days
   (stage confirmations during the C2 window at the latest — see LAUNCH_DECISIONS_CHECKLIST
   "standing dependency"), and the freshness branch rides a normal PR review.
   The evidence-freshness sitting is likewise scheduled inside C2 (C2b), so
   neither governance clock runs against the go/no-go.

## What this plan deliberately does not do

- **No new tooling** — the manifest states every criterion has its instrument;
  building more would delay the only human-gated bottleneck.
- **No merging of the two UAT sessions' evidence** — one visit, two folders,
  two rows; the manifest's pass rules and 90-day clocks stay independent.
- **No early row-filling** — the two 30-day expiries are why A3 is banked
  Oct 5 but filled Oct 20, and why the observation window is 7 days, not 30.
- **No v1.0 label before Oct 23** — until then the supported posture remains a
  controlled authenticated internal pilot.
