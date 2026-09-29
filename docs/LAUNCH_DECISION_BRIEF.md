# Wingman launch-decision brief — decisions required from Steve

Five decisions in [`LAUNCH_CHECKLIST.md`](LAUNCH_CHECKLIST.md) §"Decisions still
required" block all Phase D/E launch work. Each section below states what the
codebase has already committed to, a **recommendation** with its cost/scope
consequence, and the exact next action once decided. Answering all five takes
one meeting; every downstream task (production Supabase, Render blueprint,
UAT, key provisioning) is waiting on them.

**Context that frames all five:** Wingman is a late-beta, ~300-product
catalogue, auth-gated app for WyreStorm's internal sales team. The supported
posture today is a controlled authenticated internal pilot; the v1.0 label is
no-go pending the release-evidence rows in
[`docs/release-evidence/release-evidence-manifest.json`](release-evidence/release-evidence-manifest.json).

---

## 1. Hosting target — where the app + API run

**Already committed:** a working Render Blueprint (`render.yaml`) defines both
services (Docker frontend + Docker API), private-network linking, health
checks (`/` and `/api/ready`), and a checks-gated deploy policy. Dockerfiles
for both sides are in the repo and CI builds them. Region is set to
**frankfurt** — presumably chosen for proximity to WyreStorm's distribution
business, but worth confirming where the sales team actually sits.

**Recommendation: Render, paid starter plans, Blueprint as-is.**
The Blueprint is written, tested in CI, and one `render blueprint launch` away
from a stack. Moving to another host (Fly, Railway, AWS) means re-authoring
and re-testing the deploy path right when we need evidence rows measured
against a production-like environment — pure churn.

- Upgrade both services from `free` to the cheapest paid tier. Free instances
  spin down; a rep hitting a cold start mid-customer-meeting is the exact
  failure this product cannot have. Also note free web services on Render
  don't allow custom domains without TLS quirks.
- Keep `autoDeploy: false` (deploys stay checks-gated) — already the case.
- Confirm or change `region: frankfurt` based on where reps are located, in
  the same breath as the plan upgrade.

**Cost consequence:** two paid starter instances ≈ tens of dollars/month.
**Next action after sign-off:** create the Render Blueprint from `render.yaml`,
set the paid plans, confirm region, wire uptime monitoring to `/api/health`.

---

## 2. Database — Supabase vs self-managed Postgres

**Already committed:** `supabase-tables` storage mode is the default in the
Blueprint, with `WINGMAN_STORAGE_FAIL_CLOSED=true` (no silent file-store
fallback in production). The migration set (001–015) is reconciled with
`check:migration-parity`, RLS is verified by a nightly sentinel job, and the
load-test harness has run against real Supabase fail-closed with row-level
read-back verification. Per-project PUT with CAS revision commits is live.

**Recommendation: Supabase (hosted), production project, `supabase-tables`.**
Self-managed Postgres would mean owning backups, TLS, upgrades, and a new
secret surface — for a workload that is one small app's project rows.
Supabase gives automated backups and the already-proven RLS story for about
the free/paid tier cost. This is the recommendation the repo was built
around; deciding otherwise reopens solved work.

**One decision inside the decision:** which Supabase plan. The free tier
pauses after a week of inactivity — wrong for a production database. Paid
tier (~$25/mo) removes pausing and adds backup retention. **Recommend paid.**

**Next action:** provision the production Supabase project, apply the full
migration set, set `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` in Render's
secret manager (never committed), verify with a smoke project load/save, and
test one restore from backup before any real data lands (per OPERATIONS §3).

---

## 3. Auth scope — email/password only, or SSO/OAuth

**Already committed:** email/password workspace auth with roles
(`owner`/`admin`/`sales`/`customer`), signup/login rate limiting, secure
`SameSite=Strict` cookies, CSRF double-submit implemented dark and enabled in
the Blueprint (`WINGMAN_CSRF_ENFORCE=true`). No SSO/OAuth code exists.

**Recommendation: email/password only at launch.** The audience is a handful
of internal reps (see §5) in a single workspace; admin-created accounts are
easier to control than an OAuth app registration, and the security surface
that *is* built (rate limits, CSRF, cookie policy, login-failure signals in
structured logs) is finished and tested. SSO would add a provider
integration, redirect/TLS flow, and account-provisioning questions after the
evidence rows are already waiting. Revisit only if WyreStorm IT mandates
corporate identity — that's a policy call, not a technical one, so ask IT
explicitly at this meeting.

**Internal-only nuance:** if WyreStorm IT objects to a second password store,
the fallback is admin-provisioned accounts + a password-reset runbook, not SSO.

