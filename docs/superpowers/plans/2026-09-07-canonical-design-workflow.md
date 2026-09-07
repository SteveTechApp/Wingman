# Canonical Design Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Wingman’s requirement, recommendation, product and proposal features into one project-owned, versioned design revision that proves requirement understanding and produces consistent user-ready outputs.

**Architecture:** Add a pure `designProposal` module that compiles a stored project into a canonical revision with requirement interpretations, system-role coverage, contextual product overviews, output blockers and a deterministic content hash. Persist the revision inside the project proposal, render it in the proposal workflow, bind approval to its hash, and make DOCX/HTML/PDF output consume the same revision. Retain existing stores as adapters while making the active project authoritative for durable decisions.

**Tech Stack:** React 19, TypeScript, Vitest, existing `projectStore`, `docx`, browser export helpers.

**Spec:** `C:/Users/steve/AppData/Local/Temp/wingman-product-workflow-review-2026-09-07.html`

## Global Constraints

- Preserve existing routes and saved-project compatibility.
- Uncertain or inferred requirements must remain visibly reviewable.
- A relevant SKU must not imply a complete AV system.
- Approval applies to an exact design revision and is invalidated by material change.
- Existing exports remain available and use the canonical revision when present.
- Run `npx tsc --noEmit -p tsconfig.typecheck.json`; default `tsconfig.json` is not the real gate.

---

### Task 1: Canonical design revision

**Files:**
- Create: `src/wingman2/lib/designProposal.ts`
- Modify: `src/wingman2/data/projectStore.ts`
- Test: `src/wingman2/lib/designProposal.test.ts`

**Interfaces:**
- Consumes: `StoredProject`, its discovery evidence, selections, topology, BOM, proposal and visuals.
- Produces: `compileDesignProposal(project)`, `designProposalHash(revision)`, `StoredDesignProposalRevision`.

- [x] Write failing tests proving requirement interpretation, role coverage, contextual product explanations, blockers and deterministic hash.
- [x] Run `npx vitest run src/wingman2/lib/designProposal.test.ts` and confirm failure.
- [x] Implement normalized types, role inference, requirement trace, completeness evaluation and hash.
- [x] Add the optional revision to the persisted proposal shape without breaking older records.
- [x] Run the focused test and typecheck.

### Task 2: Project-owned commands and revision persistence

**Files:**
- Create: `src/wingman2/lib/projectWorkflow.ts`
- Modify: `src/wingman2/data/projectStore.ts`
- Test: `src/wingman2/lib/projectWorkflow.test.ts`

**Interfaces:**
- Consumes: project ID and canonical compiler.
- Produces: `refreshProjectDesignRevision(projectId)`, `approveProjectDesignRevision(projectId, reviewer)`, `submitProjectDesignRevision(projectId, submitter)`.

- [x] Write failing tests for revision persistence and approval invalidation after requirement/product changes.
- [x] Implement commands through `updateStoredProject`; do not add a second storage authority.
- [x] Make proposal save refresh the canonical revision.
- [x] Run focused tests and typecheck.

### Task 3: Requirement-understanding and completeness UI

**Files:**
- Create: `src/wingman2/components/DesignProposalReview.tsx`
- Modify: `src/wingman2/components/ProposalCompletionWizard.tsx`
- Modify: `src/wingman2/styles/wingman-workflow-theme.css`
- Test: `src/wingman2/components/DesignProposalReview.test.tsx`

**Interfaces:**
- Consumes: `StoredDesignProposalRevision`.
- Produces: accessible sections for customer statement, Wingman interpretation, design consequence, evidence status, role coverage, product context and blockers.

- [x] Write a rendered test for the full requirement-to-product trace and missing-role warning.
- [x] Implement the review UI and place it in the wizard’s review/export step.
- [x] Ensure responsive layout and visible keyboard focus.
- [x] Run rendered test and typecheck.

### Task 4: Bind approval and exports to one revision

**Files:**
- Modify: `src/wingman2/lib/proposalDocxExport.ts`
- Modify: `src/wingman2/lib/proposalExport.ts`
- Modify: `src/wingman2/components/ProposalCompletionWizard.tsx`
- Modify: `tools/check-proposal-wizard.mjs`
- Test: `src/wingman2/lib/proposalDocxExport.test.ts`
- Test: `src/wingman2/lib/proposalExport.test.ts`

**Interfaces:**
- Consumes: persisted canonical design revision.
- Produces: matching requirement understanding, system completeness and contextual product sections in every customer output.

- [x] Add failing output tests for canonical sections and design revision identifier.
- [x] Render canonical sections in DOCX and shared HTML/PDF markup.
- [x] Block customer output when the revision has blocking gaps or an approval hash is stale.
- [x] Update the outdated proposal contract markers to assert current behaviour.
- [x] Run proposal tests and `npm run check:proposal-wizard`.

### Task 5: Scenario acceptance harness

**Files:**
- Create: `src/wingman2/lib/designProposal.scenarios.test.ts`

**Interfaces:**
- Consumes: `compileDesignProposal` and representative stored projects.
- Produces: acceptance coverage for meeting room, classroom, hospitality routing, NetworkHD, video wall and competitor replacement.

- [x] Define six complete scenario fixtures with explicit expected requirements, roles, products and blockers.
- [x] Assert complete scenarios can issue and incomplete scenarios identify the exact missing roles.
- [x] Assert product explanations name requirement and design role.
- [x] Run the scenario suite.

### Task 6: Final integration verification

**Files:**
- Modify: `docs/superpowers/plans/2026-09-07-canonical-design-workflow.md`

**Interfaces:**
- Consumes: all prior tasks.
- Produces: verified implementation and checked task list.

- [x] Run focused design/proposal/workflow tests.
- [x] Run `npm run typecheck`, `npm run check:workflow`, `npm run check:proposal-wizard`, and `npm run build`.
- [x] Mark completed checklist items and record any remaining warnings.

Verification note: all tests and functional gates pass. The unchanged size ratchet requires an explicit reviewed exception for the combined training portal and design-workflow bundle growth; its limits were not raised automatically.
