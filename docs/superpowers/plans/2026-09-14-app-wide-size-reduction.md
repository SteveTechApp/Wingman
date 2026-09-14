# App-Wide Size Reduction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce tracked application code materially while preserving routes, behavior, data contracts, and quality ratchets.

**Architecture:** Delete proven unreachable duplicate modules first, then consolidate repeated Compare/page orchestration behind existing feature interfaces. Treat measured net line and byte reduction as an acceptance criterion; extraction that only moves code does not count.

**Tech Stack:** React, TypeScript, CSS, Node, Vitest, Vite.

**Spec:** `docs/superpowers/specs/2026-09-11-wingman-modular-refactor.md`

## Global Constraints

- Do not raise size, style, or architecture baselines.
- Preserve all route, persistence, proposal, recommendation, Compare, and governed-data behavior.
- Delete a module only when repository-wide reference search and feature-surface audit prove it unreachable.
- Run strict TypeScript, focused tests, production build, and the full verification chain.

---

### Task 1: Delete the unreachable Compare duplicate tree

**Files:** Delete the nine modules under `src/wingman2/pages/compare/` reported unreachable by `audit-wingman-feature-surface.mjs`, plus `components/CacheStatusIndicator.tsx`.

**Interfaces:** Produces no interface; active inline Compare behavior remains unchanged.

- [ ] Confirm no runtime import reaches each file with `rg` and the feature-surface audit.
- [ ] Delete the unreachable files.
- [ ] Run `npm run typecheck`, Compare tests, and the feature-surface audit.

### Task 2: Collapse duplicate inline Compare presentation

**Files:** Modify `ComparePageNew.advanced.tsx`; create focused modules only when total lines fall.

**Interfaces:** Consume `features/compare`; preserve rendered DOM contracts.

- [ ] Characterize each card/panel with rendered tests.
- [ ] Move one coherent block, delete its inline copy, and verify a net reduction.
- [ ] Repeat for candidate cards, evidence matrix, decision panel, and live status.

### Task 3: Reduce route CSS duplication

**Files:** `styles/wingman-route-overrides.css`, `styles/wingman-workflow-theme.css`, shared token files.

**Interfaces:** Preserve selectors required by visual contract tests.

- [ ] Identify byte-identical declaration blocks and selectors with equivalent specificity.
- [ ] Consolidate them without adding route-specific rules.
- [ ] Run visual, style-drift, and browser smoke gates after each slice.

### Task 4: Consolidate guard scripts

**Files:** near-duplicate `tools/check-*.mjs` entry points and `package.json` aliases.

**Interfaces:** Preserve every npm script name as an alias to consolidated implementations.

- [ ] Group scripts by shared implementation and prove output/exit-code parity.
- [ ] Replace duplicate implementations with aliases or parameterized runners.
- [ ] Run `verify:contract` and `verify:visual`.

### Task 5: Final measurement

- [ ] Re-measure tracked lines, bytes, largest files, and feature-surface candidates.
- [ ] Run `npm run verify` without baseline changes.
- [ ] Record before/after evidence in `docs/CURRENT_STATUS.md`.
