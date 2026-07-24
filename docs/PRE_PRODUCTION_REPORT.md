# Wingman Pre-Production Report

_Generated: 2026-07-23 · Branch `main` @ `f100ae8`_
_Updated: 2026-07-24 — **P0-1 resolved, tree is green.** `npm run verify` exits 0 across all 69 steps; 717/717 tests pass._

This report is **evidence-based**: every gate below was executed against the repository at the
time of writing, not read from a status document. Where a previous doc says "Pending", this
report says what actually happened.

It supersedes the status tables in `docs/CURRENT_STATUS.md` and `docs/launch-readiness-report.md`,
and updates `docs/production-readiness-audit.md` (dated 2026-04-27, now materially out of date).

---

## 1. Verdict

**Not shippable today — but much closer than the documentation implies.**

Two things are simultaneously true:

1. **The platform layer is genuinely production-grade.** Auth, session handling, CSRF, security
   headers, CORS lockdown, rate limiting, fail-closed storage, RLS migrations and deployment
   wiring are all real, implemented and correct. The existing docs undersell this badly.
2. **The product layer is gated by data governance, not code.** The single largest risk to a
   customer-facing proposal tool is that **9 of 127 active lead SKUs have exact governed
   technical profiles**. Wingman is a tool that makes technical claims to customers; today
   roughly 93% of those claims are not backed by governed data — and the quality gate that
   measures this **passes anyway**.

With P0-1 now resolved (the tree is green — see §3), the honest position is:

> **Engineering is ~2 weeks from a defensible internal launch. Data governance is the long pole
> and should start now, in parallel, because it is people-time, not code-time.**

Recommended launch shape: **internal-only pilot first** (WyreStorm sales staff, authenticated,
Supabase-backed), with external/customer-facing proposal output gated behind the technical-data
ratchet reaching an agreed threshold.

---

## 2. What was actually run

Two columns: the audit run on 2026-07-23, and the re-run on 2026-07-24 after P0-1 was fixed.

| Gate | Command | 07-23 | 07-24 | Detail |
|---|---|---|---|---|
| Typecheck | `npm run typecheck` | **FAIL** | **PASS** | Was 1 error — `TemplateReviewPage.tsx:99` TS2741 |
| Lint | `npm run lint` | **FAIL** | **PASS** | 0 errors, 38 warnings (was 1 error, 39 warnings) |
| Unit/integration tests | `npm test` | **FAIL** | **PASS** | 717/717 across 88 files (was 716/717) |
| Full verify | `npm run verify` | **FAIL** | **PASS** | Was halting at step 10 of 69; now exits 0 |
| Readiness | `npm run check:readiness` | **FAIL** | **PASS** | Was 4 missing template markers |
| Workflow integration | `npm run check:workflow` | **FAIL** | **PASS** | Same 4 markers, now restored |
| Routes | `npm run check:routes` | PASS | PASS | 25 routes / 25 feature entries |
| Orphaned modules | `npm run check:orphaned-modules` | PASS | PASS | 95 modules, all reachable |
| Product matching | `npm run check:product-matching` | PASS | PASS | 6/6 scenarios |
| Data sources | `npm run check:data-sources` | PASS | PASS | Baseline verified |
| AV decision evidence | `npm run check:av-decisions` | PASS | PASS | EXP guardrail + UC caveat verified |
| Technical data | `npm run check:technical-data` | **PASS (misleading)** | **PASS (misleading)** | 9/127 governed, 118 backlog — see P0-2 |
| Source validation | `npm run data:sources:check` | PASS | PASS | 310 WyreStorm, 241 competitor |

### Corpus snapshot

| Metric | Value |
|---|---|
| App source files (`src/**/*.ts,tsx`) | 252 |
| Test files | 88 (86 client + 2 server) |
| Tests | 717 |
| Server code | 14,689 lines across `server/**/*.mjs` |
| Build/QA tools (`tools/`) | 170 files |
| npm scripts | 155 (76 × `check:*`, 14 × `audit:*`) |
| `verify` pipeline | 69 serial steps |
| Commits (total / last 30 days) | 891 / 444 |
| Version | `0.1.0`, **no release tags** |
| `TODO`/`FIXME`, `@ts-ignore`, `console.log` in `src` | **0 / 0 / 0** |

That last row deserves note: the codebase has zero suppressed types, zero debug logging and zero
TODO markers across 252 files. That is unusually disciplined and should be protected.

