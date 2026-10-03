# Wingman Development Milestones — Evidence-Based Roadmap

**Version:** `0.9.0` (package.json) · **Refreshed:** 2026-09-08 from `main` @ `2f8f3a5c`
**Supersedes the 2026-08-24 roadmap.** Every figure in §1 was measured on this commit with the
command shown next to it; nothing was copied from an older status document.

This is the **development roadmap**, not the status file. Live status, executed gate results and
ranked blockers live in `docs/PRE_PRODUCTION_REPORT.md`; `docs/CURRENT_STATUS.md` is the
at-a-glance pointer; this file records the plan to v1.0 and the evidence for it.

The tables below preserve the detailed 2026-09-03 architecture snapshot. The current release
baseline is 2,368 passing tests across 308 files, 29 E2E files, 2,502 commits, 212 npm scripts,
315 WyreStorm products and 133/133 governed active lead SKUs. Since that snapshot, per-project
server persistence, canonical design revision approval, canonical product-branch consolidation,
Compare topology recovery, mirrored distribution semantics, the training portal and the refreshed
Guided sales journey have landed. See `docs/PRE_PRODUCTION_REPORT.md` for the executed 2026-09-08
gate evidence.

---

## 1. Measured state (2026-09-03)

| Metric | Value | How it was measured |
|---|---|---|
| Working tree | Clean `main` @ `7e619330` (merge of PR #224, migration-tooling hardening) | `git status`, `git log --oneline -5` |
| Commits | 2,472 | `git rev-list --count HEAD` |
| Unit/integration tests | **2,228 passing across 280 files** | `npx vitest run` (75 s, exit 0) |
| Playwright E2E specs | 14 in `e2e/` — workflow, visual regression, accessibility | `git ls-files e2e/` |
| npm scripts | 205 total (105 `check:*`, 17 `audit:*`, 5 `verify:*`) | `package.json` |
| Verify chain | 5 fail-fast stages, **86 top-level npm-run steps** | script expansion of the 5 `verify:*` stages |
| Source files (`src/**/*.ts,tsx`) | 551 | `git ls-files` |
| Source lines | ≈59k across `src` + `server` + `tools`; ≈195k tracked non-binary lines repo-wide | `wc -l` on `git ls-files` |
| WyreStorm canonical catalogue | **315 products** | `public/product-intelligence-index.json` (`products: 315`) |
| Product index size | **10.2 MB** single JSON | `ls -la public/product-intelligence-index.json` |
| Governed technical data | **133/133 active lead SKUs verified** (0 drafted, 0 no-profile); 138 specifiable lead products (115 verified, 22 verified-with-warning, 1 review-required) | `node tools/check-wyrestorm-technical-data.mjs` |
| Competitor catalogue | **354 products / 28 brands** | `data/catalog/competitor-products.generated.json` |
| Data review queue | 443 items in 4 sheets — 75 new candidates (72 open), 47 ports/IO gaps, 143 lifecycle confirmations, 178 commercial confirmations | `Wingman-Product-Database-Review-Queue.md` (generated 2026-09-03) |

**Change since the July audit (PRE_PRODUCTION_REPORT):** governed technical data went from
**7/127 verified** to **133/133** — the former P0-2 backlog is closed for active lead SKUs and the
baseline ratchet has moved from 127 to 133. Tests went from 717 to 2,228, a Playwright E2E suite
appeared, and the Supabase migration sets were reconciled with `check:migration-parity` in
`verify:data` and live-schema tooling hardened through PR #224.

---

## 2. How quality is enforced today (do not rebuild this)

- **`npm run verify`** = 5 stages — `verify:fast` (typecheck + lint + tests, ≈60 s),
  `verify:build` (data compile + `vite build` + size budgets + dependency/override guards),
  `verify:data` (data sources, technical data, lifecycle, story coverage, governance),
  `verify:contract` (routes, workflow, readiness, compare/decision gates, API contract),
  `verify:visual` (CSS/route-specific styling guards, page-markup migration, dashboard layout).
  The pre-commit hook runs the full chain.
- **CI** runs the stages in a matrix plus lint/typecheck/test-with-coverage jobs; `main` has branch
  protection with 9 required checks applying to admins (see PRE_PRODUCTION_REPORT §P1-5).
- **Nightly / scheduled workflows:** evidence-freshness (live official-page checks), Supabase RLS
  sentinel, vendor-data refresh, governed-data gate, secret drill, Docker builds.
- **Ratchets that make progress monotonic:** technical-data baseline (now 133), size budgets
  (`docs/SIZE_BUDGETS.md`), style-drift baseline, CI coverage thresholds, migration parity.
- **Honesty guards:** `check:sales-facing-language`, `check:documentation-contract` (local links,
  `npm run` references, proposal export sections), `check:routes`, `check:readiness`.

## 3. Capabilities shipped and gate-protected

Money-path capabilities are now exercised by the E2E suite and/or guarded by dedicated checks, so
they are not candidate work items:

| Capability | Protected by |
|---|---|
| Discovery → Recommendations → Proposal | `e2e/discovery-to-proposal-workflow.spec.ts`, `e2e/discovery-happy-path.spec.ts`, `check:discovery-topology` |
| Call cards → quick compare → add to proposal | `e2e/call-card-to-proposal.spec.ts`, `e2e/product-call-card-happy-path.spec.ts`, `check:call-cards` |
| Competitor Compare (live + no-match) | `e2e/compare-happy-path.spec.ts`, `e2e/real-competitor-compare.spec.ts`, decision-ledger snapshots (`check:competitor-decisions`), governed evidence checks |
| Templates & template BOMs | `e2e/template-to-proposal-workflow.spec.ts`, `e2e/template-bom-verification.spec.ts`, `check:template-sku-lifecycle`, `check:template-signal-path` |
| Battle cards / win-loss feedback | `e2e/battle-cards-search.spec.ts`, `e2e/win-loss-recording.spec.ts` |
| Proposal export safety | `e2e/proposal-export-validation.spec.ts`; `check:docs` enforces the 7 safety sections in `proposalExport.ts` |
| Offline shell (service worker) | `public/sw.js` — versioned caches, prune-on-activate |
| Auth, storage, RLS, security | server tests + `check:supabase-rls`/nightly sentinel; see PRE_PRODUCTION_REPORT §4 (production-grade, do not rebuild) |

---

## 4. Roadmap to v1.0 — recommended development goals

### Group A · Reliability, performance & measurement

- [x] **A1 — Repair the load-test harness.** Done 2026-09-03. `tools/load-test.mjs` now boots the
  real server on a throwaway port/data dir, signs up authenticated workspace sessions, and
  benchmarks health, project load/save, Compare and the payload-limit probe at
  smoke/standard/stress/spike levels; measured baselines recorded in `docs/LOAD_TESTING.md`.
  The proposal-export flow is client-side code, benchmarked separately by
  `tools/proposal-export-load.test.mjs` (`npm run load-test:proposal-export`).
- [ ] **A2 — Benchmark authenticated flows.** Harness covers project load/save, Compare,
  proposal compilation/export, and storage-mode-aware Supabase synchronization (run the server
  in `supabase-tables` mode via `--storage-mode` or target a Supabase-backed deployment with
  `--url`). Measured so far (2026-09-03, in `docs/LOAD_TESTING.md`): standard/stress/spike at
  file storage (local host) and an attributable standard-level `supabase-tables` run against
  the hosted `.env` Supabase project (fail-closed; 12/12 project rows auto-verified
  persisted — the harness now reads the run's rows back itself after every spawned
  `supabase-tables` run and exits 1 on any mismatch, replacing the manual read-back;
  unit-tested in `tools/load-test-persistence.test.mjs`). A verified pass now also
  deletes the run's own signups/workspaces/project rows (FK-safe direct PostgREST
  deletes + zero-remaining re-check; `--keep-db-data` opts out), so repeated runs
  need no manual DB cleanup — proven live with two back-to-back smokes that left
  the project at its exact pre-run state.
  Getting that run green surfaced and fixed three real supabase-tables blockers: the
  `wingman_snapshot_commit`/`wingman_ledger_commit` 42702 SQL bug (migrations 009/011/012,
  applied live), the client-stage-vocabulary vs DB CHECK-constraint mismatch, and silent
  file-store fallback on remote failure (harness now forces fail-closed). The vocabulary gap
  is now CLOSED server-side: the constrained row columns are canonicalised at snapshot build
  time (ADR-0001 §1.2g) while the payload blob keeps the client strings, the hydration E2E
  pins it in supabase-tables mode, and the corpus speaks the real client vocabulary again.
  The canonical vocabulary is now defined in one place (`docs/PROJECT_LIFECYCLE_DICTIONARY.md`)
  and enforced on every provisioning route by migration 014's named
  `wingman_projects_stage_check`/`wingman_projects_status_check` constraints (the Supabase
  GitHub-integration migration set had created `wingman_projects` without them).
  Cross-instance safety: migration 013's generation register + CAS guard makes the
  whole-snapshot commit safe when two server instances share one Supabase project
  (ADR-0001 §1.2h) — two-process race E2E, SQL validated on real Postgres, applied live.
  Open: a staging run.
