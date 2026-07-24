# Wingman Pre-Production Report

_Generated: 2026-07-23 · Branch `main` @ `f100ae8`_
_Updated: 2026-07-24 — **P0-1 resolved, tree is green.** `npm run verify` exits 0 across all 69 steps; 717/717 tests pass._
_Updated: 2026-07-24 — added **P0-3** (two divergent migration sets, one with no RLS), **P1-5** (`main` has no branch protection) and **P2-5** (the red GitHub check is Supabase's, not ours), found while investigating CI failures._

This report is **evidence-based**: every gate below was executed against the repository at the
time of writing, not read from a status document. Where a previous doc says "Pending", this
report says what actually happened.

## What changed on 2026-07-24

Eight of the findings below were fixed. The sections keep their original evidence so the reasoning
stays auditable; each carries a status marker.

| Finding | Status | What was done |
|---|---|---|
| P0-1 Red working tree | ✅ Resolved | Template review refactor finished; four capabilities restored as real UI. |
| P0-3 Migration sets diverged, one with no RLS | ✅ Resolved | `20260724_enable_rls_on_wingman_tables.sql` closes the gap; `check:migration-parity` prevents recurrence. |
| P0-2 Technical data governance | ⚙️ Ratchet in place | Coverage floor locked at 9/127; regressions now fail. **The backlog itself is still open work.** |
| P1-1 69-step serial `verify` | ✅ Resolved | Split into 5 stages, fail-fast, parallelised in CI. |
| P1-2 CI gaps | ✅ Resolved | Browser smoke job added; coverage thresholds added and enforced. |
| P2-1 No observability | ✅ Resolved | Client error reporting wired to the existing endpoint; structured auth/storage logs added. |
| P2-2 Per-instance rate limiting | ✅ Documented | Constraint recorded in `OPERATIONS.md` §4 with the scale-out trigger. |
| P2-3 No release versioning | ✅ Resolved | Version set to `0.9.0`; build label surfaced on the Support page. |
| P2-4 Documentation drift | ✅ Resolved | One live status document; the other two now point at it. |

**Also resolved:** P1-5 — branch protection is now enabled on `main` with nine required checks,
applied to admins.

**Still open and needing a human decision:** P0-2's data backlog (business threshold), P1-3
(client storage model), P1-4 (bundle budgets), and P2-5 (the Supabase integration).

A genuine discovery while restructuring `verify`: it ran neither `lint` nor the full test suite.
The pre-commit hook runs `verify`, so lint and test failures could be committed freely — which is
exactly how `265028e` passed the hook and then failed CI on Test and Lint. Both are now in
`verify:fast`.

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
| `verify` pipeline | 69 serial steps → **now 5 stages, 72 steps** |
| Coverage (measured 07-24) | 68.9% lines · 67.1% statements · 67.8% functions · 61.0% branches |
| Commits (total / last 30 days) | 891 / 444 |
| Version | `0.1.0` → **`0.9.0`**; still no release tags |
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

### P0-2 · Technical data governance is the real launch blocker — ⚙️ RATCHET CORRECTED 2026-07-24

> **The 9/127 figure in this section was itself wrong. The honest number is 7/127.**
>
> Working the backlog exposed a flaw in the gate: `check:technical-data` called `seen.add(sku)`
> before looking at status, so a `review-required` stub counted exactly the same as a fully
> verified profile. Two of the nine were stubs.
>
> This mattered more than the two-SKU discrepancy. **The backlog could have been "cleared" — and
> `--strict` made to pass — by adding 118 placeholder profiles without checking a single
> specification.** The gate would have gone green while nothing was verified, which is the same
> failure this finding was raised about, one level deeper. The ratchet I added on 2026-07-23 was
> ratcheting the inflatable number.
>
> Fixed: coverage now counts only `verified` and `verified-with-warning`, reports drafted-awaiting
> -review separately, and `--strict` requires every active lead SKU to be genuinely verified. The
> baseline was reset 9 → 7. That is a correction to a wrong measurement, not a lowered bar.
>
> The runtime always got this right — `governedProductTechnicalData.ts` treats `review-required`
> as the weaker "official-structured" tier. Only the metric was wrong.

**What the backlog work found instead.** The 118 remaining profiles genuinely need a human against
the official datasheets — see "Why this cannot be automated" below. But prioritising the backlog by
what actually reaches customers (SKUs appearing in room template BOMs, not alphabetical order)
surfaced a live product-accuracy defect that was worth more than any profile:

| SKU | Status | Appearances | Action |
|---|---|---|---|
| `SYN-TOUCH10` | discontinued **and** do-not-spec | 5 templates | ✅ Replaced with active `SYN-TOUCH10-V2` |
| `RX-70` | **does not exist** in catalogue or lifecycle data | 1 template | ✅ Corrected to `RX-70-4K` (active 70m HDBaseT receiver) |
| `APO-VX20-MNT` | do-not-spec, no successor listed | 1 template | ⏳ Needs a product-owner decision |
| `IDB-300` | do-not-spec, no successor listed | 1 template | ⏳ Needs a product-owner decision |
| `NHD-RACK-1U` | discontinued, no successor listed | 1 template | ⏳ Needs a product-owner decision |

Every teaching-space proposal generated from those templates was quoting a product WyreStorm no
longer sells, and one template quoted a SKU that has never existed. Nothing checked this: room
template BOMs are the most direct path from Wingman to a customer document, and their lifecycle
status was ungoverned.

`check:template-sku-lifecycle` now runs in `verify:data` and blocks any *new* dead SKU entering a
template, while keeping the three outstanding ones printed on every run rather than silent.

**A caution on that guard's design:** it resolves status the alias-aware way the app does, not by
reading `lifecycle.csv` directly. Reading the CSV raw reports `APO-VX20-UC` and `MX-0808-SCL` as
broken, because both carry non-definitive "review" placeholder rows — but both resolve to active
via their canonical `-V2` forms. A naive version of this check would have produced two false
accusations against working products.

**Why this cannot be automated.** A `verified` profile requires an evidence record naming a
reviewer, a review date and the official product page. Generating those in bulk would fabricate
reviews that never happened, and any extraction error becomes a false technical claim in a customer
proposal — the exact harm this system exists to prevent. The official pages are reachable and rich
(the `EX-70-H2` page carries full port, resolution, HDCP, latency and power detail), so the work is
tractable — but it is verification work, not generation work. Note also that the `EX-70-H2` page
contradicts itself, listing HDBaseT "Class A" in the spec table and "Class B" in the feature list.
That is precisely the judgement a reviewer has to exercise and a script cannot.

**Recommended order** for working the remaining 118, highest value first: the SKUs that appear in
room template BOMs (36 of them), since those reach customers directly, then the NetworkHD/EX
transport core, then the long tail.

#### Batch 1 drafted — 2026-07-24

Six profiles were transcribed from the official product pages, read in a real browser:
`NHD-CTL-PRO-V2`, `NHD-600-TRX`, `NHD-0401-MV`, `RX-70-4K`, `CAM-210-PTZ`, `NHD-000-RACK4`.

| | |
|---|---|
| Verified coverage | **unchanged at 7/127** — drafts deliberately do not move the ratchet |
| Drafted awaiting review | 2 → 7 lead SKUs (plus `NHD-000-RACK4`, which is rack-mount and so outside the lead-SKU count) |
| No profile at all | 118 → 113 |

All six are `status: "review-required"` with an evidence record naming the official page and a
reviewer string that says plainly it is machine-transcribed and **not** human-verified. **The point
is to remove the transcription work, not to claim the checking is done.** To promote one: read it
against the same page, change status to `verified`, and put your own name in the evidence record.

**Ambiguities found while transcribing, deliberately left for the reviewer** — these are the reason
this cannot be a bulk script:

- **`CAM-210-PTZ`** — the spec table says a 1/2.8in sensor; the Additional Features list on the
  same page says 1/2.7in. Transcribed the table, flagged in `warnings`.
- **`NHD-0401-MV`** — branded NetworkHD but takes **four local HDMI inputs**; it is not an AVoIP
  endpoint and does not decode a NetworkHD stream. Designing it in as a decoder would be wrong, so
  that is recorded in `checks`.
- **`RX-70-4K`** — the maximum-resolution table does **not** list 3840x2160 @60Hz, and the 297MHz
  pixel clock is consistent with that limit. Any 4K60 requirement needs checking against it.
- **`NHD-600-TRX`** — 4K60 4:4:4 8bit is documented as "with light compression". It should not be
  presented as uncompressed without qualification.
- **`NHD-000-RACK4`** — device mounting brackets are **not** included with the chassis; they ship
  with each endpoint. A quote for the chassis alone is incomplete.

**`NHD-500-RX` is not in this batch and is blocked.** It is the second most used template SKU (9
appearances), but `https://www.wyrestorm.com/product/nhd-500-rx/` returns 404 and `products.csv`
carries no URL for it — its `evidence_source` reads "Existing Wingman product intelligence index",
which is not an official source. **It needs a datasheet or a corrected URL before it can be drafted
at all**, and that is a question for WyreStorm rather than something to infer.

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

### P0-3 · Two divergent migration sets — one of them has no RLS at all — ✅ RESOLVED 2026-07-24

_Added 2026-07-24, found while investigating the red CI column on GitHub._

**Evidence.** The repo contains two independent sets of migrations that create **the same nine
tables** (`wingman_app_state`, `wingman_users`, `wingman_workspaces`, `wingman_workspace_members`,
`wingman_workspace_invitations`, `wingman_sessions`, `wingman_projects`, `wingman_audit_events`,
`wingman_telemetry_events`):

| Set | Files | `ENABLE ROW LEVEL SECURITY` | `CREATE POLICY` |
|---|---|---|---|
| `server/migrations/` | `001_initial_schema.sql`, `002_scope_service_role_policies.sql` | **9** | **9 + 9 rescoped** |
| `supabase/migrations/` | three `20260310_*.sql` files | **0** | **0** |

The `supabase/migrations/` set creates the tables with **no RLS enabled and no policies defined**,
and no explicit `GRANT`s. In a stock Supabase project, tables in `public` without RLS are readable
by anyone holding the anon key. Supabase's own linter classifies this as an error-level finding.

> **Severity correction (2026-07-24).** An earlier revision of this section, and PR #114, said the
> anon key "ships publicly in the browser bundle". **That was wrong, and it overstated the
> urgency.** Verified since: the Wingman client never imports `@supabase/supabase-js`, no anon key
> exists anywhere in `.env.example` or the Vite config, and only the server talks to Supabase —
> with the service-role key, which bypasses RLS regardless.
>
> The accurate position: this was a **latent defence-in-depth gap, not an active exposure**. It
> would have become live the moment anyone obtained the project's anon key (which is public by
> design and visible in the dashboard) and hit the PostgREST endpoint directly, or wired an anon
> key into any client. `server/migrations/002` was written for exactly that reason — its own
> comment says "if an anon/publishable Supabase key were ever wired up".
>
> The fix still stands on its merits and the two sets genuinely had to be reconciled. But this was
> not a live data leak, and I should not have implied it was.

