# Recommendation Resolution Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make recommendation blockers understandable and answerable by connecting each missing design input to the Discovery question that owns it.

**Architecture:** Keep `StoredDiscoveryBrief` and Discovery answers as the only source of requirement truth. Replace the Resolve page's broad text-matching editor—which writes generic strings into guessed room-model fields—with a governed resolver that maps each check to the actual Discovery question(s), and leave genuine site or technical validation as explicitly assigned follow-up work. Make the overview's next action reflect answerable checks and unresolved system roles.

**Tech Stack:** React, TypeScript, React Router, Vitest, existing Discovery question catalogue and recommendation evidence engine.

**Spec:** User request and screenshot of `/wingman/recommendations`; repository purpose and recommendation handoff invariants in `AGENTS.md`.

## Global Constraints

- Recommendation handoff produces a complete system proposal draft; it remains a draft until readiness items are resolved and issued.
- The saved Discovery brief is the source of truth; recommendation-only text must not pretend to resolve a requirement.
- Questions that cannot be answered from the captured context remain open and name the next person or site check needed.
- Keep the page focused on system design and next actions; pricing is outside Wingman's workflow.
- Update the durable invariant in `AGENTS.md` and its narrative in `docs/RECOMMENDATIONS.md` together.

---

### Task 1: Define resolvable checks and their Discovery owners

**Files:**
- Create: `src/wingman2/lib/recommendationResolution.ts`
- Test: `src/wingman2/lib/recommendationResolution.test.ts`
- Read: `src/wingman2/lib/recommendationEvidence.ts`, `src/wingman2/pages/discovery/discoveryQuestionCatalog.ts`

**Interfaces:**
- Produces `resolveRecommendationCheck(item: string): RecommendationCheckResolution`, where each result has a stable category, plain-language reason, one or more valid Discovery question IDs, and an explicit `answer-in-discovery` or `site-or-technical-check` route.
- A mapped Discovery question ID must exist in the governed question set. Unknown checks default to site/technical follow-up and are never marked resolved by a generic note.

- [x] Add tests for source count/connectors, display count/behaviour, signal standard, distance, USB, network, video wall and composite architecture checks, plus an unknown check.
- [x] Run the resolver tests and verify failure for unmapped required Discovery inputs.
- [x] Implement the typed mapping, preferring the narrowest owning question and listing multiple owners only when the check names several distinct inputs.
- [x] Run the resolver tests and verify every mapped question ID is present in `getVisibleDiscoveryQuestions` for its supported application/branch fixture.

### Task 2: Replace unsupported generic Resolve editors with action-led check cards

**Files:**
- Modify: `src/wingman2/pages/RecommendationsPage.tsx`
- Modify: `src/wingman2/styles/wingman-workflow-theme.css`
- Test: `src/wingman2/pages/RecommendationsPage.resolution.test.tsx`

**Interfaces:**
- Each check card displays the blocker, why it matters, and either `Answer in Discovery` links to `/wingman/discovery?edit=<questionId>` or a clear `Site / technical follow-up` owner and evidence note.
- Remove `missingDetailDefinition`, `detailAnswers`, and `saveMissingDetail`; no generic field may clear a blocker without updating its owning Discovery answer or a verified site/technical record.
- Overview's main action opens Resolve when an answerable check exists, opens Build when only product roles remain, and opens Validate when only release checks remain.

- [x] Add page tests proving a source-count check opens `sources`, a network check opens `network-path`, an audio-by-others check opens `audio-route`, and unknown/site checks have no false `Complete` action.
- [x] Add page tests for the overview's primary action across answerable checks, unresolved roles, and no open checks.
- [x] Run the new tests and confirm current generic editor behavior fails the assertions.
- [x] Implement the check queue, question links, concise progress summary, and next-action logic using the existing dark navy/teal room-workspace palette. The queue's signature is a single highlighted next answer with the remaining checks arranged beneath it by Discovery question, so the page reads like a working brief instead of a warning list.
- [x] Run focused page and resolver tests; verify keyboard labels and stage transitions.

### Task 3: Record and verify the workflow contract

**Files:**
- Create: `docs/RECOMMENDATIONS.md`
- Modify: `AGENTS.md`

- [x] Document why the Resolve page links to governed Discovery questions and how site/technical checks stay open.
- [x] Add the Recommendations workflow to the `AGENTS.md` narrative index and state the invariant beside recommendation handoff.
- [x] Run `npm run check:docs`, focused tests, typecheck, and production build.
- [x] Review the diff, sync changed files to `C:\Users\steve\wingman`, verify SHA-256 parity, and commit the change.