- [ ] **A3 — Establish p95, p99, error-rate and payload-size budgets.** Initial budgets recorded
  in `docs/LOAD_TESTING.md` (2026-09-03) and enforced by `--strict` in the harness; not yet
  wired into a scheduled CI job.
- [x] **A4 — Rewrite `DEVELOPMENT_MILESTONES.md` from current evidence.** This file, 2026-09-03.
- [ ] **A5 — Add `CONTEXT.md` and architecture decision records.** Capture the storage model
  decision (P1-3), the governed-Compare workflow, and the canonical-proposal-artifact direction.
  Suggested home: `docs/design/` alongside existing design notes. Started 2026-09-03:
  ADR-0001 (`docs/design/0001-project-workspace-persistence.md`) records the storage-model
  decision (server-authoritative with local cache, recommended) with phases and exit criteria;
  `CONTEXT.md` and the Compare/proposal ADRs remain.
- [ ] **A6 — Prioritise the data review queues by product usage and commercial exposure.**
  Measured state 2026-09-03: 443 items — **72 open new candidates**, **47 ports/IO gaps**,
  ~140 lifecycle flags now auto-enforced by `lifecycle:reconcile`, and 178 commercial-approval
  rows that belong in the quote-safety approval workflow rather than a spreadsheet. Sheet 2
  (ports/IO) and the 404-filtered sheet 1 remain genuinely manual; order by template-BOM and
  proposal reach, not alphabetically.