**Why this matters now.** `LAUNCH_CHECKLIST.md` §4 tells the operator to apply
`001_initial_schema.sql` — the safe set. But the Supabase GitHub integration reads
`supabase/migrations/`, so whichever path is used to provision production decides whether the
database has RLS. That is a coin-flip on a security control, resolved by whoever runs the
provisioning step.

**Instructions:**

1. **Name one authoritative set.** `server/migrations/` is the safe, documented, policy-complete
   one. Recommendation: keep it, and delete or regenerate `supabase/migrations/` from it.
2. If Supabase branching/preview is meant to stay, `supabase/migrations/` must be a faithful copy
   including `ENABLE ROW LEVEL SECURITY` and the `002` role-scoped policies — not a parallel
   hand-written schema.
3. **Verify against the live database, not the files.** Before any real data is stored, confirm
   in the Supabase dashboard that RLS is on for all nine tables and that the anon key cannot read
   `wingman_projects` or `wingman_users`.
4. Add a guard to `verify` asserting the two sets create the same tables and the same RLS surface,
   so they cannot drift again. This fits the existing tool idiom.

**Exit criteria:** one migration set, RLS confirmed on in the live project, anon key proven unable
to read application tables.

### Applying this to a live project

The migration files are reconciled and guarded, but **no database has been touched** — the code
fix and the live fix are separate things, and only the first is done. The Supabase project was
paused as of 2026-07-24, so nothing could be applied or verified against it.