---

## 3. Blockers — ordered, with explicit instructions

### P0-1 · Red working tree: unfinished `TemplateReviewPage` refactor — ✅ RESOLVED 2026-07-24

**Evidence — five failures, one root cause.** The uncommitted change to
`TemplateReviewPage.tsx` (−657 lines) removed the
template save/export surface:

```
typecheck  src/wingman2/pages/TemplateReviewPage.tsx(99,98): TS2741
           Property 'nextMove' is missing ... but required in type 'PageHeroProps'
lint       src/wingman2/pages/TemplateReviewPage.tsx  216:194  error
           Expected an assignment or function call and instead saw an expression
lint       src/wingman2/pages/TemplateReviewPage.tsx   78:9    warning  'navigate' unused
test       src/__tests__/templateWorkflowRendered.test.tsx:50
           Unable to find button "Save as template"
check:workflow / check:readiness — missing markers:
           Editable WyreStorm BOM · saveTemplateProject · exportTemplateBom · Other AV design scope
```

This is not four bugs. The refactor deleted `saveTemplateProject` and `exportTemplateBom` — real
user-facing capability that the guard tools were written specifically to protect. **The guards
did their job.**

**Resolution (2026-07-24) — Option A: the refactor was finished, not reverted.**

Investigation showed the new tabbed workspace had **kept** every capability but renamed it out
from under the guards. `exportBom`/`saveProject`/`saveTemplate` were the old
`exportTemplateBom`/`saveTemplateProject`/`saveTemplateDesign`; the editable BOM survived as the
Equipment tab's grouped rows; third-party scope survived as the "Third-party scope" group. Only
the guard-visible names and labels were gone. Fixes applied:

1. Added the required `nextMove` prop to the not-found `PageHero`.
2. Replaced a ternary used for side effects (`next.has(x) ? next.delete(x) : next.add(x)`) with a
   named `toggleGroup()` helper — this was the lint error.
3. Removed the unused `navigate` binding and its `useNavigate` import.
4. Restored the four capability markers **as real code and real UI**, not as dead strings:
   - `exportTemplateBom()` / `saveTemplateProject()` / `saveTemplateDesign()` — functions renamed back.
   - "Editable WyreStorm BOM" — now the Equipment tab's section heading.
   - "Other AV design scope" — now the caption on the Third-party scope group, via a new
     `groupCaptions` map giving every equipment group an explanatory line.
5. Aligned the save-confirmation UI with its test contract: button "Save as template", notice
   "Room design saved as a custom template.", link "Open template".

**Worth noting:** at `f100ae8` the two text markers were crammed into a single paragraph as
`"Other AV design scope\nEditable WyreStorm BOM"` — they rendered as one broken run-on label.
The guard was satisfied by a string, not by working UI. They are now two separate, meaningful
labels in the places a user would expect them.

**Verified:** `npm run verify` exits 0 (all 69 steps); `npm test` 717/717 across 88 files;
typecheck clean; lint 0 errors. Rendering confirmed in the browser at
`/wingman/templates/corporate-huddle-apollo` — Equipment tab shows the "Editable WyreStorm BOM"
heading, adding a third-party placeholder opens the Third-party scope group showing "Other AV
design scope — supplied and installed by others, not quoted by WyreStorm", and the dirty-state
badge flips to "Unsaved changes". No console errors.

**Lesson for the guard suite:** four guards, one test and the type-checker all fired on this, and
between them they described the regression precisely. That is the system working. But a guard
that greps for a literal string can be satisfied by a string in the wrong place — consider
asserting on rendered output (as `templateWorkflowRendered.test.tsx` does) rather than source
text where it matters most.

---

### P0-2 · Technical data governance is the real launch blocker

**Evidence:**
```
[technical-data] Validated 10 governed profiles.
                 9/127 active lead SKUs have exact governed profiles.
[technical-data] Review backlog (118): AMP-2120, AMP-2120-DNT, AMP-260-DNT, APO-DG-DOCK, ...
```
Plus, from `data/wingman-data-maintenance-queue.json`:
- **372** open data review items
- **75** new WyreStorm candidates found on the vendor site but absent from the index

**Why this is P0.** Wingman generates customer-facing proposals and BOMs. A proposal asserting
resolution, bandwidth, HDCP, USB or HDBaseT behaviour for a SKU with no governed technical
profile is an unverified claim leaving the building on WyreStorm letterhead. The
`WINGMAN_PROPOSAL_SAFETY_STANDARD.md` in this repo exists precisely because you already know this.

