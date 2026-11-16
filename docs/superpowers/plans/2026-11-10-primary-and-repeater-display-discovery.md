# Primary and Repeater Display Discovery Plan

> **For agentic workers:** Execute inline in this session; preserve existing discovery answers and proposal flow.

**Goal:** Let a rep capture the room's primary display arrangement, the total video output count, and the number and purpose of repeater screens, then carry those facts into recommendation and proposal design context.

**Architecture:** Add governed Discovery questions for primary display arrangement, repeater count, and repeater use. Keep the existing total display/output question because it sizes system routing, clarify that it includes primary and repeater endpoints, and persist the new distinct answers in the existing extensible room model. Repeater purpose appears only when repeaters are present or their count is unknown.

**Tech Stack:** React, TypeScript, existing Discovery question model, room model, and recommendation evidence pipeline.

**Spec:** User request in this conversation; narrative update in `docs/DISCOVERY.md`.

## Global Constraints

- Keep `DiscoveryEssentialCapture` and `DiscoveryExpertBuilder` on the same canonical Discovery answers.
- Preserve existing saved `displays` values and defaults.
- Keep primary-display choices separate from total system output count.
- Keep repeater detail progressive so rooms without repeaters do not see repeater-purpose choices.
- Do not add or run tests unless the user asks for verification.
- Run `git diff --check` and sync changed files to `C:\Users\steve\wingman`, byte-comparing the copies.

---

### Task 1: Capture primary display and repeater choices

**Files:**
- Modify: `src/wingman2/pages/discovery/discoveryQuestions.ts`
- Modify: `src/wingman2/pages/discovery/discoveryProgressiveDisclosure.tsx`
- Modify: `src/wingman2/pages/discovery/DiscoveryEssentialCapture.tsx`
- Modify: `src/wingman2/pages/discovery/operationalDiscovery.ts`

**Interfaces:**
- Add canonical answer `primary-display` with single-choice values for one/two/three large flat panels, a single or dual projector, an LCD wall, an LED wall, another arrangement, and unknown.
- Add canonical answer `repeater-displays` with counts none, 1–2, 3–4, 5–8, 9+, and unknown.
- Add repeater purpose choices for overflow seating and room-wide visibility to `display-behaviour`; keep independent content in that same existing behaviour answer.
- Add the primary-display and repeater-count questions to Essential and Expert from the canonical question set; show repeater purpose options only when the count is positive or unknown.

- [x] Clarify the existing `displays` prompt as total video outputs/feed endpoints, including primary displays and repeaters.
- [x] Add and order the primary-display and repeater-count questions in Sources & displays; add conditional repeater-purpose choices to `display-behaviour`.
- [x] Include primary arrangement and repeater count in Essential mode; retain conditional repeater-purpose options.
- [x] Add usable plain-language prompts and option labels in `operationalDiscovery.ts`.

### Task 2: Carry display decisions into the room design and proposal

**Files:**
- Modify: `src/wingman2/pages/discovery/discoveryBriefBuilder.ts`
- Modify: `src/wingman2/lib/recommendationEvidence.ts`
- Modify: `src/wingman2/components/ProposalCompletionWizard.tsx`

**Interfaces:**
- Persist `primaryDisplayArrangement`, `repeaterDisplayCount`, and a derived `repeaterDisplayPurpose` as room-model fields.
- Include these values in requirement text and customer-facing proposal facts so recommendations and design documents can distinguish the primary screen from repeater destinations.

- [x] Save the primary and repeater Discovery answers as labeled room-model facts. Derive repeater purpose from the selected display-behaviour values.
- [x] Add them to recommendation evidence and proposal facts while keeping `displayCount` as the existing total output count.

### Task 3: Document and sync the change

**Files:**
- Modify: `AGENTS.md`
- Modify: `docs/DISCOVERY.md`

- [x] Record the rule that primary display type, total output count, and repeater role are separate facts and that repeater purpose is conditional.
- [x] Run `git diff --check`.
- [x] Copy each changed file to the main checkout and compare SHA256 hashes.
