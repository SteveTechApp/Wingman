# Room Discovery Workflow Redesign Implementation Plan

> **For agentic workers:** use inline execution in the current authorized task. Tasks use checkbox syntax to track progress.

**Goal:** Deliver distinct Focused and Expert room-building workflows over the same editable project data and preserve custom-template equipment during edits.

**Architecture:** Keep `DiscoveryAnswers`, `DiscoveryNotes`, and `ProjectTopology` as shared state. Add structured site/construction capture to that state, present Focused as a staged plain-language flow, and present Expert as grouped technical sections with section navigation. Carry the existing template topology through the session handoff and prove it with workflow tests.

**Tech Stack:** React, TypeScript, React Router, existing Wingman discovery question engine and project topology, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/room-discovery-workflow-redesign.md`

## Global Constraints

- Preserve the existing conditional question engine and project/topology persistence contracts.
- Keep unknown and assumed data saveable; do not add completion blockers for missing third-party SKUs.
- Preserve explicit WyreStorm / competitor / complementary product identity.
- Keep source changes in the current worktree; synchronize edited files to `C:/Users/steve/wingman` after verification, then compare bytes.
- Use `npx tsc --noEmit -p tsconfig.typecheck.json` for strict type checking.

---

### Task 1: Protect custom-template room data

**Files:**
- Modify `src/wingman2/pages/TemplatesPage.tsx`
- Modify `src/wingman2/pages/DiscoveryPage.tsx`
- Test `src/wingman2/lib/discoveryTemplateHandoff.test.ts` or a focused page/workflow test

**Deliverable:** Template edit handoff includes topology and saving keeps existing devices, locations, and connections.

- [x] Add a test fixture with a third-party product and a non-default connection and assert the handoff preserves them.
- [x] Pass the selected custom template topology in `manageCustom`.
- [x] Ensure absent handoff topology is generated, while supplied topology is normalized and retained.
- [x] Run the focused test.

### Task 2: Add structured room and site conditions

**Files:**
- Modify `src/wingman2/pages/discovery/DiscoveryRoomWizard.tsx`
- Add `src/wingman2/pages/discovery/DiscoverySiteConditions.tsx`
- Modify `src/wingman2/pages/discovery/DiscoveryQuestionSection.tsx` or the new Expert builder
- Add focused tests for unknown and persisted site fields

**Deliverable:** Capture room dimensions/occupancy, wall/ceiling construction, mounting/fixing confidence, cable route/containment, lighting/acoustic context, rack/power/access, and survey unknowns as structured fields.

- [x] Add labelled inputs and plain examples, retaining values in shared discovery answers.
- [x] Include a “Not known yet” path that records uncertainty without inventing values.
- [x] Render the same values in Focused and Expert.
- [x] Run focused component tests.

### Task 3: Build the Focused room walkthrough

**Files:**
- Modify `src/wingman2/pages/discovery/DiscoveryRoomWizard.tsx`
- Modify `src/wingman2/pages/discovery/operationalDiscovery.ts`
- Modify `src/wingman2/pages/DiscoveryPage.tsx`
- Modify/add `DiscoveryRoomWizard` tests

**Deliverable:** A clear staged journey through room use, site, sources, outputs, signal behaviour, audio/conferencing, operation, equipment/locations, and review.

- [x] Define visible stage groups from the currently applicable conditional questions.
- [x] Use customer language for prompts and preserve engineering labels/details in expandable context.
- [x] Add a stage rail, completion state, back/continue, and persistent “room so far” summary.
- [x] Keep “not sure” available and make generated design assumptions explicit.
- [x] Test stage progression, unknown answers, and answer retention.

### Task 4: Build the Expert section workspace

**Files:**
- Add `src/wingman2/pages/discovery/DiscoveryExpertBuilder.tsx`
- Modify `src/wingman2/pages/DiscoveryPage.tsx`
- Add `DiscoveryExpertBuilder` tests

**Deliverable:** Section navigation and grouped detailed questions, with editable topology/equipment and visible validation/unknowns.

- [x] Group applicable questions by stable logical sections.
- [x] Render question controls using the shared `DiscoveryQuestion` options and answer selection semantics.
- [x] Add section completion counts and a route/room summary.
- [x] Remove or rename the conflicting Essential/Detailed mode switch from this view while keeping existing project integrity behavior intact.
- [x] Test section navigation and shared-state updates.

### Task 5: Validate the room-building journeys

**Files:**
- Modify `tools/e2e-smoke-check.mjs`
- Add/modify discovery and template workflow tests

**Deliverable:** Smoke test verifies meaningful Focused and Expert behavior and template topology preservation.

- [x] Extend the smoke to switch views mid-design and confirm answers remain.
- [x] Verify Expert sections and site fields render and can be edited.
- [x] Verify opening a template edit retains equipment and connections, and that BOM merging preserves researched rows.
- [x] Run focused Vitest tests, strict TypeScript check, and E2E smoke if the environment supports the configured browsers.