**The gate is currently non-blocking.** `check:technical-data` exits 0 with a 118-item backlog;
only `--strict` fails. So `verify` can be fully green while the product's core factual basis is
7% governed. That is the most dangerous thing in this repository — a green light that does not
mean what it appears to mean.

**Instructions:**

1. **Make the gate honest — introduce a ratchet.** Add a floor to
   `tools/check-wyrestorm-technical-data.mjs` that
   fails if the governed-profile count drops below a committed baseline. Start the baseline at
   today's `9`, and raise it with every batch. This makes progress monotonic and prevents
   regression, without blocking work today.
2. **Agree the launch threshold with the business, in writing.** Suggested minimum for an
   internal pilot: **100% of SKUs that can appear in a generated proposal or BOM**. That set is
   much smaller than 127 — derive it, don't guess:
   ```bash
   npm run check:technical-data -- --strict
   ```
3. **Work the backlog in commercial priority order**, not alphabetically. The current backlog
   listing starts `AMP-2120, AMP-2120-DNT, AMP-260-DNT, APO-DG-DOCK…` — that is alphabetical and
   will spend early effort on amplifiers before core NetworkHD/EX transport. Sort by how often a
   SKU appears in generated output.
4. **Add the strict gate to `verify` once the threshold is met**, replacing the advisory one.
5. **Work the 372-item review queue and 75 candidates** via the documented path:
   ```bash
   npm run product-update:doctor
   ```
   then follow the four `nextActions` already recorded in `data/wingman-data-maintenance-queue.json`.

**Note on the "138 blocked" figure:** `data:sources:check` reports `310 products (138 blocked)`.
This is **correct behaviour, not a defect** — it is exactly `73 discontinued + 65 do-not-spec`.
Lifecycle governance is working. 167 active + 5 in review are sellable. Do not "fix" this.

**Exit criteria:** documented threshold met; strict gate in `verify`; review queue triaged to an
agreed residual.

---

### P1-1 · `verify` is a 69-step serial chain — restructure it

**Evidence:** `verify` is a single `&&` chain of 69 steps. `typecheck` is step **10**; `build` is
step **11**. Today's run spent ~2 minutes on nine CSS/markup guards before discovering a type
error, then abandoned the remaining 58 gates.

**Consequences:**
- Slowest possible feedback: cheap, high-signal checks run *after* expensive cosmetic ones.
- One failure hides all others — you cannot see the true state of the tree in one run.
- CI wastes a full runner on a chain that cannot parallelise.
- 170 tools and 155 scripts is a second codebase with no tests of its own.

**Instructions:**

1. **Re-order into fail-fast stages.** Restructure `package.json` into:
   ```
   verify:fast      → typecheck, lint, test            (~60s, catches most breakage)
   verify:data      → data:sources:check, technical-data, lifecycle, story-coverage
   verify:contract  → routes, workflow, readiness, orphaned-modules, runtime-wiring
   verify:visual    → css guards, style drift, markup migration, dashboard layout
   verify           → runs all four in order
   ```
2. **Parallelise in CI.** Run the four stages as four jobs in
   `.github/workflows/ci.yml` instead of one `verify` job. Wall-clock
   drops to the slowest stage, and a failure report shows *every* category that is broken.
3. **Audit the guard suite for redundancy.** There are eight separate `check:dashboard-*` scripts
   (`compact-buttons`, `primary-buttons`, `short-buttons`, `element-typing`,
   `menu-layout-density`, `single-screen-layout`, `original-card-layout`, `workflow-menu`). These
   encode one-off visual corrections. Consolidate into a single `check:dashboard-contract`, or
   retire the ones whose regression is no longer plausible. Each guard has a permanent
   maintenance cost.

**Exit criteria:** a broken tree produces a complete failure report in under 3 minutes.

---

### P1-2 · CI does not run the checks that catch user-visible breakage

**Evidence — `.github/workflows/ci.yml` runs:** lint, typecheck, test,
verify, `npm audit` (root + server). **It does not run:**

| Missing | Script exists | Impact |
|---|---|---|
| Browser smoke test | `npm run check:browser` (Playwright) | No CI proof the built app boots |
| Load test | `npm run load-test` | Launch checklist blocker, never automated |
| Coverage threshold | `npm run test:coverage` | No config in `vitest.config.ts` — no floor |
| Stress check | `npm run check:stress:strict` | Written, unused in CI |

