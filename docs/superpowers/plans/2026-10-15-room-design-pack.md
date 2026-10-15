# Room Design Pack Implementation Plan

**Goal:** Present the saved room brief, operating sequence and grouped equipment consistently in HTML and Word proposals, following the user's Material Source benchmark.

**Architecture:** Keep the existing proposal compiler, schematic and commercial schedule as the source of truth. Build a shared presentation model from the saved application and active BoM rows; render it in both exports without inventing room facts or product specifications.

**Tech Stack:** TypeScript, Vitest, HTML and docx.

**Spec:** User reference: https://materialsource.habitech.co.uk/ — room overview, experience, signal flow and complete equipment scope. This implementation improves single-room exports; multi-room shared infrastructure allocation needs a dedicated project model and must not be inferred from SKU similarity.

## Constraints

- Preserve saved customer content and existing design approval checks.
- Do not copy reference imagery or product specifications.
- Keep concept imagery and unresolved scope explicitly labelled.
- Preserve concurrent dependency changes in the main checkout.

## Tasks

- [x] Add a shared room brief model and HTML renderer in `src/wingman2/lib/proposalRoomBrief.ts`. Include purpose, application, recorded design facts, benefits, numbered operation and active equipment grouped by recorded role. Keep original BoM item references, quantities and optional status; exclude excluded and zero quantity rows.
- [x] Prefer saved `applicationProposal.userJourney` in `proposalSalesContent.ts`, falling back to the existing architecture narrative when empty.
- [x] Add the room brief near the beginning of `proposalExport.ts` and `proposalDocxExport.ts`. Retain detailed commercial, third-party, schematic, cable and acceptance sections.
- [x] Test saved-operation precedence, empty fallback, excluded equipment, original item identifiers, HTML escaping and equivalent HTML/Word room content in `proposalSalesContent.test.ts` and `proposalRoomBrief.test.ts`.
- [x] Run focused Vitest, full typecheck, lint and build; inspect export content and synchronize only changed files to main after checking for conflicts.
- [x] Document the delivered scope and remaining multi-room allocation work.
