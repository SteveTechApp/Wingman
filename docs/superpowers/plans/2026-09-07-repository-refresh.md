# Repository Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate every outstanding remote change and reduce repository duplication and verified dead code without changing application behavior.

**Architecture:** Build one integration branch from the guarded-persistence work, merge each remote branch with unique patches, then make two focused cleanup passes. Reuse the shared crash-safe JSON writer throughout tooling and remove only CSS selectors that no rendered source uses, with existing contract and visual gates proving behavior remains intact.

**Tech Stack:** Git, TypeScript, React, Node.js ESM, Vitest, Vite, CSS.

**Spec:** User request in the 2026-09-07 Codex task; supporting repository rules are in `AGENTS.md`, `docs/SIZE_BUDGETS.md`, and `docs/CI_GUARD_GATES.md`.

## Global Constraints

- Preserve all existing functionality and user-owned changes.
- Never bypass hooks or raise size/style baselines merely to make verification pass.
- Run `npx tsc --noEmit -p tsconfig.typecheck.json`; the default TypeScript configuration is not the real gate.
- Run Vitest through `npx vitest run`, including server tests.
- Push through a feature branch because `main` requires nine status checks.

---

### Task 1: Integrate outstanding remote work

**Files:** Merge the unique commits from the three `audit/2026-09-*` branches and the schematic lifecycle branch; resolve overlaps in `tools/check-migration-live-state.mjs` and documentation by retaining both branches' behavior.

**Interfaces:**
- Consumes: `origin/main`, `origin/codex/guarded-project-persistence`, and refreshed remote refs.
- Produces: one integration history containing every patch not already represented in `main`.

- [ ] **Step 1: Create the integration branch**

Run: `git switch -c codex/repository-refresh`

- [ ] **Step 2: Merge each unique remote branch**

Run one non-interactive `git merge --no-edit` per branch and inspect conflicts before resolving them.

- [ ] **Step 3: Verify patch coverage**

Run: `git cherry origin/main <branch>` for every source branch.
Expected: no source branch retains an unrepresented `+` patch.

### Task 2: Consolidate crash-safe JSON writing

**Files:**
- Modify: `tools/draft-technical-profiles-batch4.mjs`
- Modify: `tools/lib/wyrestorm-profile-utils.mjs`
- Reuse: `tools/lib/atomic-json-writer.mjs`
- Test: `tools/atomic-json-writer.test.mjs`

**Interfaces:**
- Consumes: `atomicWriteJsonSync(filePath, value)` from the merged shared writer.
- Produces: tooling with one implementation of temporary-file creation, fsync, rename, and cleanup.

- [ ] **Step 1: Extend the shared-writer tests for both former callers**

Add assertions that the synchronous writer emits two-space JSON plus a trailing newline and leaves no `.tmp` files after success.

- [ ] **Step 2: Run the focused test**

Run: `npx vitest run tools/atomic-json-writer.test.mjs`
Expected: PASS.

- [ ] **Step 3: Replace local implementations**

Import `atomicWriteJsonSync`; delete each duplicated `atomicWriteJson` body and update its call sites.

- [ ] **Step 4: Run tooling tests and lint**

Run: `npx vitest run tools/atomic-json-writer.test.mjs tools/check-migration-live-state.test.mjs`
Run: `npx eslint tools/draft-technical-profiles-batch4.mjs tools/lib/wyrestorm-profile-utils.mjs tools/lib/atomic-json-writer.mjs`
Expected: PASS with no errors.

### Task 3: Remove proven unreachable navigation CSS

**Files:**
- Modify: `src/wingman2/styles/wingman-polish-navigation.css`
- Modify: `src/wingman2/styles/wingman-route-overrides.css`
- Modify: `tools/check-retired-wingman-features.mjs`

**Interfaces:**
- Consumes: the route registry and source search proving no JSX emits the `.wm-navhub-*` class family.
- Produces: smaller stylesheets and a guard preventing that retired class family from returning to rendered source.

- [ ] **Step 1: Add retired-class assertions**

Make the retired-feature checker scan source files and fail if any class in the retired family is rendered.

- [ ] **Step 2: Verify the guard passes before cleanup**

Run: `npm run check:retired-features`
Expected: PASS because the tokens exist only in CSS.

- [ ] **Step 3: Delete only selector blocks containing retired tokens**

Parse the stylesheet conservatively; remove complete CSS rules whose selector contains a retired token, preserving interleaved generic `.wm-polish-*` rules and all at-rule structure.

- [ ] **Step 4: Verify CSS contracts**

Run: `npm run wm:guard-css && npm run check:style-drift-baseline && npm run check:page-visual-classes`
Expected: PASS with drift metrics equal to or below baseline.

### Task 4: Verify, commit, and publish

**Files:** All files changed by Tasks 1-3 and this plan.

**Interfaces:**
- Consumes: integrated and cleaned working tree.
- Produces: a clean remote `codex/repository-refresh` branch ready for protected-branch checks.

- [ ] **Step 1: Run the full gate**

Run: `npm run verify`
Expected: all strict type, lint, test, build, data, contract, and visual gates pass.

- [ ] **Step 2: Commit cleanup**

Run: `git commit -m "refactor(repo): consolidate tooling and remove dead styles"`

- [ ] **Step 3: Push integration branch**

Run: `git push -u origin codex/repository-refresh`
Expected: the remote branch is created without bypassing protected `main`.
