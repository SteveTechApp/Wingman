# Product Filter Evidence Implementation Plan

> **For agentic workers:** Use the assigned parallel implementation tasks and review the shared evidence contract before merging.

**Goal:** Make product facets reflect verified product capabilities, remove polluted matches, restore products whose governed technical profiles prove support, and prevent category/role contamination from broad metadata.

**Architecture:** Keep facet matching centralized in `catalogIntelligence.ts`; enrich the generated product index with compact, structured technical evidence derived from canonical `technicalProfile` data. Prefer structured classification and technical evidence over summaries, generated feature tags, and applications. Keep search and facet intersection semantics unchanged.

**Tech Stack:** TypeScript, generated JSON catalogue, Vitest, existing product-index generator.

**Spec:** User request: improve product-filter accuracy and data, with KVM false positives and missing obvious options as the motivating case. Repository invariant: Catalogue and Call Cards separate product area, role and capability; structured classification and transport evidence take precedence over keyword inference.

## Global Constraints

- Generated `public/product-intelligence-summary.json` must be regenerated from `data/wingman-canonical-product-store.json` using the repository generator.
- Catalogue and Call Cards share the same filter engine; preserve that shared behavior.
- Keep changes and verification within `.freebuff/worktrees/product-finder`, then copy changed files to `C:/Users/steve/wingman` and confirm byte equality.
- Do not treat generic application/use-case metadata or taxonomy boilerplate as proof of a hardware capability.

### Task 1: Canonical technical evidence

**Files:** `tools/generate-product-intelligence-index.mjs`; generated `public/product-intelligence-summary.json`; tests for product index generation.

- Add a compact `technicalEvidence` record derived only from governed `technicalProfile` signals: USB presence and exact versions, explicit keyboard/mouse/touchscreen KVM pass-through evidence, HDMI and HDBaseT exact versions, and Ethernet link speeds.
- Preserve source evidence snippets or source field names so each positive is traceable.
- Regenerate the summary index and add tests for KVM-positive Synergy/extender examples and polluted metadata negatives.

### Task 2: Evidence-based facets

**Files:** `src/features/catalog/catalogIntelligence.ts`; `src/wingman2/pages/catalogFiltering.test.ts`.

- Consume `technicalEvidence` and structured classification for facets before considering product identity or explicit product-level features.
- Do not infer KVM from `applications`, broad taxonomy tags, or USB alone; require explicit KVM or USB HID/peripheral switching evidence.
- Do not infer exact protocol versions from generated generic tags or incidental summaries when structured evidence exists.
- Correct the role and family false positives identified in the audit without breaking intentional overlaps.
- Add regression assertions for false positives, false negatives, exact version collisions, and unaffected positive matches.

### Task 3: Verify the user-facing surfaces

**Files:** existing Catalogue and Call Cards filter tests only unless a concrete gap requires a focused fix.

- Run targeted catalogue filter tests and the relevant index/data integrity checks.
- Confirm Catalogue and Call Cards use the corrected shared facet output and no pagination/search behavior regresses.
- Report any remaining uncertain classifications as named SKUs rather than inferring support.

### Task 4: One product workspace, two depths

**Files:** `src/wingman2/components/ProductWorkspaceChrome.tsx`; `src/wingman2/pages/ProductPitchPage.tsx`; `src/wingman2/pages/ProductCallCardsPage.tsx`; `src/wingman2/pages/NavigationHubPages.tsx`; focused navigation tests; product purpose/user guide docs.

- Present Call Cards as the **Focused view** and Product Positioning as the **Expert view** within one product workspace.
- Keep their distinct conversation and technical tools, but carry the selected SKU when switching between views and expose the switch on both browse and detail screens.
- Preserve old `view=call-cards` and `view=positioning` links while adding the new `view=focused` and `view=expert` names.
- Add tests for active mode and selected-SKU handoff; run focused navigation and product workspace tests.