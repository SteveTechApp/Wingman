# Product Finder Implementation Plan

> **For agentic workers:** Implementation follows this plan inline in the current session.

**Goal:** Give focused and expert Discovery users a direct, plain-language path to a single WyreStorm product suggestion, with an option to continue into the full Expert room design.

**Architecture:** Add a standalone Product Finder route that uses the existing product-intelligence summary and the governed product selector for eligible product candidates. Two lightweight questions collect application and product job; a small ranking layer orders candidates from their product-intelligence evidence. Add direct links from both Discovery depths and the shared product workspace menu.

**Tech Stack:** React, TypeScript, React Router, existing Wingman product-intelligence and selector modules, Vitest conventions (no test execution requested).

**Spec:** User request in this task; repository invariants in `AGENTS.md`.

## Global Constraints

- A single-product lookup must not require a completed room brief.
- Keep question wording in customer and rep language; avoid requiring technical vocabulary.
- Use eligible WyreStorm records and show the reason and follow-up checks with a suggested product.
- Keep the full-room path available through Expert Discovery.
- Keep existing product and room workflows intact.

---

### Task 1: Add the Product Finder route and product workspace entry

**Files:** `src/wingman2/app/route-manifest.json`, `src/wingman2/app/routeCatalog.ts`, `src/wingman2/app/routes.tsx`, `src/wingman2/components/ProductWorkspaceChrome.tsx`

- [ ] Register `/wingman/product-finder`, route it to `ProductFinderPage`, and make the legacy `/wingman/finder` address open it.
- [ ] Place Product Finder in the shared Product tools navigation and map it to the Products primary section.

### Task 2: Build the plain-language wizard and one-product result

**Files:** Create `src/wingman2/pages/ProductFinderPage.tsx`; create `src/wingman2/pages/productFinder/productFinderRanking.ts`.

- [ ] Ask application context and the customer outcome using plain-language choices.
- [ ] Load the shared product-intelligence summary and run candidates through the existing Finder selector eligibility rules.
- [ ] Rank eligible products using the selected application and outcome evidence; show one lead product, why it fits, what to confirm, product-card link, and alternatives.
- [ ] Provide an Expert Discovery handoff.

### Task 3: Surface direct entry points from Discovery

**Files:** `src/wingman2/pages/OpportunitiesPage.tsx`, `src/wingman2/pages/discovery/DiscoveryExpertBuilder.tsx` (only if its local section menu is the right place).

- [ ] Add a visible Product Finder action to the focused room-brief starting points and Expert room-design starting points.

---
