# Wingman Modular Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Wingman cheaper to change by replacing monolithic stores/pages and filename-based chunks with tested domain boundaries and meaningful architecture/ship-size gates.

**Architecture:** Migrate one seam at a time behind compatibility facades. Feature packages own business rules and UI panels; project persistence is a repository with codecs and domain command modules. Replace page byte ratchets only after import-direction, maximum-file-size, and route-laziness checks provide stronger protection.

**Tech Stack:** React 19, TypeScript, Vite/Rolldown, Vitest, Playwright, Node.js policy scripts.

**Spec:** `docs/superpowers/specs/2026-09-11-wingman-modular-refactor.md`

## Global Constraints

- Preserve stored project schema compatibility and `wingman-project-store-v1`.
- Preserve API envelopes, route URLs, analytics identifiers, governed data, and sales-facing copy.
- Use `npx tsc --noEmit -p tsconfig.typecheck.json`; default `tsconfig.json` is not the gate.
- Run server tests with Vitest, never raw `node --test`.
- Do not raise size or style baselines to obtain a green build.
- Each task must leave `npm run verify:fast` and its focused contract tests green.

---

### Task 1: Replace the size ratchet with architectural guardrails

**Files:**
- Create: `tools/lib/wingman-architecture-boundaries.mjs`
- Create: `tools/check-wingman-architecture-boundaries.mjs`
- Create: `tools/lib/wingman-architecture-boundaries.test.mjs`
- Modify: `tools/lib/wingman-size-budgets.mjs`
- Modify: `tools/wingman-size-budgets.json`
- Modify: `package.json`
- Modify: `docs/SIZE_BUDGETS.md`
- Modify: `docs/CI_GUARD_GATES.md`

**Interfaces:**
- Produces `checkWingmanArchitecture({ rootDir, migrationAllowlist })` returning violations with `rule`, `file`, and `detail`.
- Keeps shipped-size IDs `initial:js`, `total:js`, `total:css`, and named generated chunks.

- [ ] Write fixture tests proving the guard rejects files over 1,200 lines, page entries over 400 lines, private cross-feature imports, and feature imports from app-core.
- [ ] Run `npx vitest run tools/lib/wingman-architecture-boundaries.test.mjs` and confirm each new fixture fails for its intended rule.
- [ ] Implement AST/import scanning with a checked-in migration allowlist containing the current offenders and a rule that rejects additions to that list.
- [ ] Add `check:architecture-boundaries` to `verify:build` before size checks.
- [ ] Remove `source:*` entries from the size checker only after the new guard tests pass; retain shipped-size budgets and document why architectural gates supersede raw source bytes.
- [ ] Run `npm run check:architecture-boundaries && npm run check:size-budgets` against a fresh build.
- [ ] Commit: `build(quality): replace source byte ratchets with architecture gates`.

### Task 2: Extract the project schema and codecs

**Files:**
- Create: `src/wingman2/features/projects/model/projectTypes.ts`
- Create: `src/wingman2/features/projects/model/projectDefaults.ts`
- Create: `src/wingman2/features/projects/persistence/projectCodecs.ts`
- Create: `src/wingman2/features/projects/persistence/projectCodecs.test.ts`
- Modify: `src/wingman2/data/projectStore.ts`

**Interfaces:**
- Produces `decodeProjectStore(value: unknown): ProjectStoreSnapshot` and `decodeStoredProject(value: unknown): StoredProject | null`.
- Re-exports existing public types from `projectStore.ts` during migration.

- [ ] Move representative malformed/legacy snapshot cases from project-store tests into codec characterisation tests, including absent `omittedProductSkus`, old workflow routes, proposal revisions, and sync conflicts.
- [ ] Run the focused test and verify it fails before exports exist.
- [ ] Move types without changing field names or optionality; move pure defaults/normalisers without importing browser or network APIs.
- [ ] Replace internal normalisation in `projectStore.ts` with codec calls and re-export types.
- [ ] Run `npx vitest run src/wingman2/features/projects/persistence/projectCodecs.test.ts src/__tests__/projectStore.test.ts` and strict typecheck.
- [ ] Commit: `refactor(projects): extract schema and persistence codecs`.

