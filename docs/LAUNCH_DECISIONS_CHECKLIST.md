# Launch decisions — meeting checklist (one page)

The five decisions from [`LAUNCH_DECISION_BRIEF.md`](LAUNCH_DECISION_BRIEF.md)
(pre-read: one short section each), pre-filled with the recommended answer so
the meeting confirms or overrides rather than deliberates from scratch. Print
this page; tick or strike; write overrides on the dotted lines. Detail lives in
the brief's matching section.

Meeting date: __________  Attendees: ____________________________  Decision owner: Steve

---

### 1 · Hosting — Render Blueprint, paid starter tiers, Frankfurt confirmed  _(brief §1)_

- [ ] **Approve:** Render Blueprint as committed (`render.yaml`), both services upgraded `free` → **Starter**, `autoDeploy: false` kept.
- [ ] **Region** confirmed against where reps actually sit: Frankfurt ☐ keep ☐ change to __________
- [ ] Override: ______________________________________________________________
- [ ] Next action: stand up staging per [`RENDER_STANDUP_RUNBOOK.md`](RENDER_STANDUP_RUNBOOK.md) — owner __________ date __________

Cost: two starter instances, tens of $/month. Unblocks: the staging stand-up.

### 2 · Database — Supabase paid project, `supabase-tables`  _(brief §2)_

- [ ] **Approve:** hosted Supabase, **paid tier** (~$25/mo — removes free-tier inactivity pausing, adds backup retention), `supabase-tables` mode.
- [ ] Override: ______________________________________________________________
- [ ] Next action: provision the project, apply migrations 001–015, `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` into Render secrets only, one **backup-restore test** before real data lands — owner __________ date __________

Cost: ~$25/mo. Unblocks: all persistence work and every evidence run.

### 3 · Auth — email/password, admin-provisioned, no SSO  _(brief §3)_

- [ ] **Approve:** email/password only, admin-provisioned accounts, no SSO/OAuth at launch.
- [ ] **Ask WyreStorm IT in this meeting:** is corporate identity mandated? ☐ No → proceed ☐ Yes → fallback is still admin-provisioned accounts + password-reset runbook (not SSO)
- [ ] Next action: record "email/password, admin-provisioned" in the launch checklist — owner __________ date __________

Cost: none. Unblocks: account provisioning; finalises the CSRF/cookie posture.

### 4 · API keys — Gemini now (quota-capped); CSE deferred; model-backed Guru on  _(brief §4)_

- [ ] **Approve:** create `GEMINI_API_KEY` **with a quota cap** now; defer Google CSE until reps ask for it.
- [ ] **Guru operating mode recorded for the pilot:** model-backed agent **on**, local grounded Guru as fallback (`WINGMAN_AGENT_FORCE_MOCK=false`) ☐  locally-derived only ☐
- [ ] Model default `gemini-2.5-flash` acceptable: ☐ yes ☐ override __________
- [ ] Next action: key → Render secrets; record the approved mode in OPERATIONS §1 — owner __________ date __________

Cost: negligible at pilot volume. Unblocks: staging UAT runs; Guru mode sign-off.

### 5 · Audience — internal sales pilot only; external out of scope for now  _(brief §5)_

- [ ] **Approve:** internal sales, one workspace, admin-provisioned accounts; staging first, production after the v1.0 evidence rows close.
- [ ] Record in the go/no-go table: _"internal sales pilot; external launch explicitly out of scope until the v1.0 evidence rows close."_
- [ ] Sequencing accepted: stand-up → load test → mobile UAT → pilot/observation window → offline UAT → dated go/no-go meeting.

Cost: none. Unblocks: the launch sequence and the observation-window evidence.

---

## The five answers, one line each

**1 Hosting:** Render paid · **2 Database:** Supabase paid · **3 Auth:** password-only · **4 Keys:** Gemini yes / CSE no · **5 Audience:** internal-only

☐ **All five approved as recommended** → start [`RENDER_STANDUP_RUNBOOK.md`](RENDER_STANDUP_RUNBOOK.md) this week.
☐ **Any override** → re-run the affected section of the brief before the stand-up is scheduled.

---

## 6 · Evidence criteria action plan (added 2026-09-30)

The [`release-evidence-manifest.json`](release-evidence/release-evidence-manifest.json)
holds four closed criteria (governed-profile confirmation, waterfall split,
SSRF guard coverage, offline sync resilience) and four still blocked — all on
external evidence, none on missing tooling. Critical path and owners:

```
Governed-review backlog (A1)  ✅ closed 2026-09-30 — 206/206 profiles human-verified, zero overdue
  (evidence: release-evidence/governed-profile-confirmation-2026-09-30.md, manifest row `governed-profile-confirmation`)
  └─ dependency satisfied → PR #246 MERGED 2026-09-30 (72e1eaf6), all CI gates green
  │    post-merge on main (2026-09-30): Verify (data) ✅ + Governed Data Gate ✅
  │    PR #251 MERGED 2026-09-30 (51120195): Verify (data) ✅; Data Gate not
  │    triggered — its diff touched no data/governance|data-sources paths
        → Render stand-up (A2)  ◀ the critical path now runs through here
              └─ staging exists → load test (A3)  ‖  device UAT (A4, parallel)
                                                  └─ production → 30-day window (A5)
```

