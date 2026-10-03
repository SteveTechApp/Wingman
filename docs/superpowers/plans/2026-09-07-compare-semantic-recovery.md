# Compare Semantic Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recover the valuable Compare distribution and semantic-integrity work from three cleanup stashes without reintroducing stale generated data or duplicate implementation.

**Architecture:** Apply the focused distribution regression onto current `main` first and adapt it to the existing semantic profiler. Recover the broader semantic work in separately reviewable code, gate, and regenerated-data commits. Drop only the store-bootstrap stash because its exact change is already in `main`.

**Tech Stack:** TypeScript, React 19, Vitest, Node.js data gates, governed CSV/JSON generators.

**Spec:** Archived stashes `stash@{0}`, `stash@{1}`, and `stash@{2}` inspected on 2026-09-07.

## Global Constraints

- Preserve current `main` as the source of truth; do not overwrite files wholesale from older stash snapshots.
- Treat mirrored physical fan-out separately from independently routed outputs.
- Keep runtime eligibility authoritative and revalidate only stale governed promotions.
- Regenerate derived JSON from current sources instead of restoring generated snapshots.
- Use `npm run typecheck`, focused Vitest suites, data gates, and the complete `npm run verify` chain.

---

### Task 1: Recover the focused distribution regression

**Files:**
- Modify: `src/wingman2/lib/wyrestormCompareProfile.ts`
- Modify: `src/wingman2/pages/ComparePageNew.advanced.tsx`
- Create: four distribution regression test files archived in `stash@{0}^3`

**Interfaces:**
- Consumes: current semantic product profile and runtime compare pipeline.
- Produces: correct 1×N mirrored fan-out profiles and stable runtime/page results.

- [x] Restore the four tests from `stash@{0}^3` and run them to record current failures.
- [x] Port only the still-missing topology and runtime-authority changes from `stash@{0}`.
- [x] Remove the unconditional render-time retry call.
- [x] Run the focused tests and typecheck.
- [x] Commit the focused regression independently.

### Task 2: Recover semantic safeguards without generated snapshots

**Files:**
- Modify: Compare eligibility, spec, verdict, page, routed-I/O generator files selected from `stash@{1}`.
- Create: seven semantic tests and two data tools from `stash@{1}^3` where still applicable.

**Interfaces:**
- Consumes: `AvProductSemanticProfile`, governed routed-I/O evidence, current product sources.
- Produces: minimum fan-out enforcement, right-sizing, runtime-fit authority, and semantic integrity validation.

- [ ] Restore semantic tests and run them against Task 1.
- [ ] Port minimal implementation hunks needed by failing tests, resolving overlap through the current semantic profiler.
- [ ] Add the semantic integrity gate to package verification.
- [ ] Exclude archived generated JSON and CSV snapshots; regenerate from current governed sources only.
- [ ] Run focused tests, data generation, integrity gate, and typecheck.
- [ ] Commit semantic safeguards separately.

### Task 3: Verify and retire archives

**Files:**
- Modify: this plan checklist only.

**Interfaces:**
- Consumes: Tasks 1 and 2.
- Produces: a verified recovery branch and an unambiguous stash-retirement decision.

- [ ] Run `npm run verify` and inspect the branch diff against `main`.
- [ ] Mark completed checklist items.
- [ ] Drop `stash@{2}` after confirming `shell: true` remains on `main`.
- [ ] Drop `stash@{0}` and `stash@{1}` only after their accepted work is committed and verified.
