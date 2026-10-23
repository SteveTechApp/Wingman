# Merged Review Findings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Repair the four unresolved findings from PRs #255 and #256.

**Architecture:** Keep product identity normalization in the existing intake function and route editing directly to the existing editor. Extract the browser session lifecycle into a small tool helper so setup failures and sign-in diagnostics can be tested without starting servers.

**Tech Stack:** TypeScript, React, Vitest, Node.js, Playwright.

**Spec:** User request to fix the four findings investigated in this chat: https://github.com/SteveTechApp/Wingman/pull/255 and https://github.com/SteveTechApp/Wingman/pull/256.

## Global Constraints

- Work on `codex/fix-merged-review-findings`; preserve unrelated main-checkout edits.
- Retain placeholder identity when no WyreStorm model can be identified, and retain third-party SKU handling.
- Preserve the editor handoff and template identity in both UI modes.
- Always close a launched browser, including when context or page creation fails.
- Start tracing before sign-in, and capture only diagnostics supported by initialized objects.
- Keep size and architecture budgets unchanged.

### Task 1: Product identity

- [x] Extend `src/wingman2/lib/productPageIntake.test.ts` with downstream proposal-selection coverage and unresolved/third-party cases.
- [x] Update `applyProductPageDetailsToBomRow` to promote a recognized WyreStorm model from a placeholder SKU.
- [x] Run the product intake tests.

### Task 2: Custom-template routing

- [x] Add a regression test in `src/wingman2/pages/TemplatesPage.test.tsx` for both modes.
- [x] Update `manageCustom` in `TemplatesPage.tsx` to open `/templates/:id/edit` with the existing edit handoff.
- [x] Verify both mode cases navigate with the original template ID.

### Task 3: Browser lifecycle and diagnostics

- [x] Create `tools/lib/browser-smoke-session.mjs` and a fault-injection test beside it.
- [x] Move context/page setup under cleanup and tracing before sign-in; collect partial diagnostics on setup failures.
- [x] Replace the session block in `tools/e2e-smoke-check.mjs` with this helper.
- [x] Test context creation, page creation, sign-in failure, and successful cleanup; run the real browser smoke.

### Task 4: Publish

- [x] Run strict typecheck, lint, full tests, architecture, production build and size budgets.
- [ ] Commit and push the focused branch, open a PR, and report verification and any main-checkout sync conflicts.
- [x] Commit and push the focused branch, open PR #269, and report verification and any main-checkout sync conflicts.

### Task 5: Merge prerequisites

- [x] Pin browser CI jobs to Ubuntu 24.04 after the latest runner migrated to unsupported Ubuntu 26.04.
- [x] Update Vite to 8.3.5 and Vitest/coverage to 4.1.12 to address published security advisories.
- [x] Address the follow-up review by deriving promoted SKUs from official WyreStorm product URLs; test specification-led titles and untrusted or non-product URLs.
- [ ] Recheck the clean install, build, dependency audits, visual checks and full test lane, then merge PR #269 after CI passes.

## Verification recorded before publication

Source fix commit: `63437292`. All 15 focused regression tests, the real browser
smoke walkthrough, production build, size budgets, strict typecheck, lint,
architecture boundaries, and the full suite (2,843 passed, one skipped) passed.
The seven changed source/test files were synchronized to main with byte checks.
Other main-checkout changes were preserved.
