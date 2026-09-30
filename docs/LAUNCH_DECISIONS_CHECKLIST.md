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
holds three closed criteria (waterfall split, SSRF guard coverage, offline sync
resilience) and four still blocked — all on external evidence, none on missing
tooling. Critical path and owners:

```
Governed-review backlog (A1, ~90 profiles)
  └─ unblocks PR #246 merge → Render stand-up (A2)
        └─ staging exists → load test (A3)  ‖  device UAT (A4, parallel)
                                            └─ production → 30-day window (A5)
```

| # | Action | Closes | Owner | When |
|---|---|---|---|---|
| A1 | Work the governed-profile confirmation backlog (90 SKUs, batches T1–T10 in the 2026-09-30 triage; `npm run check:governed-review-pass`) | unblocks `Verify (data)` → **PR #246 merge** | Engineering reviewer (Steve delegates) | now — the aging clock compounds daily |
| A2 | Render stand-up per [`RENDER_STANDUP_RUNBOOK.md`](RENDER_STANDUP_RUNBOOK.md) §1–§5, including the §5 acceptance checks | produces staging (dependency of A3–A4) | Infrastructure | day of merge |
| A3 | Authenticated staging load test: `npm run load-test` `--strict` against staging with the manifest budgets (p95 ≤ 1000 ms, p99 ≤ 2000 ms, error ≤ 1%) | `production-like-load` | Infrastructure + performance owner | within 30 days of launch date, not banked early |
| A4 | Device UAT sessions per [`MOBILE_UAT_PLAN.md`](MOBILE_UAT_PLAN.md): two named accounts, three devices, Drills A–D, signed dated result | `mobile-sales-uat` + `offline-reconnect-uat` | Sales lead + mobile tester | within 90 days; any time staging is stable |
| A5 | Production deploy, then agree window length + operational export with Operations | `production-observation-window` | Operations + product analytics | last; only after first real deploy |

Sequencing rules: the two 30-day expiries mean A3 and A5 are measured **near**
launch; the two 90-day human criteria can be banked as soon as staging is
stable. No new tooling is required — every criterion already has its
instrument; the bottleneck is human sign-off, not code. Transfer outcomes to
[`LAUNCH_CHECKLIST.md`](LAUNCH_CHECKLIST.md) §4 as each row closes.

Sign-off: Steve ______________ date __________ · Transfer results to [`LAUNCH_CHECKLIST.md`](LAUNCH_CHECKLIST.md) (§4 go/no-go + §"Decisions still required") before leaving the meeting.
