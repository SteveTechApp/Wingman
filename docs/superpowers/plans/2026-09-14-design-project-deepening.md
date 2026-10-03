# Design Project Deepening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make one canonical Design Project decision graph the source for requirements, topology, governed recommendations, quote safety, proposal publication, Compare evidence, and journey measurement.

**Architecture:** Add a focused `features/design-project` domain whose compiler consumes a stored project and produces a versioned, deterministic decision graph. Project commands persist that graph; proposal and journey adapters consume it. Existing types, storage envelopes, routes, and exports remain compatible while callers migrate behind feature public interfaces.

**Tech Stack:** React 18, TypeScript 5.6, Vitest 4, Vite 8, browser local storage, Node server telemetry.

**Spec:** `docs/superpowers/specs/2026-09-11-wingman-modular-refactor.md`

## Global Constraints

- Preserve all user-visible behaviour, persisted project compatibility, API contracts, proposal output, and governed recommendation semantics.
- No production TypeScript/TSX file under `src/wingman2` may exceed its ratcheted line allowance.
- Route entry points consume feature public interfaces; browser storage, auth, and network access stay behind adapters.
- Existing `StoredDesignProposalRevision` schema version 1 remains readable.
- No size or style-drift baseline increase.
- Use `npm run typecheck`; run server tests with Vitest.
- Sales-facing language guards scan comments and tests as well as UI copy.

---

### Task 1: Canonical Design Project Decision Graph

**Files:**
- Create: `src/wingman2/features/design-project/model/designProjectTypes.ts`
- Create: `src/wingman2/features/design-project/compileDesignProject.ts`
- Create: `src/wingman2/features/design-project/compileDesignProject.test.ts`
- Create: `src/wingman2/features/design-project/index.ts`
- Modify: `src/wingman2/lib/designProposal.ts`

**Interfaces:**
- Consumes: `StoredProject` and the existing `compileDesignProposal(project, compiledAt)` behavior.
- Produces: `compileDesignProject(project, compiledAt): DesignProjectDecisionGraph`, `designProjectGraphHash(graph): string`, and a compatibility projection to `StoredDesignProposalRevision`.

- [ ] **Step 1: Write the failing compiler contract test**

