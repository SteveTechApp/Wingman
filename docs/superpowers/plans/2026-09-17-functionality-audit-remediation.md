# Wingman Functionality Audit Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remediate the seven priority findings from the 2026-09-17 functionality audit without weakening Wingman's governed decision, persistence, or release-evidence contracts.

**Architecture:** Put approval and publication authority on the authenticated server; deepen the Project Workspace and governed decision modules behind their existing public interfaces; add capability and journey evidence interfaces; then generate release status from one evidence manifest. Preserve route URLs, storage decoding, decision outcomes, and export semantics while callers migrate incrementally.

**Tech Stack:** React 18, TypeScript 5.6, Vitest 4, Node ESM, Playwright 1.60, Supabase/Postgres adapters, Vite 8.

**Spec:** `C:/Users/steve/AppData/Local/Temp/architecture-review-wingman-20260917.html`

## Global Constraints

- Use `npx tsc --noEmit -p tsconfig.typecheck.json`; the default TypeScript configuration is not the full gate.
- Run server tests with Vitest, never raw `node --test`.
- Preserve `{ok:true,...}` / `{ok:false,error}` route envelopes and existing 401 permission ordering.
- Preserve `CompareConfidenceTier` as the verdict-tone source of truth.
- Do not raise size or style-drift baselines without the documented exception process.
- Human mobile UAT, sales IA validation, and production-like staging measurements may only be marked complete from dated external evidence.

---

### Task 1: Server-authoritative proposal approval and publication

**Files:**
- Create: `server/governance/proposal-approval.mjs`
- Create: `server/governance/proposal-approval.test.mjs`
- Modify: `server/competitor-lookup-server.mjs`
- Modify: `src/wingman2/data/approvalStore.ts`
- Modify: `src/wingman2/pages/ApprovalQueuePage.tsx`
- Modify: `src/wingman2/components/ProposalCompletionWizard.tsx`
- Test: `server/api-contract.test.mjs`

**Interfaces:**
- Produces: `decideProposalApproval({projectId, expectedRevisionHash, decision, comment}, actor)` returning `{project, auditEvent}` or a typed conflict/validation error.
- Consumes: authenticated workspace actor and guarded per-project persistence.

- [ ] Add failing tests proving anonymous and non-admin decisions return 401/403, stale hashes return 409, rejection requires a comment, retries are idempotent, and the stored actor comes from the session rather than the request body.
- [ ] Run `npx vitest run server/governance/proposal-approval.test.mjs server/api-contract.test.mjs` and confirm the new assertions fail.
- [ ] Implement `POST /api/wingman/projects/:projectId/proposal-decision` through the existing permission wrapper and guarded project commit path.
- [ ] Replace the client-side `"Manager"` mutation with the authenticated endpoint; surface conflict and authorization messages without silently mutating local approval state.
- [ ] Gate customer publication on `approvedRevisionHash === canonicalRevisionHash`; invalidate approval whenever the canonical revision changes.
- [ ] Rerun the focused tests plus `npm run check:proposal-wizard` and confirm they pass.
- [ ] Commit with `feat(governance): enforce server-owned proposal approval`.

### Task 2: Release evidence capture and operational gates

**Files:**
- Create: `docs/release-evidence/release-evidence-manifest.json`
- Create: `tools/check-release-evidence.mjs`
- Create: `tools/check-release-evidence.test.mjs`
- Modify: `package.json`
- Modify: `src/wingman2/features/design-project/analytics/journeyEvents.ts`
- Modify: `src/wingman2/pages/AnalyticsDashboardPage.tsx`

**Interfaces:**
- Produces: `checkReleaseEvidence(manifest, now)` with states `pass | partial | blocked` and machine-readable closure reasons.
- Consumes: typed journey events and dated artifact paths; it never infers a human or staging pass.

