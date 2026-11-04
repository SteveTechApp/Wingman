# Video Wall Network Choice Implementation Plan

> **For agentic workers:** Use this plan inline; the user requested the change directly.

**Goal:** Give the Guided video wall wizard separate source and network questions, with four explicit network provision choices plus a local, no-AVoIP option.

**Architecture:** Keep source count and source timing in the Sources step. Add a Network step whose choices record speed and whether the network already exists or switches must be supplied, plus a no-AVoIP choice that keeps sources local; keep the existing recommendation engine's `network` and `sourceLocation` inputs synchronized with that answer.

**Tech Stack:** React, TypeScript, Vitest.

**Spec:** User request and the attached Guided video wall screenshot.

## Global Constraints

- Preserve older saved walls that have no network-provision field.
- Keep result answer editing mapped to the question that owns each answer.
- Keep network speed as the recommendation engine's existing `1g` or `10g` value.

---

### Task 1: Separate and persist the network answer

**Files:** `src/wingman2/lib/videowallOptions.ts`, `src/wingman2/lib/videowallDraft.ts`, `src/wingman2/lib/videowallWizard.ts`, their existing tests.

- [ ] Add an optional existing/new provision field and four stable network choices.
- [ ] Add a network step and an answer summary whose edit target maps to that step.
- [ ] Keep legacy saved requirements readable, inferring existing provision for old 1GbE/10GbE choices.
- [ ] Update unit tests for four choice patches, summaries, legacy drafts and step mapping.

### Task 2: Render the separate Guided question

**Files:** `src/wingman2/pages/videowall/VideowallWizard.tsx`, `VideowallWizard.test.tsx`, `docs/VIDEO_WALL.md`, `tools/lib/wall-start-step.mjs`, its test and the browser reading if its expected rail is fixed.

- [ ] Remove network choices from the Sources screen while retaining source count and timing.
- [ ] Add a dedicated Network screen with the four requested options and a required selection before continuing.
- [ ] Update rail, back navigation, step tests and browser-reading expectations.

### Task 3: Verify and sync

- [ ] Run targeted wizard tests, then the full requested test suite.
- [ ] Run the relevant browser check and docs check.
- [ ] Copy changed files to the main checkout and verify byte identity.
