# Repository audit and archive implementation plan

**Goal:** Review the active repository, retain useful support and recovery features, and archive demonstrably disconnected code without changing live behaviour.

**Architecture:** Trace imports from production entrypoints and separately inventory tests, maintenance tools, assets and deployment configuration. Preserve removed files in a named Git archive ref with a manifest; keep archive material outside the active checkout.

**Tech stack:** React, TypeScript, Vite, Node, Vitest, Playwright, GitHub Actions.

**Spec:** User request of 15 October 2026: full code review/audit, retain useful unused features, archive unused code/folders. Existing authorization covers commit, push and merge only after green checks.

## Constraints

- Preserve edits concurrently appearing in the main checkout.
- Do not classify tests, migration history, maintenance scripts, generated product data or dynamically loaded assets as dead solely because frontend imports do not reach them.
- Preserve all 29 approved routes and restored videowall/template flows.
- Use the repository typecheck, normal commit hooks and required GitHub checks. Do not relax budgets or skip gates.

## Tasks

- [ ] Inventory tracked files and runtime reachability using `tools/check-orphaned-modules.mjs`, `tools/audit-wingman-feature-surface.mjs`, compiler-based import inspection and repository reference searches.
- [ ] Review each unreachable component and its callers/tests; document retain/archive decisions in `docs/REPOSITORY_AUDIT_2026-10-15.md`.
- [ ] Review routing, schematic validation, API safety boundaries, dependency/CI coverage and deployment configuration; record reproducible findings and limits in the audit report.
- [ ] Create and push a `codex/archive-*` ref preserving the exact pre-cleanup commit; record hashes, original paths and restoration commands. Remove only verified disconnected files from active paths.
- [ ] Run typecheck/lint/tests/build, architecture/orphan/feature checks and GitHub gates. Fix regressions before merging the audit PR.
- [ ] Synchronize reviewed changes to the main checkout only after checking for concurrent modifications; leave those modifications intact.

Execution continues inline in the existing isolated worktree under the user's authorization.