### Task 3: Extract the project repository and synchronization service

**Files:**
- Create: `src/wingman2/features/projects/persistence/projectRepository.ts`
- Create: `src/wingman2/features/projects/persistence/projectSyncService.ts`
- Create: `src/wingman2/features/projects/persistence/projectRepository.test.ts`
- Modify: `src/wingman2/data/projectStore.ts`
- Modify: `src/wingman2/data/projectHydrationFetch.ts`
- Modify: `src/wingman2/data/projectHydrationMerge.ts`
- Modify: `src/wingman2/data/projectSyncConflict.ts`

**Interfaces:**
- Produces `projectRepository.read/write/subscribe/reset` and `projectSyncService.hydrate/schedule/resetSession`.
- The compatibility facade retains `readProjectStore`, `writeProjectStore`, `useProjectStore`, and hydration exports.

- [ ] Add tests pinning storage-event subscription, corrupt JSON recovery, disabled/authenticated sync modes, debounce, conflict preservation, and idempotent hydration.
- [ ] Move local/session storage and React subscription logic to the repository.
- [ ] Move fetch, authentication discovery, debounce, and hydration orchestration to the sync service.
- [ ] Keep server payload formats byte-compatible and run all `projectStore*`, project-sync, and authenticated server E2E tests.
- [ ] Verify `projectStore.ts` contains no `fetch`, `localStorage`, `sessionStorage`, or codec implementation.
- [ ] Commit: `refactor(projects): isolate repository and sync services`.

### Task 4: Extract project domain commands

**Files:**
- Create: `src/wingman2/features/projects/commands/projectLifecycle.ts`
- Create: `src/wingman2/features/projects/commands/discoveryCommands.ts`
- Create: `src/wingman2/features/projects/commands/recommendationCommands.ts`
- Create: `src/wingman2/features/projects/commands/proposalCommands.ts`
- Create: `src/wingman2/features/projects/commands/compareCommands.ts`
- Create: `src/wingman2/features/projects/commands/projectCommands.test.ts`
- Modify: `src/wingman2/data/projectStore.ts`

**Interfaces:**
- Commands accept a `ProjectRepository` dependency and return the updated project/snapshot.
- Existing store functions remain facade delegates until consumers migrate.

- [ ] Add command tests for create/copy/delete, discovery save, recommendation add/remove/evidence, compare history, proposal revisions, visual assets, requirements, and deal outcome.
- [ ] Move commands by domain without changing audit entries, timestamps, IDs, merge semantics, or active-project behavior.
- [ ] Inject repository/time/ID dependencies in tests; retain production defaults in the facade.
- [ ] Run project store, workflow handoff, proposal version, compare history, and videowall suites.
- [ ] Confirm `projectStore.ts` is at most 250 lines and functions only as a compatibility facade.
- [ ] Commit: `refactor(projects): split project commands by domain`.

### Task 5: Decompose Discovery into a controller and step panels

**Files:**
- Create: `src/wingman2/features/discovery/model/discoverySession.ts`
- Create: `src/wingman2/features/discovery/hooks/useDiscoveryController.ts`
- Create: `src/wingman2/features/discovery/components/DiscoveryWorkflow.tsx`
- Create: `src/wingman2/features/discovery/components/DiscoveryStepPanel.tsx`
- Create: `src/wingman2/features/discovery/components/DiscoveryReviewPanel.tsx`
- Create: `src/wingman2/features/discovery/index.ts`
- Modify: `src/wingman2/pages/DiscoveryPage.tsx`
- Modify: `src/__tests__/discoveryWorkflowRendered.test.tsx`

**Interfaces:**
- `useDiscoveryController()` owns state, persistence snapshots, guided-interview state, validation, and navigation commands.
- `DiscoveryPage` becomes route parsing plus `<DiscoveryWorkflow controller={controller} />`.