Once the project is resumed:

```bash
# 1. Apply the migration. Idempotent - safe to re-run, safe if tables exist.
#    Easiest route without the Supabase CLI: paste the file into the
#    dashboard SQL editor and run it.
#    supabase/migrations/20260724_enable_rls_on_wingman_tables.sql

# 2. Prove it worked, from outside, using the public key.
SUPABASE_URL=https://<project>.supabase.co \
SUPABASE_ANON_KEY=<anon key from Settings > API> \
npm run check:supabase-rls
```

`check:supabase-rls` (`tools/verify-supabase-rls.mjs`) probes all nine tables with the anon key
and is read-only, so it is safe against production. It reports `EXPOSED` only when the public key
actually returns rows — a definitive result.

**Read its "unclear" verdicts carefully.** With RLS on and no anon policy, PostgREST filters rows
rather than refusing, returning `200 []`. An *empty* table with RLS *off* returns exactly the same
thing. Those two cases are indistinguishable from outside the database, so the tool reports them
as inconclusive rather than passing them. For those tables, confirm in the dashboard under
**Database → Tables** (RLS toggle) or **Advisors → Security**. The check is strongest against a
database that actually holds rows.

Do this against a staging or branch project before production.

---

### P1-5 · CI is unenforced — `main` has no branch protection — ✅ RESOLVED 2026-07-24

