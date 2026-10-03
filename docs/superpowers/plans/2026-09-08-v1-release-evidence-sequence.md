# Wingman v1 Release Evidence Sequence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the current guided-interface work and remaining roadmap items into a verified, dated, defensible v1 release candidate.

**Architecture:** Work proceeds through independently reviewable gates: stabilize the current UI change, make status documentation derive from current evidence, collect environment-dependent release evidence, finish persistence and catalogue performance changes, and publish one final evidence matrix. Existing verification scripts and ratchets remain authoritative; new work extends them rather than bypassing them.

**Tech Stack:** React 18, TypeScript, Vite, Vitest, Playwright, Node.js, Supabase/Postgres, CSS.

**Spec:** `docs/DEVELOPMENT_MILESTONES.md` sections 4–5 and the user-approved five-step sequence from the 2026-09-08 development review.

## Global Constraints

- Run the real TypeScript gate with `npm run typecheck` / `tsconfig.typecheck.json`.
- Run server tests through Vitest, never raw `node --test`.
- Do not raise size or style-drift ratchets without the exception process in `docs/SIZE_BUDGETS.md`.
- Preserve governed Compare confidence-tier semantics and sales-facing language rules.
- Keep user-authored working-tree changes intact and commit only coherent, verified groups.

---

### Task 1: Stabilize and commit the guided interface

**Files:**
- Modify as required: `src/wingman2/components/GuidedDashboard.tsx`
- Modify as required: `src/wingman2/components/UiModeToggle.tsx`
- Modify as required: `src/wingman2/layout/AppShell.tsx`
- Modify as required: `src/wingman2/pages/DiscoveryPage.tsx`
- Modify as required: `src/wingman2/styles/wingman-reference-global.css`
- Modify as required: `src/wingman2/styles/wingman-workflow-theme.css`
- Test: existing `src/**/*.test.*`, `tools/check-*.mjs`, and `e2e/*.spec.ts`

**Interfaces:**
- Consumes: `useUiMode`, `routeCatalogByKey`, AppShell navigation contracts.
- Produces: a stable Guided/Full selector and guided sales journey that passes every repository ratchet.

- [ ] **Step 1: Run `npm run verify` and capture the first failing gate.**
- [ ] **Step 2: For each failure, add or tighten the nearest behavioural assertion before changing implementation where the failure exposes untested behaviour.**
- [ ] **Step 3: Apply the smallest implementation/CSS correction and rerun the focused failing command.**
- [ ] **Step 4: Rerun `npm run verify` to a clean exit.**
- [ ] **Step 5: Stage only the six guided-interface files and any directly required tests, inspect `git diff --staged`, and commit with `feat(guided): refine sales journey interface`.**

### Task 2: Refresh current-status documentation

**Files:**
- Modify: `docs/CURRENT_STATUS.md`
- Modify: `docs/PRE_PRODUCTION_REPORT.md`
- Modify: `docs/DEVELOPMENT_MILESTONES.md`
- Test: `npm run check:docs`

**Interfaces:**
- Consumes: the exact Task 1 commit, live Git/test/data measurements, and executed gate results.
- Produces: one current status source plus aligned pointer and roadmap documents.

- [ ] **Step 1: Measure commit, test, E2E, catalogue, governed-data, and gate counts using repository commands.**
- [ ] **Step 2: Replace stale July findings in `PRE_PRODUCTION_REPORT.md` with a dated current verdict, evidence table, open risks, and release criteria.**
- [ ] **Step 3: Update `CURRENT_STATUS.md` to quote the new evidence and keep it as a concise pointer.**
- [ ] **Step 4: Reconcile completed September work and remaining items in `DEVELOPMENT_MILESTONES.md`.**
- [ ] **Step 5: Run `npm run check:docs`, then commit as `docs: refresh Wingman release status`.**

### Task 3: Collect staging-load and mobile-UAT evidence

**Files:**
- Modify: `docs/LOAD_TESTING.md`
- Create: `docs/trusted-testing/mobile-sales-uat-2026-09.md`
- Modify: `docs/trusted-testing/release-checklist.md`

**Interfaces:**
- Consumes: staging URL/account supplied through the existing load harness and real sales-representative test sessions.
- Produces: attributable p95/p99/error/payload results plus signed device/scenario observations.

- [ ] **Step 1: Validate the load harness locally with its smoke profile and record the exact command/result.**
- [ ] **Step 2: Run the strict authenticated staging profile; preserve environment attribution without recording credentials.**
- [ ] **Step 3: Execute the existing discovery, compare, proposal, offline/reconnect, accessibility, and responsive scenarios on agreed phone/tablet devices.**
- [ ] **Step 4: Record tester, date, device/browser, scenario result, defect reference, and sign-off decision in the UAT artifact.**
- [ ] **Step 5: Run documentation checks and commit the evidence as `docs(release): record staging load and mobile UAT`.**

### Task 4: Complete per-project sync and catalogue delivery

**Files:**
- Modify: `src/wingman2/data/projectStore.ts`
- Modify: relevant `server/competitor-lookup-server.mjs` project routes only if contract gaps emerge
- Create/modify: focused project synchronization tests under `server/` and `src/wingman2/data/`
- Modify: product-index generation/loading modules identified by `rg "product-intelligence-index" src server tools`
- Create/modify: focused catalogue loading and size-budget tests

**Interfaces:**
- Consumes: `GET/PUT /api/wingman/projects/:id`, `syncRevision`/`baseRevision`, generated product intelligence.
- Produces: per-project client writes with deterministic reconciliation and a small summary index with deferred detail loading.

- [ ] **Step 1: Add a failing client sync test proving one edited project uses the per-project PUT without whole-store serialization.**
- [ ] **Step 2: Implement per-project push while preserving existing conflict metadata and bounded retry semantics.**
- [ ] **Step 3: Run project-store parity, two-session, hydration, conflict, and stress suites.**
- [ ] **Step 4: Add a failing build/data test that caps initial catalogue payload and verifies deferred detail lookup.**
- [ ] **Step 5: Split generated summary/detail artifacts and update runtime loading with backwards-safe error handling.**
- [ ] **Step 6: Run `npm run verify`, representative large-workspace/load profiles, and commit persistence and catalogue changes as separate conventional commits.**

### Task 5: Publish the v1 evidence matrix

**Files:**
- Create: `docs/V1_RELEASE_EVIDENCE.md`
- Modify: `docs/LAUNCH_CHECKLIST.md`
- Modify: `docs/CURRENT_STATUS.md`

**Interfaces:**
- Consumes: committed code, full-gate output, staging load evidence, UAT results, proposal parity evidence, governed-data measurements, and observability checks.
- Produces: one dated go/no-go table where every claim links to an artifact or command result.

- [ ] **Step 1: Create rows for every criterion in `DEVELOPMENT_MILESTONES.md` section 5 with status, evidence, owner, and residual risk.**
- [ ] **Step 2: Mark a criterion complete only when its dated artifact exists; otherwise record the exact blocker without estimating completion.**
- [ ] **Step 3: Run the full verification and documentation-contract gates from the final candidate commit.**
- [ ] **Step 4: Update launch/status pointers and commit as `docs(release): publish v1 evidence matrix`.**
