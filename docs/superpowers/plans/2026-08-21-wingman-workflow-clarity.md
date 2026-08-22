# Wingman Workflow Clarity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every Wingman route visually clear, appropriately dense, guidance-led and connected to a useful next action without dead ends.

**Architecture:** Define a route-level UX contract and enforce it with static and rendered checks. Repair shared workspace patterns before page-specific exceptions, then verify representative empty, populated, error and mobile states in the browser.

**Tech Stack:** React 19, TypeScript, React Router, Vitest, Testing Library, CSS, Vite, browser-client local UI verification.

**Spec:** User request in the 2026-08-21 Codex task; route inventory in `src/wingman2/app/route-manifest.json`.

## Global Constraints

- Preserve existing functional workflows and governed-data safety rules.
- Every routed task page needs one clear primary action or a specific explanation of the next required input.
- Every empty/error state must state what happened and the next useful action.
- Dense technical detail must be progressive disclosure unless required for the immediate decision.
- All controls require accessible names, visible focus, keyboard operation and responsive layouts without horizontal overflow.
- Use shared visual primitives before adding route-specific CSS; do not increase style-drift ratchets.
- Retain the current Wingman dark technical visual identity and cyan/aqua interaction language.

---

### Task 1: Complete the Proposal Visuals guided workflow

**Files:**
- Modify: `src/wingman2/pages/ProposalVisualsPage.tsx`
- Modify: `src/wingman2/styles/wingman-workflow-theme.css`
- Test: `src/__tests__/visualStudioSeedAndCanvasGuard.test.ts`

**Interfaces:**
- Consumes: `useProjectStore()`, `ProposalVisualKind`, `ProposalVisualPurpose`.
- Produces: a three-step visual creation flow using `.wm-pv-step`, `.wm-pv-mode`, `.wm-pv-brief-grid` and `.wm-pv-empty`.

- [ ] **Step 1: Preserve the route contract test**

Keep the accessible generate action named `Generate visual` while allowing the visible label to identify the selected output.

- [ ] **Step 2: Implement the workflow hierarchy**

Render numbered steps for visual selection, source/purpose confirmation and generation. Replace the generic empty state with a preview explaining the chosen deliverable and governance benefits.

- [ ] **Step 3: Add responsive and focus-safe styling**

Use a three-column mode selector and brief grid above 900px, a single-column flow below 900px, and full-width mobile actions below 560px.

- [ ] **Step 4: Verify**

Run:

```bash
npx vitest run src/__tests__/visualStudioSeedAndCanvasGuard.test.ts
npx tsc --noEmit -p tsconfig.typecheck.json
```

Expected: both commands pass; browser inspection shows steps `1`, `2`, `3`, no horizontal overflow, and a visible next action.

### Task 2: Add a route-level workflow contract audit

**Files:**
- Create: `tools/audit-wingman-workflow-clarity.mjs`
- Create: `src/__tests__/routeWorkflowClarity.test.tsx`
- Modify: `package.json`
- Create: `reports/wingman-workflow-clarity.md`

**Interfaces:**
- Consumes: `src/wingman2/app/route-manifest.json` and page source files.
- Produces: `npm run audit:workflow-clarity` and a report with route, page file, primary action, guidance state, empty/error state and onward destination.

- [ ] **Step 1: Write the failing route inventory test**

Assert each manifest entry has a page file, summary, route label and either a recognised action element (`button`, `Link`, form submit) or hub navigation cards.

- [ ] **Step 2: Implement the audit script**

Read the manifest, inspect each referenced page file, and emit findings for missing headings, missing action language, generic errors, unlabeled icon buttons, unbounded content regions and absent onward navigation.

- [ ] **Step 3: Add the package command**

Add:

```json
"audit:workflow-clarity": "node tools/audit-wingman-workflow-clarity.mjs"
```

- [ ] **Step 4: Run the audit**

Run `npm run audit:workflow-clarity` and confirm the report covers all entries in `route-manifest.json`.

### Task 3: Repair shared workspace hierarchy and guidance

**Files:**
- Modify: `src/wingman2/components/ProductWorkspaceChrome.tsx`
- Modify: `src/wingman2/components/PageHero.tsx`
- Modify: `src/wingman2/styles/wingman-reference-global.css`
- Test: `src/wingman2/components/ProductWorkspaceChrome.test.tsx`
- Create: `src/__tests__/sharedWorkflowGuidance.test.tsx`

**Interfaces:**
- Consumes: route metadata and current project context.
- Produces: shared `wm-workflow-next-action`, `wm-workflow-empty-state` and `wm-workflow-guidance` patterns.

- [ ] **Step 1: Add failing shared-component tests**

