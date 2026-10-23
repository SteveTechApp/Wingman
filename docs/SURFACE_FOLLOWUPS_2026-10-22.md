# Surface follow-ups — implementation and verification

The audit documents were treated as evidence. The requested follow-ups define the implementation scope.

## Delivered

- Dead CSS review: stable per-rule selection, unused-class annotations, accepted-subset patch, stale-review protection, automatic pre-commit diff, failed CI artifact, and a repeatable coverage-backed candidate report. See [review commands](DEAD_CSS_REVIEW.md). Deletions require explicit rule selection; this work does not blanket-accept candidates.
- Proposal printing: separate cover and document control, no first-page running header, measured long priced schedules with cumulative footers, repeated headers attached to body rows, and unsplit Word rows. Discovery exports share row protection and customer-only copy filtering.
- Wall survey: missing enclosure and termination block builder handoff unless a deliberate pre-survey override is selected. Proposal controls record missing values directly, and Installation Detail names incomplete links.
- Worksheet photos: drag-and-drop, individual reading progress and outcomes, with review audit visible on project detail.
- Wall engineering: datasheet panel-mass override and source attribution, survey load wording, ceiling/headroom elevation and mounting-height fix, recommended mapping adoption, mismatch guidance, saved snap history and undo.
- Saved walls: durable legacy ownership migration with counts, recorded project/template in schedules, orphan ownership repair, transport badges, persisted cable/segmentation fixes, and over-limit worksheet elevation marks.
- Pricing: template proposals accept equipment and installation rates directly, saved currency-specific installation rate cards seed proposals, and rep-only guidance appears beside empty customer sections.

## Validation

- Strict whole-application TypeScript check passed using `tsconfig.typecheck.json`.
- Production build passed. Existing large-chunk warnings remain.
- Size, architecture, style-drift and sales-language gates passed without baseline increases for this work.
- Focused wall, project persistence, survey, pricing, export, CSS review and pre-commit integration suites passed. Final wizard/rate-card/print-contract run: 36 tests passed.
- Chromium PDF checks passed for three long schedules with different leading content heights; they check cumulative footer values, header/body pairing and row integrity.
- Screen/DOCX/PDF proposal parity passed.
- Sample Word exports were rendered with LibreOffice (34 proposal pages and five discovery pages); cover, schedule and discovery pages were visually inspected.
- CI workflow behavior was checked locally with fixtures; a hosted GitHub Actions run was not triggered.

Printed pagination uses measured browser layout for priced schedules. Word uses repeating headers, keep-with-next header paragraphs and no-split rows; browser and Word page counts need not match.
