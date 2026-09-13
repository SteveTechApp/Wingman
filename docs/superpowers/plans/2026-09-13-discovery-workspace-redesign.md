# Discovery Workspace Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Discovery into an engaging, guided sales workspace that supports both live calls and slower desk-based capture without changing governed recommendation logic.

**Architecture:** Add a presentation-only session context to `DiscoveryPage` and expose it through semantic data attributes. Keep the existing question, persistence, and recommendation functions unchanged; place the redesign in a dedicated final cascade layer so it does not conflict with in-progress template styling.

**Tech Stack:** React 18, TypeScript, Lucide React, CSS custom properties, Vitest, Testing Library

**Spec:** User brief in the 2026-09-13 task requesting a less boxy, more visually appealing and guided Discovery workflow for live and asynchronous use.

## Global Constraints

- Preserve all existing Discovery data capture, smart-default, review, topology, save, and recommendation behavior.
- Make live-call mode the default and provide a second mode for notes, email, and site-survey capture.
- Do not add dependencies.
- Preserve keyboard focus, touch targets, responsive behavior, and reduced-motion behavior.
- Do not modify the user's in-progress template redesign rules in `wingman-workflow-theme.css`.

---

### Task 1: Add the session-context control and semantic layout hooks

**Files:**
- Modify: `src/wingman2/pages/DiscoveryPage.tsx`
- Test: `src/wingman2/pages/DiscoveryPage.captureTrail.test.ts`

**Interfaces:**
- Consumes: existing `DiscoveryPage` state and `isGuided` mode.
- Produces: `DiscoveryPace = "live" | "desk"`, `data-discovery-pace`, and the `wm-discovery-session-switch` control.

- [ ] **Step 1: Add a render assertion for the two session choices and the default live state.**
- [ ] **Step 2: Run the focused Discovery test and confirm the new assertion fails.**
- [ ] **Step 3: Add the session state, accessible switch buttons, and contextual hero copy.**
- [ ] **Step 4: Run the focused Discovery tests and confirm they pass.**

### Task 2: Build the visual direction as an isolated cascade layer

**Files:**
- Create: `src/wingman2/styles/wingman-discovery-studio.css`
- Modify: `src/main.tsx`

**Interfaces:**
- Consumes: current Discovery class names plus `data-discovery-pace`.
- Produces: the Discovery-only visual system and responsive layout.

- [ ] **Step 1: Define the Discovery palette: Midnight Ink `#07131f`, Deep Current `#0b2030`, Signal Cyan `#56e0d2`, Conversation Blue `#79b8ff`, and Warm Flag `#ffbe6b`.**
- [ ] **Step 2: Create the asymmetric conversation-stage layout, live activity motif, quieter capture rail, and selected-answer treatments.**
- [ ] **Step 3: Add desk-mode density adjustments, mobile stacking, visible focus, and reduced-motion rules.**
- [ ] **Step 4: Import the layer last in `src/main.tsx`.**

### Task 3: Verify behavior and visual integrity

**Files:**
- Verify: `src/wingman2/pages/DiscoveryPage.tsx`
- Verify: `src/wingman2/styles/wingman-discovery-studio.css`

**Interfaces:**
- Consumes: implementation from Tasks 1 and 2.
- Produces: typecheck, focused test, build, and browser screenshot evidence.

- [ ] **Step 1: Run `npx tsc --noEmit -p tsconfig.typecheck.json`.**
- [ ] **Step 2: Run focused Discovery component tests.**
- [ ] **Step 3: Run `npm run build` without changing debt-ratchet baselines.**
- [ ] **Step 4: Launch the UI, inspect Discovery at desktop and mobile sizes, and correct any layout regressions.**