- [ ] Add rendered characterisation tests for standard capture, voice interview, resume position, validation, call notes, and Recommendations handoff.
- [ ] Extract pure state transitions and `buildDiscoveryBrief` inputs into `discoverySession.ts` with reducer tests.
- [ ] Move effects and callbacks into `useDiscoveryController`, using narrow project command imports.
- [ ] Move step/review markup into focused panels without changing accessible names or test IDs.
- [ ] Verify `DiscoveryPage.tsx` is at most 400 lines and run Discovery, guided interview, scenario, route, and sales-language gates.
- [ ] Commit: `refactor(discovery): split route controller and workflow panels`.

### Task 6: Decompose Project Detail into query, actions, and panels

**Files:**
- Create: `src/wingman2/features/projects/detail/projectDetailViewModel.ts`
- Create: `src/wingman2/features/projects/detail/useProjectDetailController.ts`
- Create: `src/wingman2/features/projects/detail/ProjectOverviewPanel.tsx`
- Create: `src/wingman2/features/projects/detail/ProjectBlockersPanel.tsx`
- Create: `src/wingman2/features/projects/detail/ProjectEvidencePanel.tsx`
- Create: `src/wingman2/features/projects/detail/ProjectProposalPanel.tsx`
- Modify: `src/wingman2/pages/ProjectDetailPage.tsx`

**Interfaces:**
- Produces `buildProjectDetailViewModel(project): ProjectDetailViewModel` and controller actions for blockers, requirements, workflow resume, proposal, and deal outcome.

- [ ] Pin blocker parsing, requirement answers, evidence traces, proposal actions, resume links, and deal outcomes with pure and rendered tests.
- [ ] Move formatting and blocker derivation into the pure view-model module.
- [ ] Move mutations/navigation into the controller and sections into focused panels.
- [ ] Keep existing `RecommendationEvidencePanel` and `RequirementsAccordion` as shared children rather than duplicating them.
- [ ] Verify `ProjectDetailPage.tsx` is at most 400 lines and run all Project Detail, project workflow, and proposal readiness tests.
- [ ] Commit: `refactor(projects): decompose project detail workspace`.

### Task 7: Decompose Recommendations and Product Call Cards

**Files:**
- Create: `src/wingman2/features/recommendations/hooks/useRecommendationsController.ts`
- Create: `src/wingman2/features/recommendations/components/RecommendationSystemPanel.tsx`
- Create: `src/wingman2/features/recommendations/components/RecommendationEvidencePanel.tsx`
- Create: `src/wingman2/features/recommendations/index.ts`
- Create: `src/wingman2/features/call-cards/hooks/useCallCardsController.ts`
- Create: `src/wingman2/features/call-cards/components/CallCardWorkspace.tsx`
- Create: `src/wingman2/features/call-cards/index.ts`
- Modify: `src/wingman2/pages/RecommendationsPage.tsx`
- Modify: `src/wingman2/pages/ProductCallCardsPage.tsx`
- Modify: `tools/check-retired-wingman-features.mjs`

**Interfaces:**
- Recommendations public API owns `loadRecommendationsDecisionBoundary` use and selection persistence.
- Call Cards public API owns filtering, selection, governed copy, and workflow handoff.

- [ ] Add boundary tests proving both pages use their public feature APIs and no page imports private selector/store internals.
- [ ] Extract controller state/effects, then extract stable visual sections with unchanged accessible behavior.
- [ ] Update retired-feature policy to parse imports through the feature public API instead of checking incidental source strings.
- [ ] Verify each route page is at most 400 lines; run blind scenarios, governed evidence/copy, call-card, and orphan-module gates.
- [ ] Commit: `refactor(workflows): modularize recommendations and call cards`.

### Task 8: Partition Compare by workflow responsibility

