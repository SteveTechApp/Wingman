# Sales proposal authoring implementation plan

**Goal:** Produce an editable customer story, supported by technical diagrams, product imagery and live references, with explicit completion prompts for external design scope.

**Architecture:** Share narrative and exact-SKU media selection between HTML and Word exports. Persist salesperson wording with the project and preserve existing drafts. Keep the existing topology engine as the technical drawing source.

**Tech stack:** React, TypeScript, docx, Vitest.

**Spec:** User request in this task, 25 September 2026.

## Constraints

- Preserve existing workspace changes; do not commit unrelated work.
- Do not invent product capabilities, images, dates or external scope commitments.
- Use exact product media records, safe web URLs and explicit missing-media states.

## Implementation

- [x] Add shared proposal narrative/media helpers and tests for solution operation, unsafe URLs, missing media and exact SKU matching.
- [x] Add editable external design scope and preserve customer objectives and solution wording in saved proposals and HTML/Word output.
- [x] Add product photographs and hyperlinks to exports; retain aspect ratios and tolerate unavailable media.
- [x] Replace unsupported operational promises and arbitrary default delivery dates with conditional wording.
- [x] Run targeted export, compiler, wizard and persistence tests, strict typecheck, build and sales language checks.

## Validation

75 targeted tests passed across the proposal, wizard, persistence, approval and schematic suites (the corrected schematic test was rerun separately). Strict typecheck, production build and sales language checks passed. Browser inspection verified HTML narrative layout, diagram topology, image loading, live link markup and no horizontal overflow. Word package tests verified embedded images and external hyperlink relationships; Word page rendering was not available in this environment.
