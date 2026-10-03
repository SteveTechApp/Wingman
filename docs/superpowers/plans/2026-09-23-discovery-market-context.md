# Market-Aware Discovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Begin new Discovery sessions with a recognisable market and environment, then capture the network path when AV is distributed.

**Architecture:** Store market and environment separately from the existing `opportunity` application answer. A focused context entry precedes the existing technical interview; historic drafts with an application continue without migration. A conditional governed question captures corporate-network AV VLAN versus dedicated AV LAN without selecting either by default.

**Tech Stack:** React, TypeScript, Vitest, existing Wingman CSS.

**Spec:** User conversation, 2026-09-23: market-first selection, tailored spaces, situational awareness, and corporate-network AV-VLAN support.

## Global Constraints

- Preserve existing `opportunity` values and recommendation branching.
- Do not infer network topology from market or size.
- Preserve previously captured technical answers when market or environment changes.
- Keep an Other / not sure route.
- Edit in the thread worktree and synchronise changed files to the main checkout.

---

### Task 1: Market and environment catalogue

**Files:** Create `src/wingman2/pages/discovery/discoveryMarketContext.ts`; test `src/wingman2/pages/discovery/discoveryMarketContext.test.ts`.

**Interfaces:** Export a typed market catalogue, `getMarket(id)`, and `getEnvironment(marketId, environmentId)`; entries carry user labels, concise situational prompts and optional suggested application IDs.

- [ ] Write tests for government, emergency services, energy, manufacturing, education, and unknown contexts.
- [ ] Run the focused Vitest test and verify failure.
- [ ] Implement the catalogue and lookup helpers.
- [ ] Run the focused test and verify success.

### Task 2: Industry-first entry

**Files:** Create `src/wingman2/pages/discovery/DiscoveryMarketEntry.tsx`; modify `src/wingman2/pages/DiscoveryPage.tsx` and `src/wingman2/styles/wingman-workflow-theme.css`; test `src/wingman2/pages/discovery/DiscoveryMarketEntry.test.tsx`.

**Interfaces:** Entry receives current `market` and `environment` answer strings and returns the selected values. Discovery stores both in `answers`, suggesting an existing `opportunity` value only if none has been captured.

- [ ] Write tests for market-first gating, environment options, Other, and editing context without clearing existing answers.
- [ ] Run focused tests and verify failure.
- [ ] Implement the entry and responsive styles using existing Wingman visual tokens.
- [ ] Run focused tests and verify success.

### Task 3: Distributed-network question

**Files:** Modify `src/wingman2/pages/discovery/discoveryQuestions.ts` and `discoveryProgressiveDisclosure.tsx`; test `src/wingman2/pages/discovery/discoveryMarketContext.test.ts`.

**Interfaces:** `network-path` is a governed answer visible when the selected application is distributed video or scale is multi-room/building-wide. Options distinguish corporate network with AV VLAN, a dedicated physical AV LAN, network path undecided, and no IP distribution.

- [ ] Write visibility and option tests for single-room and distributed cases.
- [ ] Run tests and verify failure.
- [ ] Add the question and Essential-mode inclusion; never prefill a network path.
- [ ] Run tests and verify success.

### Task 4: Verification

**Files:** Modify only any tests or copy revealed by focused verification.

- [ ] Run Discovery-focused tests.
- [ ] Run strict typecheck and build.
- [ ] Verify desktop and mobile Discovery flow, saved-draft resume, and both network paths.
- [ ] Synchronise files to the main checkout and confirm hashes.

### Task 5: Market-relevant template choice

**Files:** Modify `src/wingman2/pages/discovery/DiscoveryMarketEntry.tsx`, `discoveryMarketContext.ts`, `DiscoveryMarketEntry.test.tsx`, and `src/wingman2/styles/wingman-workflow-theme.css`.

**Interfaces:** After choosing a market, show up to 4 matching room templates with links to their existing review workflow. Mark adjacent-sector designs as related, and retain a clear custom-design action that reveals environment choices.

- [x] Add a test that Education offers pre-built templates and a custom route.
- [x] Verify the focused test passes.
- [x] Add the template selection section and responsive styling.
- [x] Verify the template test passes.
