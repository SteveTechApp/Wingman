# Wingman Workflow Regressions Implementation Plan

> **For agentic workers:** Execute this plan inline in the current worktree. Track each group with checkbox steps and verify the named gates.

**Goal:** Restore the requested survey, proposal, project-anchor, videowall, pricing, audit, import-review, and export workflows with regression coverage.

**Architecture:** Keep behavior in existing feature engines and registries, keep UI state aligned with persisted project state, and reuse shared copy/data across output formats. Add focused regression assertions alongside the existing feature tests and repair current debt-gate failures caused by these changes.

**Tech Stack:** React, TypeScript, Vitest, Playwright, Vite, Node tooling.

**Spec:** User request in this conversation and repository `AGENTS.md` instructions.

## Global Constraints

- Work in the managed worktree and synchronize changed files to `C:/Users/steve/wingman` byte-for-byte.
- Use `npx tsc --noEmit -p tsconfig.typecheck.json` for the full strict typecheck.
- Run server tests through Vitest, never raw `node --test`.
- Keep the architecture, dead CSS, unstyled-class, size budget, and style drift gates green without undocumented baseline increases.
- Treat legacy/unknown persisted values as readable and avoid inventing data or labels.

---

### Task 1: Survey and readiness persistence

**Files:** Site survey checklist/storage/components and tests; readiness checklist copy and tests.

- [ ] Make source links omit mount entries, label survey cells as display-end endpoints, and store mount once per display with link inheritance.
- [ ] Persist wall picker's started-card mark in the saved wall.
- [ ] Name currency in visible restore copy for readiness and still-to-price blocks.
- [ ] Sort survey queue by oldest reading, then cleared-row count.

### Task 2: Proposal and template workflow

**Files:** Template review page, proposal wizard/page, proposal export helpers and suites.

- [ ] Mount staged pre-issue walk on the template Proposal tab and restore remembered stage, rail, and share action.
- [ ] Split proposal completion wizard to stay within line budget and retain behavior.
- [ ] Add display size to builder copy confirmation.
- [ ] Share competitor-exclusion copy across HTML/PDF/DOCX and print cable key in Word schedule.
- [ ] Use current catalogue SKUs and add grouped-wall schedule parity evidence for PDF and DOCX.

### Task 3: Videowall recommendation and wiring

**Files:** Videowall engine/options/builder and focused tests.

- [ ] Recommend local matrix for two/four projector walls; block one-composed-output designs.
- [ ] Add matrix-only survivor regression coverage.
- [ ] Show grouped feed wiring in transport panel and wall key.
- [ ] Remove the unused `VideowallPreview` component and repair related styling gates.

### Task 4: Project navigation and audit integrity

**Files:** Project detail/list pages, anchor registry/jump hook, audit scope definitions and tests.

- [ ] Make every registered panel/section anchor target its actual card, expose per-panel address/copy action, and wire URL hash jumps.
- [ ] Move proposal drafts out of Projects page to meet its line budget.
- [ ] Render unknown audit scopes in readable words without mapping them to an invented scope.
- [ ] Add compile-time coverage so audit writes cannot use scopes outside `AUDIT_SCOPES`.
- [ ] Add project-list re-confirm chip coverage.

### Task 5: Import review behavior and survey sample

**Files:** Import run/review UI and tests; sample project fixture/data.

- [ ] Open the transport row after an imported-sheet run and the stored review row after applying a corrected run.
- [ ] Give one sample project a room topology so the browser survey checklist can be walked.

### Task 6: Repair and verify

- [ ] Run focused feature suites and address all failures in the requested areas.
- [ ] Run strict typecheck, build, architecture boundary, dead CSS, unstyled classes, and relevant style/size ratchets.
- [ ] Copy changed files to the main checkout and verify byte identity.
