# Wingman Simplification Implementation Plan

> **For agentic workers:** Implement these tasks in order in this session. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Wingman's main navigation follow the six task destinations in the product audit while retaining deep links to existing capabilities.

**Architecture:** Reuse existing route pages as modes of the task destinations. Keep legacy routes as redirects and preserve project query parameters. Hide the global interface mode selector, simplify Home actions, and make local activity analytics identifiable by route.

**Tech Stack:** React, React Router, TypeScript, Vite, Vitest.

**Spec:** `docs/WINGMAN_PRODUCT_SIMPLIFICATION_AUDIT.md`

## Global Constraints

- Preserve project data and old links through redirects.
- Keep evidence and quote safety controls in the working pages.
- Do not edit the ongoing Discovery or Product Pitch worktree changes.
- Use `npm run typecheck` and focused checks before completion.

---

### Task 1: Task based route shell

**Files:** `src/wingman2/app/routeCatalog.ts`, `src/wingman2/app/route-manifest.json`, `src/wingman2/app/routes.tsx`, `src/wingman2/layout/AppShell.tsx`.

**Interfaces:** Existing route keys remain stable; primary navigation changes to Home, Opportunities, Products, Compare, Responses, Projects.

- [x] Change navigation keys and labels.
- [x] Make Opportunities and Responses usable routes with old URL redirects.
- [x] Remove the global interface mode selector from the shell.
- [x] Verify route and navigation checks.

### Task 2: Product and response entry points

**Files:** `src/wingman2/pages/NavigationHubPages.tsx`, `src/wingman2/pages/DashboardPage.tsx`.

**Interfaces:** `/wingman/products` opens the catalogue view; `/wingman/responses` opens a response workspace; existing specialist pages remain reachable as modes or contextual links.

- [x] Replace the Products menu with a working product view and mode links.
- [x] Replace the Documents choice hub in primary navigation with direct response actions.
- [x] Make Home start from opportunity, decode, compare, response, or project.
- [x] Verify main page content in a browser.

### Task 3: Adoption diagnostics

**Files:** `src/wingman2/app/WingmanApp.tsx`, analytics files as needed.

**Interfaces:** Record each canonical route as its feature name; continue to retain local storage limits and avoid presenting it as shared usage.

- [x] Correct route event names.
- [x] Label admin analytics as local activity where shown.
- [x] Verify the analytics calculation with a focused test.

### Task 4: Final checks

- [x] Run strict typecheck, focused navigation and route checks, and build.
- [x] Inspect the six destinations in the live app.
- [x] Record any deferred architecture work and risks in the audit document.

### Task 5: Put saved decisions in the project record

**Files:** `src/wingman2/pages/ProjectDetailPage.tsx`, `src/wingman2/pages/ComparePageNew.advanced.tsx`.

**Interfaces:** Project Detail displays every saved comparison with evidence and a link to rerun against current product data. Compare keeps the save action but points to project history.

- [x] Render saved comparison snapshots in the Capture stage.
- [x] Remove comparison history management from the live Compare result after confirming Project Detail has the complete record.
- [x] Preserve project context when rerunning a saved comparison.
- [x] Verify project and Compare workflow tests.

### Task 6: Legacy entry points

**Files:** `src/wingman2/app/routes.tsx`, `src/wingman2/pages/NavigationHubPages.tsx`, `src/wingman2/features/navigation/featureJourney.ts`.

**Interfaces:** Old hub URLs redirect to the active task route; specialist URLs continue to open their data-backed views.

- [x] Redirect Documents and Response Pack aliases to Responses.
- [x] Remove related-feature links that send users into retired response hubs or back to the same task.
- [x] Verify route contracts and direct links.
