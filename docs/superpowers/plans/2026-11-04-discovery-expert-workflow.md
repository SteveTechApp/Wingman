# Discovery Expert Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Discovery follow an AV designer's room-to-commissioning sequence while giving Essential view plain-language capture for the same key site, display, audio, routing, control, and commissioning facts.

**Architecture:** Keep `DISCOVERY_SECTIONS` as the single shared ordering and question taxonomy for Expert and guided interview. Keep underlying answer IDs and design options stable; add narrowly scoped site and commissioning capture fields with explicit known/unknown/ownership values, and expand Essential view only with questions needed to make product decisions safely.

**Tech Stack:** React, TypeScript, Vitest, Testing Library.

**Spec:** User request in the Discovery workflow task (2026-11-04).

## Global Constraints

- Expert and focused depths must continue to write the same room record and remain skippable.
- Preserve existing discovery answer IDs and topology data; avoid changing product-selection semantics.
- A question's section is defined once in `discoverySections.ts` and shared by Expert and the guided interview.
- Unknown or third-party-owned installation details remain explicit and must not be treated as confirmed design answers.

---

### Task 1: Reorder and clarify AV design sections

**Files:**
- Modify: `src/wingman2/pages/discovery/discoverySections.ts`
- Test: `src/wingman2/pages/discovery/DiscoveryExpertBuilder.test.tsx`

**Interfaces:** Preserve current section IDs where practical; add `commissioning` as a section ID and map its new question there.

- [ ] Write focused tests for the intended section order, cameras under Displays & cameras, signal/routing and position questions under Switching & signal distribution, and commissioning under its own section.
- [ ] Run the focused test and confirm it fails against the current grouping.
- [ ] Reorder and rename the shared section list to Environment, Displays & cameras, Audio, Switching & signal distribution, Room & AV control, Lighting, Commissioning, then room brief/equipment/review support sections.
- [ ] Reclassify existing question IDs without changing their answer values.
- [ ] Run the focused test.

### Task 2: Capture missing commissioning and site ownership facts

**Files:**
- Modify: `src/wingman2/pages/discovery/discoveryQuestions.ts`
- Modify: `src/wingman2/pages/discovery/discoverySections.ts`
- Modify: `src/wingman2/pages/discovery/operationalDiscovery.ts`
- Modify: `src/wingman2/pages/discovery/DiscoverySiteConditions.tsx`
- Test: `src/wingman2/pages/discovery/DiscoverySiteConditions.test.tsx`
- Test: discovery question tests covering section assignment and answer validity.

**Interfaces:** Add a governed commissioning question; extend site fields with a responsibility status while keeping captured notes in `DiscoveryAnswers`.

- [ ] Add a commissioning question that captures acceptance, handover/training, documentation, and responsible party.
- [ ] Give Expert and Essential renderings wording appropriate to their audiences; include explicit Not known and By others states for site/installation and commissioning capture.
- [ ] Ensure those status values remain distinguishable from a confirmed technical choice.
- [ ] Test status selection, persistence, and rendering.

### Task 3: Fill the Essential-view design gaps

**Files:**
- Modify: `src/wingman2/pages/discovery/DiscoveryEssentialCapture.tsx`
- Modify: `src/wingman2/pages/discovery/operationalDiscovery.ts`
- Modify: `src/wingman2/pages/discovery/discoveryProgressiveDisclosure.tsx`
- Test: `src/wingman2/pages/discovery/DiscoveryEssentialCapture.test.tsx`
- Test: `src/wingman2/pages/discovery/discoveryProgressiveDisclosure.test.tsx`
- Modify: `docs/DISCOVERY.md`
- Modify: `AGENTS.md`

**Interfaces:** Essential view continues to consume canonical question IDs and writes answers to the shared `DiscoveryAnswers` record.

- [ ] Add product-relevant camera, USB, network/routing, control, and commissioning prompts to Essential view with non-technical wording and non-blocking unknown choices.
- [ ] Add focused view fields for room construction, access, power, containment/first-fix cabling, lighting, and source/output positions/distances; expose Not known and By others for responsibility-sensitive details.
- [ ] Confirm smart defaults remain visibly identified as defaults and do not masquerade as customer-confirmed answers.
- [ ] Update Discovery narrative and AGENTS invariant to describe the new section order and shared unknown/ownership semantics.
- [ ] Run targeted tests and the typecheck gate.
