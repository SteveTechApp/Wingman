# Feature Journey Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Interlink Wingman features through one relationship module and migrate duplicate routes behind clear owner interfaces with compatibility redirects.

**Architecture:** A pure Feature Journey module maps route keys to contextual next actions. AppShell renders one reusable action strip, while route ownership changes use redirects and mode parameters so existing implementations remain available during consolidation.

**Tech Stack:** React 18, TypeScript, React Router, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-18-feature-journey-consolidation.md`

## Global Constraints

- Keep existing deep links working through redirects.
- Do not raise architecture or size ratchets.
- Use `routeCatalogByKey`; do not introduce duplicated literal route paths.
- Preserve active Design Project and SKU context when safe.

---

### Task 1: Feature Journey relationship module

**Files:**
- Create: `src/wingman2/features/navigation/featureJourney.ts`
- Test: `src/wingman2/features/navigation/featureJourney.test.ts`

**Interfaces:**
- Produces: `FeatureJourneyContext`, `FeatureJourneyAction`, `featureJourneyActions(routeKey, context)`.

- [ ] Write failing tests that require actions for every eligible customer route, forbid self-links, and verify Product Workspace offers Call Coach, Discovery, and Compare.
- [ ] Run `npx vitest run src/wingman2/features/navigation/featureJourney.test.ts` and verify failure.
- [ ] Implement a typed route relationship registry and context-aware URL construction.
- [ ] Run the focused test and verify pass.

### Task 2: Reusable contextual action strip

**Files:**
- Create: `src/wingman2/components/FeatureJourneyStrip.tsx`
- Create: `src/wingman2/components/FeatureJourneyStrip.test.tsx`
- Modify: `src/wingman2/layout/AppShell.tsx`
- Modify: `src/wingman2/styles/wingman-workflow-theme.css`

**Interfaces:**
- Consumes: `featureJourneyActions`, current route, current project.
- Produces: visible “Useful next tools” links and telemetry-safe route handoffs.

- [ ] Write failing rendering tests for action labels, links, and hidden empty state.
- [ ] Implement the strip and mount it after routed page content in AppShell.
- [ ] Style it as a compact secondary workflow aid.
- [ ] Run focused tests.

### Task 3: Consolidate Call Coach ownership

**Files:**
- Modify: `src/wingman2/pages/NavigationHubPages.tsx`
- Modify: `src/wingman2/app/routes.tsx`
- Test: `src/wingman2/app/routeConsolidation.test.tsx`

**Interfaces:**
- Call Coach renders `SalesHelperPage`.
- Legacy `sales-helper` and `call-cards` paths redirect to `call-coach`.

- [ ] Write route tests for the owner page and redirects.
- [ ] Replace the shallow Call Coach hub with the conversation-intent implementation.
- [ ] Add compatibility redirects before generated route entries.
- [ ] Run route tests.

### Task 4: Consolidate competitor and portfolio routes

**Files:**
- Modify: `src/wingman2/pages/ComparePageNew.tsx`
- Modify: `src/wingman2/pages/ProjectsPage.tsx`
- Modify: `src/wingman2/pages/DataManagerPage.tsx`
- Modify: `src/wingman2/app/routes.tsx`
- Test: `src/wingman2/app/routeConsolidation.test.tsx`

**Interfaces:**
- Compare supports `?mode=battle-cards`.
- Projects supports `?view=quote-safety`.
- Data Manager supports `?view=analytics`.

- [ ] Add failing tests for Battle Cards, Quote Safety, and Analytics owner URLs.
- [ ] Render the existing implementations behind owner-route modes.
- [ ] Redirect the three legacy routes.
- [ ] Run focused tests.

### Task 5: Consolidate documents and product entry routes

**Files:**
- Modify: `src/wingman2/pages/NavigationHubPages.tsx`
- Modify: `src/wingman2/app/routes.tsx`
- Modify: `src/wingman2/components/ProductWorkspaceChrome.tsx`
- Test: `src/wingman2/app/routeConsolidation.test.tsx`

**Interfaces:**
- Response Pack redirects to `documents?mode=publication`.
- Product sub-features remain available, but their shared navigation identifies Products as the owner and produces owner-mode links.
- Support redirects to Call Coach.

- [ ] Add failing redirect and product-owner navigation tests.
- [ ] Add publication mode to Documents and owner-aware Product Workspace navigation.
- [ ] Add Response Pack and Support compatibility redirects.
- [ ] Run focused tests.

### Task 6: Verification

**Files:**
- Modify only defects caused by Tasks 1–5.

**Interfaces:**
- Consumes the completed consolidation.
- Produces a verified branch.

- [ ] Run `npx tsc --noEmit -p tsconfig.typecheck.json`.
- [ ] Run `npm run verify:fast`.
- [ ] Run `npm run check:architecture-boundaries`.
- [ ] Run `git diff --check` and inspect the final diff.

## Self-review

- Spec coverage: central relationships, contextual links, coach/product/competitor/document/portfolio consolidation, compatibility redirects, and tests map to Tasks 1–5.
- Placeholder scan: no deferred implementation instructions remain.
- Type consistency: `featureJourneyActions`, route modes, and owner URLs are named consistently across tasks.
