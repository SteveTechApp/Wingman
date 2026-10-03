# Development pass — Discovery handoff evidence

## Goal

Make Discovery create structured evidence for the rest of Wingman.

## Files likely affected

- `src/wingman2/pages/DiscoveryPage.tsx`
- `src/wingman2/data/projectStore.ts`
- `src/wingman2/pages/ProjectDetailPage.tsx`
- `src/wingman2/lib/projectRequirements.ts`

## Required captured evidence

- Customer wording
- Application type
- Room type
- Source count
- Display count
- USB/conferencing need
- Audio need
- Control need
- Distance/infrastructure
- Missing information
- Next best question
- Likely architecture direction
- Assumptions
- Quote blockers

## Acceptance criteria

- Discovery saves a structured brief.
- Project Detail displays the saved brief.
- Finder can use the discovery evidence.
- Proposal can show assumptions and blockers.
- Discovery avoids a long flat form.
- One active question and one clear next action are visible.