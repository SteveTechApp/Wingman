# Discovery to AV Proposal Implementation Plan

> **For agentic workers:** Follow this plan task by task. Preserve the existing project store and proposal export contracts.

**Goal:** A completed Discovery session, in either capture depth, produces a project-backed AV proposal draft with the decided room, system roles and products, assumptions, open checks, and proposal context carried forward.

**Architecture:** Compile a shared room decision record when the Discovery brief is built, keep it inside the existing `StoredDiscoveryBrief`, and let the recommendation workflow materialize its resolved roles into the active project. The Handoff stage will offer a direct action into the existing Proposal Completion Wizard, which already owns proposal readiness, review, drawing and export. The wizard will seed customer-facing content from the room decision and system design while retaining unknowns as review items.

**Tech Stack:** React, TypeScript, existing `StoredProject` local/workspace store, `roomBrief.ts`, recommendation system slots, `ProposalCompletionWizard`, HTML/PDF/DOCX proposal exports.

**Spec:** `AGENTS.md` Purpose and scope; `docs/PURPOSE.md`; `docs/DISCOVERY.md`; `docs/PROPOSAL_OUTPUT.md`.

## Global Constraints

- Both Discovery depths write one room record; moving between them continues the same room.
- Unknown information remains an assumption, check, warning or blocker; never fabricate a confirmed AV detail.
- Product recommendations remain role-based, quantity-aware and governed by current catalogue evidence.
- Proposal exports retain existing readiness blockers, validation gates and customer-copy rules.
- Keep changed files byte-identical between this worktree and `C:\Users\steve\wingman`.
- Do not run or add tests unless the user asks; use code inspection and `git diff --check` for this task.

---

### Task 1: Persist the shared room decision

**Files:**
- Modify: `src/wingman2/pages/discovery/discoveryBriefBuilder.ts`
- Modify: `src/wingman2/features/projects/model/projectTypes.ts`
- Modify: `src/wingman2/features/projects/persistence/projectCodecs.ts`
- Modify: `src/wingman2/lib/designProposal.ts`
- Modify: `AGENTS.md`, `docs/PURPOSE.md`, `docs/DISCOVERY.md`

**Interface:** Add optional typed `roomDecision` to `StoredDiscoveryBrief`, using the existing `RoomDecision` shape. Compile it from shared Discovery answers in `compileDiscoveryBrief`; preserve it in codecs; include its requirements, assumptions, on-site checks and changes-if in proposal interpretation and release blockers.

- [x] Map the market, purpose, occupancy and answered split questions to `RoomBriefAnswers`; omit the decision when required setup facts are absent.
- [x] Store the decision on every brief produced by the common `compileDiscoveryBrief` boundary, which both focused and expert Discovery use.
- [x] Ensure decision requirements join the design revision trace and that unconfirmed decision checks remain visible in blockers or warnings.
- [x] Replace the AGENTS gap statement with the implemented shared-record invariant and update its named Discovery narrative.

### Task 2: Hand the generated system into proposal drafting

**Files:**
- Modify: `src/wingman2/pages/RecommendationsPage.tsx`
- Modify: `src/wingman2/pages/recommendations/RecommendationHandoffStage.tsx`
- Modify: `src/wingman2/components/ProposalCompletionWizard.tsx`
- Modify: `src/wingman2/lib/proposalCompletionModel.ts` (only if the existing reader cannot consume `roomDecision`)

**Interface:** Add a Handoff action that adds resolved recommended system roles to the active project and navigates to `routeCatalogByKey.proposal.path`. Seed proposal defaults with the stored room decision, system architecture, selected products, assumptions and open checks.

- [x] Keep the existing add-system operation idempotent by role/SKU and preserve rep-selected alternatives.
- [x] Do not route to proposal if there is no project or no role can be added; show the blocking reason in the workflow.
- [x] Carry the system architecture reason and role evidence into proposal defaults and the existing design revision.
- [x] Leave unresolved external supply, missing products, site checks and quote blockers explicit in the proposal readiness review.

### Task 3: Make the proposal handoff explicit in the UI and docs

**Files:**
- Modify: `src/wingman2/pages/recommendations/RecommendationHandoffStage.tsx`
- Modify: `src/wingman2/styles/wingman-workflow-theme.css` (if the Handoff action needs layout adjustment)
- Modify: `docs/PROPOSAL_OUTPUT.md`
- Modify: `AGENTS.md`

- [x] Present the complete path as Discovery → proposed system → proposal draft, with a button whose action matches its label.
- [x] Explain that the resulting document is a draft until all product, topology and site checks pass.
- [x] Record where the shared decision and generated system are read so future changes cannot create a separate, incomplete handoff.

### Task 4: Review the complete change

- [x] Inspect the modified code paths and review the complete diff for accidental changes, including the large-room single-screen classification found in the browser workflow.
- [x] Run `git diff --check`.
- [x] Sync changed files to the main checkout and compare hashes.