**Files:**
- Create: `src/wingman2/features/compare/model/compareSession.ts`
- Create: `src/wingman2/features/compare/hooks/useCompareController.ts`
- Create: `src/wingman2/features/compare/components/CompareInputPanel.tsx`
- Create: `src/wingman2/features/compare/components/CompareCandidatePanel.tsx`
- Create: `src/wingman2/features/compare/components/CompareVerdictPanel.tsx`
- Create: `src/wingman2/features/compare/components/CompareEvidencePanel.tsx`
- Create: `src/wingman2/features/compare/index.ts`
- Modify: `src/wingman2/pages/ComparePageNew.tsx`
- Modify: `src/wingman2/pages/ComparePageNew.advanced.tsx`

**Interfaces:**
- Controller exposes explicit states `idle | resolving | candidates | verdict | no-match | error` and actions without UI dependencies.
- Registry data remains behind async loaders; verdict tone continues to derive from `CompareConfidenceTier`.

- [ ] Characterise exact-SKU auto-advance, ambiguous candidates, governed verdicts, no-match, source repair, history, and approval queue.
- [ ] Extract state machine and side effects before moving rendered panels.
- [ ] Replace the 6,400-line advanced page with focused components under 1,200 lines each.
- [ ] Preserve compare CSS scoping and confidence-tier semantics.
- [ ] Run every Compare suite, output-quality audit, candidate gate, source-repair guard, and visual checks.
- [ ] Commit: `refactor(compare): partition workflow state and result panels`.

### Task 9: Make chunk ownership explicit and lazy

**Files:**
- Modify: `vite.config.ts`
- Create: `tools/check-wingman-route-laziness.mjs`
- Create: `tools/check-wingman-route-laziness.test.mjs`
- Modify: `tools/lib/wingman-size-budgets.mjs`
- Modify: `tools/wingman-size-budgets.json`

**Interfaces:**
- Stable chunks: `wm-project-core`, `wm-project-sync`, `wm-discovery-export`, `wm-template-workflow`, `wm-proposal-generation`, `wm-compare-engine`, and `wm-competitor-registry`.

- [ ] Add tests that build/analyse the Vite manifest and reject heavy feature modules in the initial preload graph.
- [ ] Replace broad filename regex groups with explicit feature-directory groups and priorities.
- [ ] Convert large static registry imports to async loaders at route/controller boundaries where behavior permits.
- [ ] Build three times and record the maximum deterministic measurement; lower named chunk budgets to the new measurements.
- [ ] Confirm `initial:js`, total JS, and total CSS do not grow from the pre-refactor baseline.
- [ ] Commit: `perf(build): align chunks with feature ownership`.

### Task 10: Remove compatibility imports and close the migration allowlist

**Files:**
- Modify: all `src/wingman2/**` consumers still importing `data/projectStore.ts`
- Modify: `src/wingman2/data/projectStore.ts`
- Modify: `tools/wingman-architecture-allowlist.json`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/SIZE_BUDGETS.md`

**Interfaces:**
- Pages import feature public APIs; shared libraries import project model types only; app shell imports project runtime facade only.

- [ ] Use `rg` to enumerate value and type imports from `data/projectStore.ts`; migrate type-only consumers first, then command consumers by domain.
- [ ] Add an architecture rule allowing `projectStore.ts` only from the app runtime compatibility boundary and legacy tests.
- [ ] Reduce every migration allowlist entry to zero and fail the check if a removed entry returns.
- [ ] Document the feature dependency graph, public APIs, chunk ownership, and procedure for adding a new domain.
- [ ] Run `npm run verify`, Windows critical E2E, authenticated project-sync E2E, and proposal output parity from a clean build.
- [ ] Commit: `refactor(architecture): enforce Wingman feature boundaries`.

## Final verification

- [ ] Run `npx tsc --noEmit -p tsconfig.typecheck.json`.
- [ ] Run `npm run verify` and retain the complete log as release evidence.
- [ ] Run `npm run test:e2e:windows-critical` on Windows.
- [ ] Run authenticated project sync conflict/idempotency suites.
- [ ] Run proposal screen/DOCX/PDF parity.
- [ ] Run `git diff --check` and ensure generated evidence changed only when intentionally refreshed.
- [ ] Compare fresh bundle metrics with the pre-refactor baseline and lower ratchets where reductions landed.