### Group B · Architecture: persistence & scale

- [ ] **B1 — Introduce project/workspace-scoped persistence.** `projectStore.ts` persists to
  `localStorage` under one key and backend sync is gated on a build-time flag — the P1-3 open
  decision (server-authoritative with local cache vs local-first). This is the recommended first
  investment: it removes the clearest scaling risk and gives Project, Discovery, Compare and
  Proposal one storage substrate to simplify against.
- [ ] **B2 — Deepen the frontend project-workspace module behind commands and queries**, so pages
  do not reach into storage primitives directly (mirror the existing module boundaries in
  `src/wingman2/lib`).
- [ ] **B3 — Test multi-workspace concurrency, rollback and increasing dataset sizes.** Two-session
  edit reconciliation ("confirm neither edit is silently lost") started 2026-09-03:
  `server/project-store-two-session-merge.e2e.test.mjs` reproduces the loss in both sync orders
  and is green after the server merge hardened to per-sub-document embedded-timestamp LWW for
  the timestamped single-value sub-documents (ADR-0001 §1.2b). Same-sub-document (same-field)
  conflicts are now closed too: per-project revision counters (`syncRevision`/`baseRevision`
  round trip) resolve them deterministically in either sync order — (edit time, revision basis,
  author) total order, asserted by the same E2E's equal-timestamp case (ADR-0001 §1.2d,
  2026-09-03). A stress variant (`server/project-store-two-session-stress.e2e.test.mjs`)
  drives 200 interleaved overlapping saves from both sessions and asserts no edit is ever
  silently dropped after every single response (ADR-0001 §1.2e). The CLIENT side of reload
  hydration now follows the same policy: `hydrateProjectStoreFromBackendOnce` merges per
  sub-document (six timestamped sub-documents by embedded time, by-id list unions, revision-
  basis tie-break) so offline-then-reload keeps the offline edit even when the backend whole
  project advanced, and a reloading two-tab copy adopts the other tab's newer sub-document  on a
  whole-time tie — E2E cases 4-5 in `server/project-store-hydration.e2e.test.mjs`, both
  verified red against the pre-fix whole-project logic (ADR-0001 §1.2f). The id-keyed
  collections
  (compareRuns/proposalVersions/requirements/productSelections/visualAssets) are now closed
  too:  both the server sync merge and client hydration merge them per item by embedded
  write-time LWW with a freshness-guarded removal rule, with cross-side parity coverage
  (`server/project-store-id-keyed-collections.parity.test.mjs`) and concurrent-edit E2E
  cases for all five collections in both sync orders (disjoint-item union and same-item
  determinism, `server/project-store-two-session-merge.e2e.test.mjs`) plus the stress
  suite's shared requirements lane (ADR-0001 §1.2i, 2026-09-03). When a sync
  response reports a revision newer than the local basis, the store now marks the
  project `syncConflict` with the exact changed lanes (diff of sent vs returned
  doc) and surfaces it — amber "Team changed"  badge on the project row, banner on
  the detail page — clearing automatically once the tab adopts the member's
  version and syncs clean (ADR-0001 §1.2j, `server/project-store-sync-conflict.e2e.test.mjs`,
  2026-09-03). Reload hydration is now an incremental pull: the client sends
  its per-project last-seen revisions (`X-Wingman-Since`) and downloads only
  the rows that moved (syncConflict-flagged copies force their row back so
  the reconcile path of §1.2j keeps working), and a since-pull never rewrites
  the store — measured 258 B vs 366 KB for a no-change supabase-tables reload
  (ADR-0001 §1.2k, `server/project-store-incremental-hydration.e2e.test.mjs`,
  harness `--scenarios project-save,hydrate-since`, 2026-09-03). ADR-0001
  Phase 1's server half is done (2026-09-03, §1.2l): per-project
  `GET/PUT /api/wingman/projects/:id` routes alongside the whole-store
  endpoints, the PUT committing ONE row through migration-015
  `wingman_project_put` — the row's own revision is the CAS (stale commits
  refuse and re-merge with a bounded retry), a successful commit advances the
  generation register so whole-snapshot writes cannot reconcile the row away,
  and the audit row lands in the same transaction
  (`server/project-store-per-project-sync.e2e.test.mjs`; RPC semantics proven
  directly against real Postgres on the zero-network stack). The harness
  `project-put` scenario (opt-in, auto-verifies one persisted row per PUT)
  measured the write path on the local stack at p50 415.61 ms vs the
  whole-store sync POST's 871.88 ms (−52%) with a 4× smaller payload and no
  whole-snapshot RPC per save — the attributed re-run quantifies the
  reduction: whole-DB RPC + serialization gone from a save (single-row
  commit 8.8 ms p50), store-lock queue −51% p50 and lock run −44% p50 (dated
  `WINGMAN_STORE_PROFILE` baseline in docs/LOAD_TESTING.md).
  Open: client migration to per-project push granularity (narrows the store
  read + lock to one row), rollback, increasing dataset sizes.
