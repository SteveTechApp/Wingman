# Room design pack standard

The user's reference is the [Habitech Material Source Studio London room guide](https://materialsource.habitech.co.uk/). Its room purpose, operating descriptions, equipment groupings and technical-room schematics establish the presentation benchmark. Wingman uses its own saved design information and assets; the reference is not a source of copied photographs or unverified product specifications.

## Customer document

Each room should explain its purpose, users and site conditions, intended experience, operating sequence, architecture, equipment, external scope and acceptance requirements. Concept images must be labelled. Missing facts remain open decisions, not generated claims.

The HTML and Word exports now share a room brief derived from the saved application proposal and current equipment schedule:

- Room purpose and recorded design facts, including capacity and site details where captured.
- Recorded benefits and the authored operating sequence, with architecture-based fallback only when no sequence is present.
- Equipment grouped by its recorded role, preserving saved item numbers, quantities and optional labels. Excluded and non-positive rows are omitted from the room summary.
- Existing schematic, cable schedule, product references, commercial schedule, delivery responsibilities and acceptance criteria remain in the technical sections.
- Third-party scope shows its recorded inclusion, allowance, by-others or validation status. An allowance is not represented as an agreed included supply.

Room images in the HTML export use the saved concept image when available. Relative application assets resolve against the application origin; the exported HTML therefore needs access to that origin for those images. Word's existing image loader embeds successfully loaded assets.

## Boundaries and future work

This is a single-room proposal presentation improvement. It does not introduce a multi-room schedule, shared rack allocation, new manufacturer data, measured site drawings or an installation-ready schematic. Shared equipment must not be deduplicated by SKU alone: separate physical devices can have the same SKU. A future multi-room model needs stable room and device identifiers and explicit room-to-shared-infrastructure references.

Existing concept schematic validation and proposal issue checks remain authoritative. Recorded room facts are not automatically site-verified facts. Room-specific acceptance criteria should be completed before issue.

## Verification

`proposalRoomBrief.test.ts` checks saved operating steps, safe image URLs, escaping, missing room facts, exclusions, optional quantities and HTML/Word content parity. The existing proposal output parity command verifies HTML, Word and PDF semantic markers and equipment quantities. Full typecheck, lint, build, architecture and size checks also apply.