**Instructions:**

1. Add a `smoke` job to CI running `npm run build && npm run check:browser`. Playwright is already
   a devDependency — this is wiring, not new work.
2. Add coverage thresholds to `vitest.config.ts`. Set the floor at *current*
   measured coverage so it can only improve:
   ```ts
   test: {
     coverage: {
       provider: "v8",
       thresholds: { lines: 60, functions: 60, branches: 50, statements: 60 },
       exclude: ["tools/**", "dist/**", "**/*.test.*"],
     },
   }
   ```
   Measure first with `npm run test:coverage`, then set thresholds to the real numbers minus 2%.
3. Add `npm run check:stress:strict` to the nightly (not per-PR) schedule.
4. Run the load test once against staging and record the result in `docs/LOAD_TESTING.md` — it is
   a launch-checklist blocker that has never been executed.

---

### P1-3 · Project data lives in `localStorage`; backend sync is off by default

**Evidence:**
- `projectStore.ts:1230,1254` — projects read/written to
  `window.localStorage` under a single `PROJECT_STORE_KEY`.
- `projectStore.ts:336` — backend sync is gated on
  `VITE_WINGMAN_ENABLE_PROJECT_BACKEND_SYNC`, a **build-time** flag.
- 36 files touch browser storage.

**Risk:** a salesperson's entire project history lives in one browser profile. Clearing site data,
switching machine, or using a second browser loses everything. There is no cross-device access
and no server-side backup unless the flag was set at build time.

**Instructions:**

1. **Decide the model explicitly and record it.** For an internal sales tool with named user
   accounts (which the server already supports), the answer is almost certainly
   *server-authoritative with local cache*, not *local-first*.
2. `render.yaml` already sets `VITE_WINGMAN_ENABLE_PROJECT_BACKEND_SYNC=true` for production —
   **verify this actually works end to end** against `supabase-tables` storage. Being a build-time
   flag, it cannot be toggled during incident response; confirm it is baked into the production
   image.
3. **Write the migration path.** Existing pilot users have local-only projects. Ship a one-time
   "upload my local projects" action before the first user has data worth losing.
4. **Test the conflict path.** `projectStore` claims local/newer-change preservation. Add an
   integration test: edit the same project in two tabs, confirm neither edit is silently lost.

**Exit criteria:** a project created on machine A is visible on machine B after login.

---

### P1-4 · Front-end bundle is heavy

**Evidence — largest chunks in `dist/assets`:**

| Chunk | Size |
|---|---|
| `wm-compare-engine` | 782 KB |
| `wm-competitor-registry` | 616 KB |
| `wm-project-workflow` | 504 KB |
| `mammoth.browser` | 480 KB |
| `pdf` | 365 KB |
| `wm-product-evidence` | 345 KB |

Over 3 MB uncompressed across six chunks. `mammoth` (DOCX parsing) and `pdfjs-dist` are only
needed on the Ingest route; the competitor registry only on Compare.

**Instructions:**

1. Confirm the heavy chunks are genuinely route-lazy (`React.lazy` / dynamic `import()`) and not
   pulled into the initial graph. Check with `npx vite-bundle-visualizer` or by inspecting the
   network waterfall on the dashboard route.
2. Make `mammoth` and `pdfjs-dist` load **on file selection**, not on route entry.
3. Add a size budget to CI so this cannot silently regress:
   ```bash
   npx size-limit
   ```
   or a small `tools/check-bundle-budget.mjs` in the house style, asserting per-chunk ceilings.
4. Target: initial route JS under 300 KB gzipped.

---

### P2-1 · No production observability

**Evidence:**
- **Zero** telemetry wiring in `src` (the server exposes `/api/wingman/telemetry`; the client
  never calls it).
- No error-tracking service anywhere (no Sentry/Datadog/OTel in either `package.json`).
- `ErrorBoundary.tsx:30-31` only `console.error`s — in
  production that goes nowhere.
- Server logging is 11 raw `console.*` calls in `competitor-lookup-server.mjs`, **zero** in
  `wingman-app-store.mjs` (the file that handles all auth and project storage).

**You will not know when Wingman breaks for a user.** The most security-sensitive file in the
codebase emits no logs at all.