| # | Action | Closes | Owner | When |
|---|---|---|---|---|
| A1 ✅ closed 2026-09-30 | Governed-profile confirmation backlog — CLOSED: 206/206 profiles human-verified, all attributed to the reviewer of record Steve Goodwin (116 @ 2026-08-16 batches 1–2 + 90 @ 2026-09-30 R1–R5; the 2026-08-16 attribution re-signed from the bare "Steve" the same day), zero overdue; evidence recorded in [`release-evidence/governed-profile-confirmation-2026-09-30.md`](release-evidence/governed-profile-confirmation-2026-09-30.md) and as manifest criterion `governed-profile-confirmation` (pass) in [`release-evidence-manifest.json`](release-evidence/release-evidence-manifest.json) | unblocked `Verify (data)` → **PR #246 merged** (2026-09-30, CI green) | Engineering reviewer (Steve delegates) | closed 2026-09-30 — evidence filed |
| A1b ✅ 2026-09-30 | Data-side blockers before the #246 merge — CLOSED: both `Verify (data)` and `Governed Data Gate` green on the confirmation commits (gate runs 11:42/11:53 UTC); the only non-data blocker was the CSS size budget, cleared by its reviewed exception (`34a43c91`) | **#246 merged** (2026-09-30 11:57 UTC, `72e1eaf6`) with all checks green, incl. main's own gate run | Release owner (Steve) | recorded 2026-09-30 — see the triage doc's outcome note |
| A2 ◐ 2026-09-30 | Render stand-up per [`RENDER_STANDUP_RUNBOOK.md`](RENDER_STANDUP_RUNBOOK.md) §1–§5, including the §5 acceptance checks — PREPARED: pre-flight done (deploy commit `51120195` verified — CI 16/16 on the merge commit; hygiene check clean; harness green), acceptance script + staging record filed in [`staging/`](staging/A2-staging-record-2026-09-30.md) — that record doubles as A2's working log (dated entries per runbook step, same discipline as A1's triage record); dashboard steps (Supabase project, Blueprint apply, secrets, monitoring) awaiting Steve's clicks — RECORD ON COMPLETION: §5 pass states + the `storage.mode.resolved` line into the staging record, then tick this row and transfer the staging entry to [`LAUNCH_CHECKLIST.md`](LAUNCH_CHECKLIST.md) §4 | produces staging (dependency of A3–A4) | Infrastructure (dashboard) + agent (prep/verification) | in progress — click-path ready |
| A3 ☐ awaiting A2 | Authenticated staging load test: `npm run load-test` `--strict` against staging with the manifest budgets (p95 ≤ 1000 ms, p99 ≤ 2000 ms, error ≤ 1%) — RECORD ON COMPLETION: a strict-clean run auto-writes the dated artifact + sidecar (`docs/release-evidence/load-test-<level>-<date>.md`) and prints the paste-ready row; fill the `production-like-load` manifest row with it (approver = reviewer of record) and re-run `generate:release-docs` + `check:release-evidence` | `production-like-load` | Infrastructure + performance owner | within 30 days of launch date, not banked early |
| A4 ☐ awaiting A2 | Device UAT sessions per [`MOBILE_UAT_PLAN.md`](MOBILE_UAT_PLAN.md) + [`OFFLINE_RECONNECT_UAT_PLAN.md`](OFFLINE_RECONNECT_UAT_PLAN.md): two named accounts, three devices, Drills A–D, signed dated result — RECORD ON COMPLETION: fill both manifest rows from the dated evidence folders (`mobile-uat-<date>/`, `offline-reconnect-uat-<date>/` — uat-summary, defects, device-matrix, screenshots, sign-off) and re-run `generate:release-docs` + `check:release-evidence` | `mobile-sales-uat` + `offline-reconnect-uat` | Sales lead + mobile tester | within 90 days; any time staging is stable |
| A5 ☐ last | Production deploy, then agree window length + operational export with Operations — RECORD ON COMPLETION: fill the `production-observation-window` manifest row from the dated operational export (30-day expiry from measuredAt) and re-run `generate:release-docs` + `check:release-evidence` | `production-observation-window` | Operations + product analytics | only after first real deploy |

Sequencing rules: the two 30-day expiries mean A3 and A5 are measured **near**
launch; the two 90-day human criteria can be banked as soon as staging is
stable. No new tooling is required — every criterion already has its
instrument; the bottleneck is human sign-off, not code. Transfer outcomes to
[`LAUNCH_CHECKLIST.md`](LAUNCH_CHECKLIST.md) §4 as each row closes.

**Standing dependency (why the confirmation backlog stays on this page after
A1):** the confirmation-aging gate is calendar-driven required CI on `main`
(`Verify (data)` + `Governed Data Gate`). It fails on **every** merge — any
branch, any PR — once a machine-transcribed profile sits 30 days past its
evidence date, because the gate runs against main's tracked data. A1 cleared
the 2026-09-30 backlog, but the dependency recurs whenever new unconfirmed
profiles land. Keep it green: confirm new profiles within 30 days, via the
triage doc's groupings (R1–R5 sittings or T1–T10 families — both render in the
dashboard's Governed Profiles confirmation strip) and the batch apply tool
(`node tools/apply-governed-review-pass.mjs`, which prompts for a reviewer of
record). A stale backlog blocks launches, not just PRs.

**Second standing dependency (evidence freshness, added 2026-09-30):** for
already-verified profiles a *different* clock now runs: the technical-data
strict gate warns when a verified profile's newest evidence ages past 60 days
and hard-fails past 120 (thresholds in `profile-confirmation-aging.json`).
Confirmation proves a human looked; freshness proves the look is still
current — official pages move and rot (the daily liveness gate catches
today's 404s, e.g. the 27 dead pages it found on 2026-09-30; the freshness
gate catches the slower decay). The cure is a refresh pass: re-check the
official page and record a new dated evidence entry — no value change
required, the profile's evidence clock then resets. First refresh pass is due
around **2026-11-29** (60 days after the 2026-09-30 confirmations).

Sign-off: Steve ______________ date __________ · Transfer results to [`LAUNCH_CHECKLIST.md`](LAUNCH_CHECKLIST.md) (§4 go/no-go + §"Decisions still required") before leaving the meeting.
