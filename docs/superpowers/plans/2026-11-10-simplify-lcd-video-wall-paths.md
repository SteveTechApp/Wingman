# Simplify LCD Video Wall Paths Implementation Plan

> **For agentic workers:** This plan is being executed inline in the current session. Each task is test-led and ends with its focused checks.

**Goal:** Replace the long LCD preset list with a short room-shaped workflow and ensure the recommendation maps each LCD feed/layout to an appropriate API-controllable WyreStorm path.

**Architecture:** Keep wall technology and requirements as the source of truth. Hide generic LCD catalogue presets from the starting picker while retaining rep-saved LCD designs; expose the meaningful connection paths in the wizard and make recommendation blockers reflect decoder and multiview limits.

**Tech Stack:** React, TypeScript, Vitest, existing wall decision and feeding models.

**Spec:** User request in the current conversation (2026-11-10).

## Global Constraints

- Wall technology remains the first guided answer.
- Legacy saved wall requirements continue to load and remain editable.
- A per-display decoder count follows the LCD panel array.
- NHD-150-RX supports up to six floating windows and up to nine preset windows.
- NHD-0401-MV and NHD-600-TRX are fixed-layout multiview routes; NHD-600-TRX is the 10GbE route.
- Do not guess display timing, transport availability, or API integration details.

---

### Task 1: Slim the starting LCD list

**Files:** `src/wingman2/pages/videowall/VideowallStartPresets.tsx`, `src/wingman2/pages/videowall/VideowallStartPresets.test.tsx`

- [x] Hide the stock LCD preset catalogue from the LCD start group in both guided shortlist and expert catalogue readings.
- [x] Keep rep-saved and explicitly pinned LCD starting points available.
- [x] Test that the default LCD rows are absent and a saved/pinned LCD starting point still appears.

### Task 2: Offer the three connection architectures

**Files:** `src/wingman2/lib/wallFeeding.ts`, `src/wingman2/lib/wallFeeding.test.ts`, `src/wingman2/pages/videowall/VideowallConnectionOptions.tsx`, `src/wingman2/pages/videowall/VideowallWizard.test.tsx`

- [x] Remove the “one feed per group” option for new LCD designs while preserving its reading for previously saved `lcd-grouped` walls.
- [x] Make the per-display path explicitly say one NHD decoder per panel and retain the selected 1GbE/10GbE speed.
- [x] Add the local NHD-0401-MV fixed multiview path when the source count fits its four inputs; keep NHD-150-RX and NHD-600-TRX paths tied to 1GbE and 10GbE.
- [x] Test the option sets, path persistence and `multiviewSelected` behavior.

### Task 3: Match recommendation limits and control scope

**Files:** `src/wingman2/lib/videowallOptions.ts`, `src/wingman2/lib/videowallOptions.test.ts`, `src/wingman2/lib/videowallDecision.test.ts`

- [x] Add an NHD-120-RX per-display option for 4K30-or-lower 1GbE designs; keep NHD-500-RX for supported 1GbE 4K60 designs and NHD-600-TRX for 10GbE.
- [x] Enforce six floating / nine preset windows for NHD-150-RX, four local source inputs and fixed presets for NHD-0401-MV, and fixed layouts for NHD-600-TRX.
- [x] State API controllability for these paths and leave customer-specific API integration points as a confirmation check.
- [x] Test suitable/rejected paths by source timing, network and layout.

### Task 4: Update the durable wall rules

**Files:** `AGENTS.md`, `docs/VIDEO_WALL.md`

- [x] Record why LCD starting presets are hidden and how the three connection architectures map to decoder/multiview paths.
- [x] Preserve existing legacy `lcd-grouped` behavior in the narrative.

### Task 5: Attribute room-template products

**Files:** `src/wingman2/lib/roomTemplateDeployment.ts`, `src/wingman2/lib/roomTemplateAudio.ts`, `src/wingman2/lib/roomTemplateDeployment.test.ts`, `docs/ROOM_TEMPLATE_SKUS.md`, `AGENTS.md`

- [x] Add room-specific optional product choices for wireless presentation, UC cameras, USB extension, microphone hubs and supported control routes.
- [x] Route Dante-enabled NetworkHD 500 source schedules through NHD-500-DNT-TX; preserve explicit AMP-2120-DNT zone sizing and offer AMP-260-DNT only for a fitting low-impedance zone.
- [x] Keep screens, speakers and specialist audio out of WyreStorm SKU attribution and defer DSP-88-DNT while its sale availability is unconfirmed.
- [x] Test representative template families and quantity/optional rules.

### Task 6: Verify and commit

- [x] Run focused tests, `npm run typecheck`, `npm run build`, and the required documentation contract.
- [ ] Commit the finished change with the repository pre-commit hook enabled.