```ts
it("compiles one deterministic graph from requirements through publication", () => {
  const graph = compileDesignProject(projectFixture, NOW);
  expect(graph.stages.map((stage) => stage.id)).toEqual(["evidence", "topology", "recommendation", "validation", "publication"]);
  expect(graph.publication.canIssue).toBe(true);
  expect(graph.contentHash).toMatch(/^dpg1-/);
});
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `npx vitest run src/wingman2/features/design-project/compileDesignProject.test.ts`

Expected: FAIL because the compiler module does not exist.

- [ ] **Step 3: Implement the immutable graph and compatibility projection**

```ts
export type DesignProjectStageId = "evidence" | "topology" | "recommendation" | "validation" | "publication";
export function compileDesignProject(project: StoredProject, compiledAt = new Date().toISOString()): DesignProjectDecisionGraph;
export function toStoredDesignProposalRevision(graph: DesignProjectDecisionGraph): StoredDesignProposalRevision;
```

- [ ] **Step 4: Delegate the legacy compiler to the new compiler**

Keep `compileDesignProposal` exported, but implement it as `toStoredDesignProposalRevision(compileDesignProject(project, compiledAt))` so existing callers and stored data remain compatible.

- [ ] **Step 5: Run compiler and proposal regression tests**

Run: `npx vitest run src/wingman2/features/design-project/compileDesignProject.test.ts src/wingman2/lib/designProposal.test.ts src/wingman2/lib/designProposal.scenarios.test.ts`

Expected: PASS.

### Task 2: Blind Requirements-to-Publication Acceptance Interface

**Files:**
- Create: `src/wingman2/features/design-project/designProjectScenarios.test.ts`
- Create: `src/wingman2/features/design-project/testing/designProjectFixture.ts`

**Interfaces:**
- Consumes: `compileDesignProject` from Task 1.
- Produces: reusable `buildBlindDesignProject(input)` fixtures that do not seed preferred candidates.

- [ ] **Step 1: Add blind fixtures for matrix, AVoIP, and incomplete discovery**

```ts
expectDecision({ requirements: ["Four sources", "Two independent displays", "70 m endpoint route"] }, {
  architecture: /matrix|HDBaseT/i,
  roles: ["source", "transport", "destination"],
  canIssue: true,
});
```

- [ ] **Step 2: Run scenarios and confirm any missing graph facts fail**

Run: `npx vitest run src/wingman2/features/design-project/designProjectScenarios.test.ts`

- [ ] **Step 3: Add only the compiler mappings needed by the failing scenarios**

Derive facts from stored requirements, discovery evidence, topology, selections, dependencies, and proposal validation; never insert a preferred SKU in the input fixture.

- [ ] **Step 4: Re-run scenarios**

Expected: PASS with architecture, quantities, dependencies, exclusions, evidence, and quote safety asserted.

### Task 3: Persist the Graph Through Project Commands

**Files:**
- Create: `src/wingman2/features/design-project/commands/designProjectCommands.ts`
- Create: `src/wingman2/features/design-project/commands/designProjectCommands.test.ts`
- Modify: `src/wingman2/features/projects/model/projectTypes.ts`
- Modify: `src/wingman2/features/projects/commands/proposalCommands.ts`
- Modify: `src/wingman2/features/projects/persistence/projectCodecs.ts`

**Interfaces:**
- Consumes: `compileDesignProject` and `ProjectCommandContext`.
- Produces: `refreshDesignProject(projectId, compiledAt?)` and optional `StoredProject.designProject`.

- [ ] **Step 1: Write a failing command test proving atomic persistence**

Assert one write updates the graph, proposal compatibility revision, timestamp, and audit entry with matching hashes.

- [ ] **Step 2: Run the command test and confirm failure**

Run: `npx vitest run src/wingman2/features/design-project/commands/designProjectCommands.test.ts`

- [ ] **Step 3: Implement the command and codec normalization**

The command reads one project, compiles one graph, projects `proposal.designRevision`, and performs one `upsertStoredProject` call.

- [ ] **Step 4: Run command and codec tests**

Run: `npx vitest run src/wingman2/features/design-project/commands/designProjectCommands.test.ts src/wingman2/features/projects/persistence/projectCodecs.test.ts`

### Task 4: Canonical Proposal Render Model

**Files:**
- Create: `src/wingman2/features/design-project/proposal/designProjectDocument.ts`
- Create: `src/wingman2/features/design-project/proposal/designProjectDocument.test.ts`
- Modify: `src/wingman2/lib/proposalExport.ts`
- Modify: `src/wingman2/lib/proposalDocxExport.ts`

**Interfaces:**
- Consumes: `DesignProjectDecisionGraph`.
- Produces: `buildDesignProjectDocument(graph): DesignProjectDocument`, the sole semantic input for screen/HTML and DOCX sections.

- [ ] **Step 1: Write a parity test over section IDs and semantic facts**

Assert customer requirement, architecture, products, assumptions, warnings, blockers, and issue status occur identically in both render projections.

- [ ] **Step 2: Run the parity test and confirm failure**

Run: `npx vitest run src/wingman2/features/design-project/proposal/designProjectDocument.test.ts`

- [ ] **Step 3: Implement the document model and adapt both exporters**

No exporter may independently derive quote-safety meaning; it may only format the document model.

- [ ] **Step 4: Run export tests**

Run: `npx vitest run src/wingman2/lib/proposalExport.test.ts src/wingman2/lib/proposalDocxExport.test.ts src/wingman2/features/design-project/proposal/designProjectDocument.test.ts`

### Task 5: Project Workspace Interface Migration

**Files:**
- Modify: `src/wingman2/features/projects/index.ts`
- Create: `src/wingman2/features/projects/useProjects.ts`
- Modify: `src/wingman2/data/projectStore.ts`
- Modify: migrated route callers under `src/wingman2/pages/`

**Interfaces:**
- Consumes: existing lifecycle/domain commands.
- Produces: public project queries, commands, and `useProjects()`; `data/projectStore.ts` remains a compatibility re-export only.

- [ ] **Step 1: Add an architecture test forbidding new route imports from `data/projectStore`**

Run: `npm run check:architecture-boundaries`; expected initial failure for migrated target routes.

- [ ] **Step 2: Export the full public feature interface**

Move hook assembly into `features/projects/useProjects.ts` and export commands through `features/projects/index.ts`.

- [ ] **Step 3: Migrate Discovery, Recommendations, Project Detail, and Proposal callers**

Change imports only; preserve runtime behavior and compatibility facade exports.

- [ ] **Step 4: Run route, project, and type gates**

Run: `npm run typecheck && npx vitest run src/__tests__/projectStore.test.ts src/__tests__/projectDetailRankingReasonRendered.test.tsx`

### Task 6: Compare Decision Adapter

**Files:**
- Create: `src/wingman2/features/compare/index.ts`
- Create: `src/wingman2/features/compare/compareDecision.ts`
- Create: `src/wingman2/features/compare/compareDecision.test.ts`
- Modify: `src/wingman2/pages/ComparePageNew.advanced.tsx`

**Interfaces:**
- Consumes: existing verdict pipeline, eligibility engine, and specification engine.
- Produces: `decideComparison(input): CompareDecision`; the page renders the result and does not recompute policy.

- [ ] **Step 1: Characterize current decisions with golden tests**

Cover exact match, near match, evidence pending, no match, and lifecycle exclusion.

- [ ] **Step 2: Implement the adapter around existing engines**

Keep scoring and evidence semantics unchanged; concentrate orchestration behind the new interface.

- [ ] **Step 3: Migrate one complete page decision path**

Delete the corresponding local orchestration only after the golden test passes.

- [ ] **Step 4: Run Compare gates**

Run: `npm run check:compare-output-scenarios && npm run check:compare-trust-layer && npx vitest run src/wingman2/features/compare/compareDecision.test.ts`

### Task 7: Journey Evidence Module

**Files:**
- Create: `src/wingman2/features/design-project/analytics/journeyEvents.ts`
- Create: `src/wingman2/features/design-project/analytics/journeyEvents.test.ts`
- Modify: `src/wingman2/lib/featureAnalytics.ts`
- Modify: `server/wingman-app-store.mjs`

**Interfaces:**
- Consumes: Design Project command outcomes.
- Produces: stable events `design_project_started`, `design_project_blocked`, `design_project_recommended`, `design_project_proposal_ready`, and `design_project_exported` with project ID, graph hash, stage, outcome, and blocker count.

- [ ] **Step 1: Write vocabulary and redaction tests**

Assert events contain no customer notes, email addresses, or proposal bodies.

- [ ] **Step 2: Implement typed event builders and server validation**

Reject unknown journey names and payloads above the existing telemetry limit.

- [ ] **Step 3: Emit events from canonical commands and export completion**

Event emission must never change a command outcome when telemetry is unavailable.

- [ ] **Step 4: Run client/server telemetry tests**

Run: `npx vitest run src/wingman2/features/design-project/analytics/journeyEvents.test.ts server/wingman-app-store.test.mjs`

### Task 8: Full Verification and Documentation

**Files:**
- Modify: `CONTEXT.md`
- Modify: `docs/design/0001-project-workspace-persistence.md`
- Modify: `docs/CURRENT_STATUS.md`

**Interfaces:**
- Consumes: all prior task interfaces.
- Produces: documented Design Project domain language, accepted persistence direction, and dated verification evidence.

- [ ] **Step 1: Document Design Project, decision graph, publication, and adapters**

Define each term from implemented behavior and record that route pages never own decision policy.

- [ ] **Step 2: Run focused and structural gates**

Run: `npm run typecheck && npm run check:architecture-boundaries && npm run build`

- [ ] **Step 3: Run the full repository gate**

Run: `npm run verify`

Expected: PASS without baseline increases.

- [ ] **Step 4: Record exact dated results**

Update status only with observed commands, counts, and commit identity.