_Added 2026-07-24._

**Evidence.** `gh api repos/SteveTechApp/Wingman/branches/main/protection` returns
`404 Branch not protected`. There are no required status checks. Consequently three consecutive
commits landed on `main` with genuinely failing checks:

| Commit | Failing repo checks |
|---|---|
| `296c40c` | Verify, Test |
| `aa09604` | Verify, Test |
| `265028e` | Test, Lint |

All were fixed by `f100ae8`, which passes all ten repo-owned checks. So the damage was transient —
but nothing prevented it, and nothing would prevent it next time.

This qualifies the "quality infrastructure" entry in §4: the CI is well-built and comprehensive,
and it is also advisory. A guard suite that does not block is a report, not a gate.

**Resolution (2026-07-24).** Branch protection is enabled on `main`:

| Setting | Value |
|---|---|
| Required checks | Lint · Type Check · Test · Verify (data) · Verify (contract) · Verify (visual) · Browser Smoke · Build · Dependency Audit |
| Branch must be up to date | yes |
| Applies to admins | **yes** |
| Force pushes / deletions | blocked |

`enforce_admins` is deliberately **on**. With it off, the sole repo admin can still push
straight to `main`, which would have let every one of the three red commits land exactly as
before - the protection would have been decorative. To bypass in a genuine emergency, turn it
off, push, and turn it back on:

```bash
gh api -X DELETE repos/SteveTechApp/Wingman/branches/main/protection/enforce_admins
# ... push the emergency fix ...
gh api -X POST repos/SteveTechApp/Wingman/branches/main/protection/enforce_admins
```

`Supabase Preview`, CodeQL and GitGuardian are deliberately **not** required: they are externally
owned, and a required check that fails for reasons outside the repo blocks all merges.

**Original instructions:**

1. Enable branch protection on `main` with required status checks: `Lint`, `Type Check`, `Test`,
   `Verify`, `Dependency Audit`, `Build`.