Assert shared headers expose one page title, concise supporting text, active-project context when required and a named onward action.

- [ ] **Step 2: Implement shared patterns**

Add optional props for `nextAction`, `guidance`, `emptyStateAction` and project context without changing existing default rendering.

- [ ] **Step 3: Add responsive shared styling**

Keep primary actions adjacent to their explanation, collapse metadata before core controls, and preserve 44px minimum touch targets.

- [ ] **Step 4: Verify shared consumers**

Run the shared component tests and `npx tsc --noEmit -p tsconfig.typecheck.json`.

### Task 4: Repair core journey pages

**Files:**
- Modify: `src/wingman2/pages/DashboardPage.tsx`
- Modify: `src/wingman2/pages/DiscoveryPage.tsx`
- Modify: `src/wingman2/pages/RecommendationsPage.tsx`
- Modify: `src/wingman2/pages/ProjectsPage.tsx`
- Modify: `src/wingman2/pages/ProjectDetailPage.tsx`
- Modify: `src/wingman2/pages/ComparePageNew.tsx`
- Test: corresponding existing rendered workflow tests under `src/__tests__/`.

**Interfaces:**
- Consumes: the shared guidance patterns from Task 3.
- Produces: connected journeys `Home → Discovery → Recommendations → Project → Response Pack` and `Compare → Product Positioning → Project`.

- [ ] **Step 1: Add route-specific assertions**

For each populated and empty state, assert one dominant action and one valid onward route. Assert secondary tools do not precede the primary action in DOM order.

- [ ] **Step 2: Reduce simultaneous information**

Move evidence logs, raw technical fields and administrative controls into named disclosure panels. Keep decision inputs, verdict and next action visible.

- [ ] **Step 3: Repair dead ends**

Provide contextual links to create/select a project, continue discovery, review recommendations, position a product or generate response material.

- [ ] **Step 4: Verify core journeys**

Run the relevant Vitest files and browser-check populated and empty states at 1440×900 and 390×844.

### Task 5: Repair secondary tools and content-heavy pages

**Files:**
- Modify relevant files from `src/wingman2/pages/NavigationHubPages.tsx`, `TemplatesPage.tsx`, `TemplateReviewPage.tsx`, `CatalogBrowserPage.tsx`, `ProductFamilyPage.tsx`, `ProductPitchPage.tsx`, `ProductCallCardsPage.tsx`, `IngestPage.tsx`, `ProposalPage.tsx`, `ProposalVisualsPage.tsx`, `VideowallBuilderPage.tsx`, `GlossaryPage.tsx`, `SupportPage.tsx`, `ProfilePage.tsx` and `DataManagerPage.tsx`.
- Test: existing page-specific rendered tests plus `src/__tests__/routeWorkflowClarity.test.tsx`.

**Interfaces:**
- Consumes: audit findings and shared patterns.
- Produces: every remaining route passing the route workflow contract.

- [ ] **Step 1: Fix highest-severity findings**

Prioritise pages with no primary action, unlabeled controls, missing empty-state recovery, overflow, or more than one full viewport of content before the first decision.

- [ ] **Step 2: Fix density findings**

Group filters, use concise summaries, cap initial list lengths, virtualise lists above 50 rows and move detailed evidence into disclosures.

- [ ] **Step 3: Fix guidance findings**

Add concise instructions where domain knowledge is required and explain why disabled actions are unavailable.

- [ ] **Step 4: Re-run the audit**

Run `npm run audit:workflow-clarity`; expected result is zero critical findings and documented advisory findings only.

### Task 6: Final accessibility, responsive and quality verification

**Files:**
- Modify: only files required by failures found during verification.
- Update: `reports/wingman-workflow-clarity.md`.

**Interfaces:**
- Consumes: all repaired routes.
- Produces: a verified release candidate.

- [ ] **Step 1: Run code and contract gates**

```bash
npx tsc --noEmit -p tsconfig.typecheck.json
npm run verify:fast
npm run verify:contract
npm run check:style-drift-baseline
npm run build
```

- [ ] **Step 2: Run browser route sampling**

Inspect every manifest route for a visible H1, primary action or next-step guidance, no horizontal overflow and no empty content canvas. Test all core journey pages at desktop and mobile widths.

- [ ] **Step 3: Review focus and reduced motion**

Keyboard-tab through forms, tabs, disclosures and primary actions; confirm visible focus and that non-essential motion is disabled under `prefers-reduced-motion`.

- [ ] **Step 4: Publish the final audit report**

Record resolved critical issues, remaining advisory issues, route coverage and exact verification commands in `reports/wingman-workflow-clarity.md`.