**Instructions:**

1. **Wire the client to the telemetry endpoint you already built.** Send `ErrorBoundary` catches
   and unhandled rejections to `/api/wingman/telemetry`. This is the cheapest possible win — the
   server half exists.
2. **Add structured logging to `wingman-app-store.mjs`** for: login success/failure, signup,
   session rejection, rate-limit trips, storage-mode selection, and every Supabase write failure.
   JSON lines with a request id. No PII, no password material.
3. **Wire uptime monitoring** to `/api/ready` and `/api/health` (both exist and are already
   referenced by `render.yaml` health checks). Any external monitor will do.
4. **Define an error-rate alert and an owner** before the first pilot user logs in.

---

### P2-2 · In-memory rate limiting will not survive production topology

**Evidence:** `wingman-app-store.mjs:996-1020` — auth rate
limiting (default 8 requests / 60s) is a process-local `Map`.

**Impact:** resets on every restart/redeploy, and does not coordinate across instances. On Render
free tier with a single instance this is *tolerable*; on any scale-out it is bypassable by
distributing requests. Not a launch blocker for an internal pilot — but record the constraint.

**Instructions:** document the single-instance assumption in `docs/OPERATIONS.md`; if the service
is ever scaled beyond one instance, move the limiter to Supabase or Redis first.

---

### P2-3 · No release versioning

**Evidence:** `package.json` is `0.1.0` across 891 commits. The only tags are `archive/*` and
`rollback-baseline-*`. `render.yaml` sets `autoDeploy: false`.

**Impact:** no way to say which build a user is running, and the launch checklist item "a
known-good baseline commit/tag exists for rollback" cannot be satisfied.

**Instructions:**
1. Adopt real versioning. Tag the first green-`verify` commit as `v0.9.0-rc1`.
2. `docker-compose.yml` already passes `VITE_APP_VERSION` and `VITE_APP_COMMIT` build args —
   **surface them in the UI** (footer or Support page) so a user can report what they are running.
3. Tag every deployed build. Rollback = redeploy the previous tag.

---

### P2-4 · Documentation states the project is less ready than it is

**Evidence:**
- `docs/CURRENT_STATUS.md` (2026-07-05) — every row in the verification log reads "Pending".
- `docs/launch-readiness-report.md` (2026-07-05) — all 11 gates "Pending".
- `docs/production-readiness-audit.md` (2026-04-27) — 3 months stale; describes resolved issues.

Meanwhile the actual state is 716 passing tests, a working auth stack, CSRF, RLS, security headers
and a deployment blueprint. **The docs are actively misleading in the pessimistic direction**,
which is its own risk: it makes it impossible to tell real blockers from stale ones.

**Instructions:**
1. Replace the status tables in `CURRENT_STATUS.md` and `launch-readiness-report.md` with a
   pointer to this report, and keep **one** live status file, not three.
2. Archive `production-readiness-audit.md` to `docs/archive/` — it has served its purpose.
3. Make status generation automatic. Add a `tools/generate-status.mjs` that runs the gates and
   writes the results table, so status can never drift from reality again. Given you already have
   170 tools, this is squarely in the house idiom.

---

## 4. What is already production-grade — do not rebuild

This list exists so effort is not wasted re-solving solved problems.

**Authentication & session handling** — `server/wingman-app-store.mjs`
- `scrypt` with per-user random salt (`:693`); constant-time
  comparison via `Buffer` equality on derived keys.
- Session tokens are 32 random bytes, **stored SHA-256 hashed** (`:710`)
  — a database leak does not yield usable sessions.
- Minimum password length enforced; invitation flow requires the invited account's password.

**Transport & request security** — `server/competitor-lookup-server.mjs`
- CSRF module with issue + enforce (`server/security/csrf.mjs`),
  `WINGMAN_CSRF_ENFORCE=true` in `render.yaml`.
