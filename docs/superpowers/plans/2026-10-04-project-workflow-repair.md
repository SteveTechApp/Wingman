# Project Workflow Repair Implementation Plan

**Goal:** Restore layout across existing utility-based UI and make the project Equipment step usable with no selected equipment and outstanding requirements.

**Architecture:** Load Tailwind utilities before Wingman's theme cascade, without introducing Tailwind's base reset. Keep existing project stage navigation; expose complete equipment gaps through a native disclosure and direct users to requirements and product selection.

**Tech Stack:** React, TypeScript, Tailwind CSS 3, Vite, Vitest.

**Spec:** User's 4 October screenshot of expert-view Project Equipment: collapsed spacing, unreadable requirement chips and incomplete equipment workflow.

## Constraints

- Keep the established theme and focused/expert controls.
- Edit in this worktree, copy changed files to the main checkout, and compare bytes.
- Validate using tsconfig.typecheck.json and Vitest.

## Tasks

- [x] Generate utilities in the existing layout stylesheet before theme styles; confirm computed flex/grid/gap in the browser.
- [x] Add an equipment empty state, a complete list of outstanding checks, and a Requirements action; carry project context into the selection and comparison links.
- [x] Add rendered behavior coverage for empty equipment, expanded checks and selected line items; run project tests and strict typecheck.
- [x] Sync changes to main, verify the reported page in expert and focused views and check narrow-screen layout.

Execution is inline in this session as authorized by the user's repair request. No commit requested.