- [ ] **B4 — Split the 10.2 MB product index** (`public/product-intelligence-index.json`) into a
  searchable summary index plus deferred technical detail, so initial route load does not pull the
  full catalogue (see bundle findings in PRE_PRODUCTION_REPORT §P1-4).
- [ ] **B5 — Begin removing route-specific CSS accumulation.** Measured and ratcheted today by
  `check:style-drift-baseline` and `wm:guard-css`; work the counted page/compare sections down.

### Group C · Product & workflow governance

- [ ] **C1 — Build one canonical proposal artifact.** Today `proposalExport.ts` enforces 7 safety
  sections; make export formats render from one semantic document so DOCX/PDF/screen cannot
  diverge.
- [ ] **C2 — Model Discovery as a resumable state machine**, so re-entry and partial capture are
  first-class instead of stored as ad-hoc UI state.
- [ ] **C3 — Move Compare policy into a governed input-to-result workflow.** Evidence-led wording
  (`check:compare-evidence-led-wording`), the competitor-decision ledger and match-decisions
  snapshots already exist; extend the same governance to every Compare entry point.
- [ ] **C4 — Consolidate canonical product taxonomy across client and server** (role, family,
  lifecycle, transport) so Compare, templates and proposal reads agree by construction.
- [ ] **C5 — Replace source-marker checks with interface-level behavioural tests.** The P0-1
  lesson: a guard that greps for a literal string can be satisfied by a string in the wrong
  place; prefer rendered-output assertions like `templateWorkflowRendered.test.tsx`.

