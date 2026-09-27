# Blue-Light Room Design Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace repetitive blue-light control-room suggestions with technically differentiated, reviewable room designs and publish a market-wide template/BoM audit.

**Architecture:** Author four native Emergency Services `RoomTemplate` records in a separate module, register them in the published template list and image-profile registry, and let the existing Discovery market filter surface direct matches first. The audit derives counts from the current published catalogue and uses primary manufacturer/government sources for technical constraints.

**Tech Stack:** TypeScript, React, Vitest, Vite; existing `RoomTemplate`, `TemplateApplicationProfile`, and Discovery market filtering.

**Spec:** [Wingman room-template design and BoM audit](../../WINGMAN_ROOM_DESIGN_AUDIT_2026-09-24.md)

## Global Constraints

- Edit in the thread worktree and sync exact changed files to `C:/Users/steve/wingman` with matching hashes.
- A template is a design baseline, not a customer-ready quotation while site, network and by-others scope remain unverified.
- NHD-128-NDI-TRX belongs to the NetworkHD 100/120/150 ecosystem; NHD-600 requires a separately engineered 10Gb path.
- All new WyreStorm SKU rows must exist in the governed product store with `doNotSpec: false`.
- Run `npx tsc --noEmit -p tsconfig.typecheck.json`, focused Vitest tests, `npm run build`, and `git diff --check`.

---

### Task 1: Native Emergency Services templates

**Files:**
- Create: `src/wingman2/lib/roomTemplatesEmergency.ts`
- Modify: `src/wingman2/lib/roomTemplates.ts`
- Test: `src/wingman2/lib/roomTemplatesEmergency.test.ts`

**Interfaces:** Produces `emergencyRoomTemplates: RoomTemplate[]`; `roomTemplates` consumes it before applying `withRequiredRoomElements`.

- [x] Write a test asserting four Emergency Services templates, only one required NHD-600 design, governed SKUs and by-others delivery rows.
- [x] Run the focused test and author four concepts: point-to-point station briefing, hybrid tactical coordination, 10Gb dispatch, 1Gb shared status.
- [x] Run `npx vitest run src/wingman2/lib/roomTemplatesEmergency.test.ts` and resolve any technical inconsistencies against manufacturer documentation.

### Task 2: Published profiles and Discovery choice verification

**Files:**
- Modify: `src/wingman2/lib/templateApplicationProfiles.ts`
- Test: `src/wingman2/lib/templateApplicationProfiles.test.ts`
- Inspect: `src/wingman2/pages/discovery/DiscoveryMarketEntry.tsx`

**Interfaces:** Four new template IDs receive reviewed image keys; Discovery's `templateMatchesMarketFilter` selects direct `Emergency Services` records before related Government/Control Rooms records.

- [x] Add image assignments for the four IDs and run profile-count tests.
- [x] Check the actual Discovery shortlist at desktop and mobile widths, including all four room concepts and template navigation.

### Task 3: Market-wide technical and BoM audit

**Files:**
- Create: `docs/WINGMAN_ROOM_DESIGN_AUDIT_2026-09-24.md`

**Interfaces:** Read-only catalogue analysis; no pricing data is invented.

- [x] Count templates and distinct WyreStorm SKUs by canonical market from the published catalogue.
- [x] Document physical/remote source topology, explicit optional equipment, network/security prerequisites and by-others scope for the four new concepts.
- [x] Identify zero-coverage markets, near-duplicates and the next quotation-readiness gates with direct primary-source links.

### Task 4: Release verification and worktree sync

**Files:** All files above, plus this plan.

- [x] Run strict typecheck, targeted Vitest, build, style-drift check and `git diff --check`.
- [x] Sync changed files worktree to main, verify hashes, and confirm the live preview sees the new direct Emergency Services templates.
- [x] Report what is implemented versus what still needs site survey and technical sign-off.