- Full security-header set: CSP, HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`.
- CORS defaults to the exact UI origin; **explicitly rejects wildcard in production**
  (`:66`).
- JSON body size cap, request timeouts, retry limits, response caching with TTL and entry caps.
- Session cookies `Secure` + `SameSite=Strict` in the production blueprint.

**Storage safety**
- Three explicit modes (`file` / `supabase` / `supabase-tables`) with **fail-closed refusal to
  start in production** on an unsafe mode (`:141`).
- RLS policies in both migrations, including a dedicated service-role scoping fix
  (`002_scope_service_role_policies.sql`).

**Quality infrastructure**
- 717 tests across 88 files; zero `@ts-ignore`, zero `console.log`, zero `TODO` in 252 source files.
- A guard suite that **demonstrably works** — it caught the P0-1 regression before a human did.
- CI runs lint, typecheck, test, verify and dependency audit on both packages.

**Deployment**
- Two-service Render blueprint with private networking, health checks and `sync: false` secrets.
- Docker + docker-compose parity for local production simulation.

---

## 5. Sequenced plan to production

Phases 1 and 2 run in parallel — Phase 2 is people-time on data, Phase 1 is engineering time.

### Phase 1 — Get to green (target: 2 days)
1. ~~Resolve P0-1 (finish or stash the `TemplateReviewPage` refactor).~~ **Done 2026-07-24.**
2. ~~Full `npm run verify` passes all 69 steps.~~ **Done — exits 0.**
3. Commit the green tree (the template refactor is still uncommitted).
4. Restructure `verify` into four fail-fast stages; parallelise in CI (P1-1).
5. Add the browser-smoke job and coverage thresholds to CI (P1-2).
6. Tag `v0.9.0-rc1`.

**Gate:** green CI on `main`, tagged.

### Phase 2 — Data governance (target: continuous, starts day 1)
1. Introduce the technical-data ratchet at baseline 9 (P0-2 step 1).
2. Derive the proposal-reachable SKU set; agree the launch threshold with the business.
3. Work the 118-item backlog in commercial priority order.
4. Triage the 372 review items and 75 new candidates.

**Gate:** `check:technical-data --strict` passes for all proposal-reachable SKUs.

### Phase 3 — Production infrastructure (target: 3 days)
1. Provision the production Supabase project; apply `001` + `002`.
2. Deploy the Render blueprint; confirm both services healthy on `/` and `/api/ready`.
3. Verify `supabase-tables` storage end to end, including project sync (P1-3).
4. Wire telemetry, structured auth logging and uptime monitoring (P2-1).
5. Run the load test; record the result.

**Gate:** a project created on one machine is visible on another after login; monitoring alerts fire on a forced error.

### Phase 4 — Validation (target: 1 week)
1. Soap-test workshop pass on standard designs (`LAUNCH_CHECKLIST.md` §6) — this is a WyreStorm
   standard and cannot be shortcut.
2. UAT with 2–3 salespeople running Discovery → Proposal unaided.
3. Security review of auth/session/CSRF against a live deployment.
4. Rehearse rollback once against staging.

**Gate:** dated go/no-go sign-off.

### Phase 5 — Post-launch hardening
Bundle budgets (P1-4), distributed rate limiting (P2-2), guard-suite consolidation, automatic
status generation (P2-4).

---

## 6. Definition of done

Wingman is production-ready when **all** of the following are true and evidenced by a dated
artefact:

- [ ] `npm run verify` green on `main`, all 69 (or restructured) steps, in CI
- [ ] Browser smoke test green in CI against the built app
- [ ] `check:technical-data --strict` passes for every proposal-reachable SKU
- [ ] Data review queue triaged to an agreed residual; new-candidate list resolved
- [ ] Production Supabase provisioned, migrated, and exercised under concurrent use
- [ ] Projects survive machine switch (server-authoritative storage verified)
- [ ] Telemetry, structured auth logging and uptime alerting live, with a named owner
- [ ] Load test executed against staging at target concurrency and passed
- [ ] Soap-test workshop pass completed for standard designs
- [ ] UAT completed with 2–3 salespeople; blocking issues fixed
- [ ] Security review complete, no high-severity findings open
- [ ] Release tagged; rollback rehearsed once
- [ ] One live status document, generated from the gates, not hand-maintained

---

## 7. The single most important recommendation

**Fix the misleading green light before anything else.**

`npm run verify` currently exits 0 while 118 of 127 active lead SKUs lack governed technical
profiles. A quality gate that passes when the product's factual basis is 7% governed is worse than
no gate, because it converts an open risk into a false assurance — and this is a tool whose entire
purpose is making technical claims to customers on WyreStorm's behalf.

The engineering here is strong. The guard suite is unusually thorough and it caught a real
regression today. Point that same rigour at the technical-data ratchet (P0-2, step 1) and the
project's quality signal becomes trustworthy again — at which point every other item on this list
is ordinary, tractable work.