2. Do **not** make `Supabase Preview` required (see P2-5) — it is externally owned and currently
   failing for infrastructure reasons.
3. Require branches to be up to date before merging.
4. Once `verify` is staged (P1-1), make the four stage jobs the required checks instead.

---

### P2-5 · The red X on GitHub is a Supabase integration, not your code

_Added 2026-07-24, in answer to "should I be worried about these fails?"_

**Short answer: not about this one.** At the tip of `main` (`f100ae8`) all ten repo-owned checks
pass — Lint, Type Check, Test, Verify, Dependency Audit, Build, both Docker images, CodeQL. The
only failure is `Supabase Preview`, a check published by the Supabase GitHub App, not by any
workflow in `.github/workflows/`.

**Evidence — the failure is infrastructure:**
```
failed to connect to postgres: failed to connect to `user=postgres database=postgres`:
  [2a05:d01c:b72:2a02:...]:5432 dial error: timeout: context deadline exceeded
```
Only IPv6 addresses are attempted. It has failed on every commit since `2b7eef1` (2026-07-22);
the last success was `f0e6a64` on the same day.

**Two likely causes, both cheap to check:**
1. **Free-tier project paused.** Supabase pauses inactive free projects; the connection then times
   out exactly like this. Check the dashboard and resume.
2. **IPv6-only direct connection.** Supabase direct database connections are IPv6-only, and
   GitHub-hosted runners have no IPv6. The fix is to connect via the Supavisor pooler instead.

**Also note:** the repo has `supabase/migrations/` but no `supabase/config.toml`, which Supabase
branching normally expects. If branching is not actually wanted, disconnecting the integration
removes a permanently red check that trains everyone to ignore red checks — which is how the
three genuinely-broken commits in P1-5 slipped past unnoticed.

**Instructions:** decide whether Supabase branching is wanted. If yes, fix the connection and add
`config.toml`. If no, disconnect the GitHub App. Either way, do not leave a permanently failing
check on `main`.

---

### P1-1 · `verify` is a 69-step serial chain — restructure it — ✅ RESOLVED 2026-07-24

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

### P1-2 · CI does not run the checks that catch user-visible breakage — ✅ RESOLVED 2026-07-24

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

### P2-1 · No production observability — ✅ RESOLVED 2026-07-24

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

### P2-2 · In-memory rate limiting will not survive production topology — ✅ DOCUMENTED 2026-07-24

**Evidence:** `wingman-app-store.mjs:996-1020` — auth rate
limiting (default 8 requests / 60s) is a process-local `Map`.

**Impact:** resets on every restart/redeploy, and does not coordinate across instances. On Render
free tier with a single instance this is *tolerable*; on any scale-out it is bypassable by
distributing requests. Not a launch blocker for an internal pilot — but record the constraint.

**Instructions:** document the single-instance assumption in `docs/OPERATIONS.md`; if the service
is ever scaled beyond one instance, move the limiter to Supabase or Redis first.

---

### P2-3 · No release versioning — ✅ RESOLVED 2026-07-24

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

### P2-4 · Documentation states the project is less ready than it is — ✅ RESOLVED 2026-07-24

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
- RLS policies in both `server/migrations` files, including a dedicated service-role scoping fix
  (`002_scope_service_role_policies.sql`). **Caveat — see P0-3: a second, divergent migration set
  exists under `supabase/migrations/` with no RLS at all.**

**Quality infrastructure**
- 717 tests across 88 files; zero `@ts-ignore`, zero `console.log`, zero `TODO` in 252 source files.
- A guard suite that **demonstrably works** — it caught the P0-1 regression before a human did.
- CI runs lint, typecheck, test, verify and dependency audit on both packages, plus CodeQL and
  Docker image builds — 10 checks. **But none of it is enforced: `main` has no branch protection
  (P1-5), so red commits land anyway.**

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
- [ ] One authoritative migration set; RLS confirmed ON in the live Supabase project; anon key
      proven unable to read `wingman_projects` / `wingman_users`
- [ ] Branch protection on `main` with required status checks
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