- [ ] Add failing manifest tests for missing artifact, expired evidence, absent approver, unmet p95/p99/error budgets, and a valid signed result.
- [ ] Run `npx vitest run tools/check-release-evidence.test.mjs` and confirm failure.
- [ ] Implement the checker and add `check:release-evidence`; keep external UAT/staging rows blocked until real artifacts are supplied.
- [ ] Extend typed telemetry with bounded `journey_started`, `stage_completed`, `journey_failed`, `sync_degraded`, and `publication_blocked` outcomes containing no customer narrative.
- [ ] Render completion/failure/degraded counts in Analytics using the existing telemetry endpoint, including an explicit “no production observation window” state.
- [ ] Run focused telemetry tests, `npm run check:release-evidence`, and `npm run check:api-contract`.
- [ ] Commit with `feat(operations): add release evidence and journey gates`.

### Task 3: Deepen the Project Workspace persistence seam

**Files:**
- Create: `src/wingman2/features/projects/persistence/projectCache.ts`
- Create: `src/wingman2/features/projects/persistence/projectCache.test.ts`
- Modify: `src/wingman2/features/projects/persistence/projectRepository.ts`
- Modify: `src/wingman2/features/projects/persistence/projectSyncService.ts`
- Modify: `src/wingman2/features/projects/index.ts`
- Modify: direct compatibility-facade callers reported by `tools/check-wingman-architecture-boundaries.mjs`

**Interfaces:**
- Produces: `ProjectCache` with `readIndex`, `readProject`, `writeProject`, `deleteProject`, `clearWorkspace`, and `subscribe` scoped by `{workspaceId,userId}`.
- Preserves: decoding of `wingman-project-store-v1` as a one-time legacy migration source.

- [ ] Write failing tests for workspace isolation, legacy migration, quota failure, tombstones, remote deletion, 401 recovery after re-authentication, and large-cache access without a whole-snapshot rewrite.
- [ ] Run the cache and sync suites and confirm failure.
- [ ] Implement a per-project IndexedDB adapter with an in-memory test adapter; retain localStorage only for atomic migration bookkeeping.
- [ ] Replace the five-key auth probe with the existing session endpoint/cookie contract and make `sync-disabled`, `missing-auth`, `remote-rejected`, and `quota-failed` visible states.
- [ ] Migrate route callers to `src/wingman2/features/projects/index.ts`; strengthen the architecture gate to reject new compatibility-facade imports.
- [ ] Run project sync, hydration, conflict, two-session and offline-reconnect suites plus strict typecheck.
- [ ] Commit with `refactor(projects): deepen workspace persistence`.

### Task 4: Replace misleading Data Manager controls with real governed jobs

**Files:**
- Create: `server/governance/data-jobs.mjs`
- Create: `server/governance/data-jobs.test.mjs`
- Modify: `src/wingman2/pages/DataManagerPage.tsx`
- Modify: `server/competitor-lookup-server.mjs`
- Test: `e2e/error-states-and-edge-cases.spec.ts`

**Interfaces:**
- Produces: `POST /api/governance/data-jobs/validate` and `/affected-checks`, returning `{ok, jobId, state, findings, startedAt, completedAt}`.
- Consumes: authenticated admin identity and immutable audit-event storage.

- [ ] Add failing tests proving malformed imports are rejected, non-admin requests fail, affected checks execute named commands, results are immutable, and duplicate submissions reuse an idempotency key.
- [ ] Implement validation as a non-publishing dry run over the existing canonical builders; never shell-expand user input.
- [ ] Wire Data Manager controls to job results, remove placeholder tabs from navigation, and correct the mojibake strings.
- [ ] Add a Playwright test showing pending, failed and successful jobs and proving status text cannot claim checks ran before completion.
- [ ] Run focused server/UI tests and `npm run check:sales-facing-language`.
- [ ] Commit with `feat(data): govern validation and affected checks`.

### Task 5: Extract governed decision orchestration from route modules

**Files:**
- Create: `src/wingman2/features/compare/application/runGovernedCompare.ts`
- Create: `src/wingman2/features/compare/application/runGovernedCompare.test.ts`
- Create: `src/wingman2/features/recommendations/application/buildRecommendation.ts`
- Create: `src/wingman2/features/recommendations/application/buildRecommendation.test.ts`
- Modify: `src/wingman2/features/compare/index.ts`
- Modify: `src/wingman2/pages/ComparePageNew.advanced.tsx`
- Modify: `src/wingman2/pages/RecommendationsPage.tsx`

