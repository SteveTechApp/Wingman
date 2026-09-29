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

Sign-off: Steve ______________ date __________ · Transfer results to [`LAUNCH_CHECKLIST.md`](LAUNCH_CHECKLIST.md) (§4 go/no-go + §"Decisions still required") before leaving the meeting.