**Next action:** confirm with WyreStorm IT; if no objection, note
"email/password, admin-provisioned" in the launch checklist and move on.

---

## 4. Production API keys — Gemini (and optional Google CSE)

**Already committed:** the Guru route the UI actually uses is **locally
derived** from grounded local data — the governed catalogue, profiles and
glossary — and is protected by its own check (`check:guru-ui`, contract gate
"calls the protected grounded service"). A separate model-backed agent
implementation exists (`server/agents/`, Gemini, vision-context agent routes)
that **fails closed without `GEMINI_API_KEY`** unless explicitly run in
deterministic mock mode. Google CSE live competitor look-up degrades
gracefully without keys and is rate-limited when on. Key rotation runbooks
for both exist (OPERATIONS §2).

**Recommendation: provision `GEMINI_API_KEY` now, skip Google CSE at launch.**
The model-backed agent is built and tested and will need its key for the
staging UAT runs anyway; provisioning it now avoids a mid-pilot scramble. Set
`GURU_GEMINI_MODEL` only if the default (`gemini-2.5-flash`) is unacceptable
to WyreStorm policy. Skip CSE: live web look-up is a nice-to-have with an
external dependency and quota; the governed competitor data already covers
the pilot. Add it later if reps ask for it — the feature exists and waits.

Also record in OPERATIONS §1's checklist line: "the approved Guru operating
mode" — i.e. whether reps see locally-derived answers only, or the
model-backed agent. **Recommendation: enable the model-backed agent for the
pilot, with `WINGMAN_AGENT_FORCE_MOCK=false` and the fallback-warnings alert
from OPERATIONS §4 watching degradation.** The local Guru remains the safety
net when the model errors.

**Cost consequence:** Gemini flash-tier pricing at pilot volume is negligible;
set a quota cap in Google AI Studio when creating the key.
**Next action:** create the Gemini key, set quota cap, store in Render
secrets, record the approved operating mode, defer CSE.

---

## 5. Launch audience — internal sales first, or external customers

**Already committed:** every doc, gate, and the release-evidence manifest
describe a controlled authenticated internal pilot; the v1.0 label is no-go
until four dated evidence rows close (mobile UAT, offline/reconnect UAT,
production-like load, production observation window). UAT and load tooling
are built and waiting for exactly this environment.

**Recommendation: internal sales only, hard-gated.** WyreStorm employees in
one workspace, admin-provisioned accounts, staging then production after the
evidence rows close. External/customer-facing launch would raise the bar on
everything at once — CSRF enforcement discipline, rate limits, data-quality
exposure of competitor intelligence, support expectations, and the UAT bar
the checklist itself ties to audience. Nothing customer-facing is missing
*because* of a quick fix; it's missing because the product hasn't been
observed in real use yet. The internal pilot is also the cheapest way to
generate that observation data: it doubles as the
`production-observation-window` evidence row.

**Sequencing this enables (each already built, each waiting on §1–§2):**
1. Render + Supabase stand-up → staging environment
2. Authenticated load test on staging (`npm run load-test`) → closes
   `production-like-load`
3. Mobile UAT per [`docs/MOBILE_UAT_PLAN.md`](MOBILE_UAT_PLAN.md) → closes
   `mobile-sales-uat`
4. Pilot begins → journey observation → closes
   `production-observation-window`
5. Offline/reconnect UAT protocol → closes `offline-reconnect-uat`
6. Dated go/no-go meeting for the v1.0 label

**Next action:** record "internal sales pilot, external launch explicitly
out of scope until the v1.0 evidence rows close" in the launch checklist's
go/no-go table.

---

## One-page summary

| # | Decision | Recommendation | Cost | Unblocks |
|---|---|---|---|---|
| 1 | Hosting | Render Blueprint, paid starter tiers, confirm frankfurt region | ~2× starter instance | Staging/production stand-up |
| 2 | Database | Supabase paid project, `supabase-tables` | ~$25/mo | All persistence work; evidence runs |
| 3 | Auth | Email/password, admin-provisioned; confirm with IT, no SSO | — | Account provisioning; CSRF posture final |
| 4 | API keys | `GEMINI_API_KEY` now (quota-capped); CSE deferred; model-backed Guru on for pilot | Negligible | UAT runs; Guru operating-mode sign-off |
| 5 | Audience | Internal sales pilot only; external out of scope until v1.0 evidence closes | — | Launch sequencing; observation-window evidence |

**The five answers, in one line each:** Render paid · Supabase paid ·
password-only · Gemini yes/CSE no · internal-only.