**Interfaces:**
- Produces: `runGovernedCompare(input, dependencies): Promise<GovernedCompareResult>` and `buildRecommendation(input, dependencies): RecommendationResult`.
- Preserves: existing verdict tiers, evidence wording, candidate order, analytics identifiers and saved-history shape.

- [ ] Capture current compare and recommendation scenarios as characterization tests, including no-match, evidence-pending, wireless, matrix, AVoIP and lifecycle-suppressed cases.
- [ ] Run the tests and retain approved snapshots of current outcomes.
- [ ] Move orchestration behind the public feature interfaces without changing domain policy; route modules retain form state and rendering only.
- [ ] Add an architecture rule that route pages may not import decision-engine internals.
- [ ] Run Compare, recommendation, governed-copy, route and E2E smoke gates.
- [ ] Commit with `refactor(decisions): deepen compare and recommendation modules`.

### Task 6: Measure and rationalize overlapping workflows

**Files:**
- Create: `src/wingman2/features/navigation/workflowTelemetry.ts`
- Create: `src/wingman2/features/navigation/workflowTelemetry.test.ts`
- Modify: `src/wingman2/app/routeCatalog.ts`
- Modify: `src/wingman2/pages/NavigationHubPages.tsx`
- Modify: `docs/trusted-testing/mobile-sales-uat-2026-09.md`

**Interfaces:**
- Produces: privacy-safe `workflow_started`, `workflow_completed`, `workflow_abandoned`, and `handoff_selected` events keyed by canonical workflow id.
- Defers: route removal or redirects until dated sales validation identifies the canonical paths.

- [ ] Add failing tests for canonical workflow ids, bounded metadata and unload-safe abandonment tracking.
- [ ] Implement telemetry at navigation entry/completion seams and display canonical next actions on the overlapping hubs.
- [ ] Update the UAT script with Call Coach/Sales Helper/Call Cards and Documents/Response Pack/Proposal choice tasks and a sign-off table.
- [ ] Run navigation, route, workflow and telemetry tests.
- [ ] Record route-consolidation decisions only after the external UAT artifact is completed; do not fabricate that result.
- [ ] Commit with `feat(navigation): measure canonical workflow paths`.

### Task 7: Generate release documentation from one evidence manifest

**Files:**
- Create: `tools/generate-release-status.mjs`
- Create: `tools/generate-release-status.test.mjs`
- Modify: `docs/CURRENT_STATUS.md`
- Modify: `docs/PRE_PRODUCTION_REPORT.md`
- Modify: `docs/V1_RELEASE_EVIDENCE.md`
- Modify: `docs/DOCUMENTATION_MAP.md`
- Modify: `package.json`

**Interfaces:**
- Produces: deterministic generated status sections from `release-evidence-manifest.json` and refuses contradictory open/closed states.

- [ ] Add failing tests with the current contradiction: work marked open in PRE_PRODUCTION but complete in CURRENT_STATUS.
- [ ] Implement generation of common measured date, commit, criterion status, artifact link, owner and closure condition.
- [ ] Replace hand-maintained duplicated matrices with generated marked sections while retaining narrative context outside them.
- [ ] Add `check:release-docs` to `verify:contract` and fail on dirty generated output.
- [ ] Run documentation, readiness and full contract gates.
- [ ] Commit with `docs(release): generate status from evidence manifest`.

## Final verification

- [ ] Run `npm run typecheck`, `npm run lint`, and all focused suites above.
- [ ] Run `npm run build` to validate compilation without conflating size/style debt ratchets.
- [ ] Run `npm run verify`; classify only pre-existing ratchet failures, never raise baselines automatically.
- [ ] Run authenticated E2E smoke from the worktree server and confirm discovery, Compare, approval, sync, proposal and governance-job paths.
- [ ] Confirm `git status --short` contains only intended source, test and generated-document changes.

## Self-review

- Spec coverage: all seven audit priorities map to Tasks 1–7; external UAT and staging measurements remain explicit evidence steps rather than fabricated implementation results.
- Placeholder scan: no deferred implementation placeholders are used; external evidence is named with exact closure conditions.
- Type consistency: approval uses canonical revision hashes; persistence uses workspace/user scope; telemetry uses canonical workflow and journey identifiers; documentation consumes the single evidence manifest.