---

## 5. v1.0 release criteria (agreed gate, not checklist prose)

Before calling this v1.0, all of the following must be true **and evidenced by a dated artefact**:

| Criterion | Status (2026-09-03) | What would close it |
|---|---|---|
| Real sales-rep mobile UAT | ⬜ No UAT on record | Dated UAT runs on tablets/phones (a11y + visual E2E specs exist but are not UAT) |
| Authenticated production-like load tests | ⬜ | A1 + A2 run against a staging server with a real account; results recorded |
| Offline edit/reconnect/reconciliation tests | ⬜ | Offline shell exists (`sw.js`) but no reconnect/reconciliation spec; B3 covers the two-tab case |
| Large-workspace performance tests | ⬜ | B3/B4 datasets at realistic project size; p95/p99 budgets from A3 |
| Proposal semantic parity across every export format | ◐ Partial | `proposal-export-validation.spec.ts` exists; a parity matrix across export formats does not (C1) |
| Agreed closure thresholds for missing critical specifications and evidence | ◐ Mostly met by ratchet | 133/133 lead SKUs verified; residual thresholds (verified-with-warning counts, review-required row, commercial-approval queue) need a dated business sign-off |
| Observability for actual journey completion and failure rates | ◐ Partial | Client error reporting + structured logs exist (P2-1); journey-level completion/funnel and error-rate metrics do not (A3) |

---

## 6. Verified technical debt (2026-09-03)

| Item | Evidence | Severity |
|---|---|---|
| `ComparePageNew.advanced.tsx` | 6,418 lines | HIGH — split into sub-components |
| `roomTemplates.ts` | 3,376 lines | MEDIUM — extract template definitions to data, keep signal-path guard |
| `ProductCallCardsPage.tsx` | 2,011 lines | MEDIUM — extract grid/search/compare |
| Guard-tool sprawl | 105 `check:*` scripts, incl. eight near-duplicate `check:dashboard-*` guards encoding one-off visual corrections (P1-1 finding) | MEDIUM — consolidate to fewer contracts or retire implausible regressions |
| Commit friction ratchets | pre-commit runs fast tests + architecture boundaries; shipped-size and style-drift ratchets run in CI/full verify, and raising either requires the exception process in `docs/SIZE_BUDGETS.md` | LOW — merge protection remains strict without rebuilding on every commit |
| Service worker | cache versioning + prune exist; **no cache-size monitoring / cap** (warn >50 MB) | LOW |
| Single 10.2 MB product index | one JSON for the whole catalogue (B4) | MEDIUM |

---

## 7. Data governance — state of the former P0

- **Closed:** every active lead SKU has a verified governed profile (133/133, baseline 127 → 133).
  `check:technical-data --strict` now passes where July's audit showed 7/127.
- **Ratcheted:** confirmation aging is measured (0 past the 14-day warn threshold today); nightly
  freshness re-checks official pages.
- **Still human work:** 47 ports/IO items, 72 real new-candidate SKUs (404 rows filtered), and
  commercial-approval sign-off per SKU where the business wants it. Lifecycle confirmation is
  automated (`lifecycle:reconcile` + successor/architecture/reference guards) and the residual
  review queue rows are stale.

---

## 8. Keeping this file honest

Do not hand-edit the §1 table. Re-measure, then edit:

```bash
npx vitest run --reporter=dot | tail -5            # test counts
git rev-list --count HEAD                          # commits
node tools/check-wyrestorm-technical-data.mjs      # governed coverage
ls -la public/product-intelligence-index.json      # index size
npm run verify                                     # full gate before commit
```

Related documents: `docs/PRE_PRODUCTION_REPORT.md` (live status), `docs/CURRENT_STATUS.md`
(at-a-glance), `docs/LAUNCH_CHECKLIST.md` (go/no-go), `docs/LOAD_TESTING.md` (load method),
`docs/DOCUMENTATION_MAP.md` (map), `Wingman-Product-Database-Review-Queue.md` (queue export),
`docs/CI_GUARD_GATES.md` and `docs/SIZE_BUDGETS.md` (gate/exception rules).
