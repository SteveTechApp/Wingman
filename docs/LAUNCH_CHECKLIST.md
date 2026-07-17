# Wingman Launch Checklist (Phase F)

A go/no-go checklist for taking Wingman live. Work top to bottom. Do not promote to
production until every **Blocker** item is checked.

---

## 1. Build & Quality Gate (Blocker)

- [ ] `npm run verify` passes clean on the build machine (source validation, typecheck, build and repository guards).
- [ ] `npm run test` passes clean.
- [ ] No `.bak` files in `src/` (run the cleanup command in the project notes).
- [ ] React Router v7 future-flag warnings are gone (flags enabled in `main.tsx`).
- [ ] A known-good baseline commit/tag exists for rollback.

## 2. Data & Selection Accuracy (Blocker)

Already verified via the repo's check suite — re-run before launch to confirm:

- [ ] `npm run check:product-matching` passes (6 scenarios).
- [ ] `npm run check:av-decisions` passes (AV safety rules + recommendation evidence).
- [ ] `npm run check:data-sources` passes (canonical product index baseline, currently 310 products).
- [ ] `npm run check:competitor-intelligence` passes.
- [ ] EXP guardrail spot-check: confirm no EXP-prefixed SKU is proposed as a **primary**
      switcher in a generated design (only as optional local/lectern switching or cables).
- [ ] UC caveat appears where relevant: WyreStorm UC is Zoom-certified, **not** Teams-certified;
      Teams rooms must be tested before install.

## 3. Feature Smoke Test (Blocker)

Run each end to end on staging, signed in and (where relevant) as a guest:

- [ ] **Discovery → Proposal:** complete the wizard and generate a customer-ready proposal.
- [ ] **Connectivity diagram:** generates correctly, including a multi-display / IP case.
- [ ] **GURU:** answers a product + an AV-term question from grounded local data. If a
      model-backed agent is enabled separately, confirm its logs show no fallback warning.
- [ ] **Compare:** returns honest pros/cons and a sensible WyreStorm match; handles an
      unknown competitor SKU gracefully.
- [ ] **Projects:** save, reload, and edit a project against **Supabase** storage.

## 4. Production Infrastructure (Blocker)

Deployment wiring is defined in the root `render.yaml` Blueprint. Render creates the
frontend and backend services together, links them over its private network, waits for
GitHub checks before automatic deployment, and checks `/` plus `/api/ready`.
Use `.env.production.example` when promoting the trial deployment to persistent
Supabase-backed production storage and follow the migration runbook in `OPERATIONS.md` §8.

- [ ] Supabase project provisioned; `001_initial_schema.sql` applied (plus
      `002_scope_service_role_policies.sql` if the database predates the RLS policy
      role-scoping fix).
- [ ] File-store data migrated and verified (row counts + sample project); backup retained.
- [ ] `WINGMAN_STORAGE_MODE=supabase-tables` and app exercised under concurrent use.
- [ ] All secrets in the host secret manager (no committed `.env`).
- [ ] Render Blueprint created from `render.yaml`; both services are healthy.
- [ ] Supabase credentials added to `wingman-api` before production data is stored.
- [ ] Hosting, domain and TLS live; HTTPS enforced end to end.
- [ ] Health check (`/api/health`) wired to an uptime monitor; error-rate alert configured.
- [ ] Load test run against staging at target concurrency — passed.

## 5. Security (Blocker)

- [ ] Secure cookies confirmed over HTTPS (`WINGMAN_SESSION_COOKIE_SECURE=true`).
- [ ] CORS locked to the exact front-end origin (not `*`).
- [ ] Rate limiting verified on auth and competitor look-up.
- [ ] **CSRF**: server guard + SPA wiring both implemented, shipping dark. For an external
      launch, set `WINGMAN_CSRF_ENFORCE=true` in staging, test, then enable in production
      (steps in `OPERATIONS.md` §7). Internal-only launch may rely on `SameSite=Strict`.
- [ ] Security review completed; no high-severity findings open.

## 6. Soap-Test Workshop (Blocker — WyreStorm standard)

Per the WyreStorm design rule, **all standard designs are workshop-tested before install.**

- [ ] Build each standard room design physically in the workshop.
- [ ] Confirm signal paths, switching, and control behave as the proposal claims.
- [ ] For UC rooms, test the actual Teams/Zoom platform the customer will use.
- [ ] Record any product substitutions or caveats and feed them back into the templates.

## 7. User Acceptance (Blocker)

- [ ] 2–3 salespeople complete the full Discovery → Proposal journey unaided.
- [ ] Feedback captured; any blocking usability issues fixed.
- [ ] Sign-off recorded.

## 8. Documentation & Handover

- [ ] `README.md`, `DEPLOYMENT.md`, `OPERATIONS.md`, `SUPABASE_SETUP.md` reviewed and current.
- [ ] Rollback procedure rehearsed once against staging (`OPERATIONS.md` §6).
- [ ] On-call / support owner identified for launch week.

---

## Go / No-Go

| Area | Owner | Status |
|------|-------|--------|
| Build & quality gate | | |
| Data & selection accuracy | | |
| Feature smoke test | | |
| Production infrastructure | | |
| Security | | |
| Soap-test workshop | | |
| User acceptance | | |

**Decision:**  ⬜ Go   ⬜ No-go   — Date: ________  Approver: ________

---

## Decisions still required from Steve (unblock Phase D & E)

1. **Hosting target** — where the app + API run (container host / VPS / cloud).
2. **Database** — confirm Supabase (recommended, already coded) vs self-managed Postgres.
3. **Auth scope** — email/password only at launch, or add SSO/OAuth?
4. **Production API keys** — confirm Gemini (and optional Google CSE) keys and quotas.
5. **Launch audience** — internal sales first, or external customers? (Sets the CSRF/UAT bar.)
