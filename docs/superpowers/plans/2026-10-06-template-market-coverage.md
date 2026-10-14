# Vertical market coverage implementation plan

**Goal:** Every published vertical has at least three distinct editable room templates, with no empty vertical markets.
**Architecture:** Add authored deployment designs in a separate market-coverage module using the existing BOM and concept generator. Assign existing artwork explicitly and retain measured site checks and specialist supplier scope.
**Tech stack:** TypeScript, Vitest, React/Vite.
**Spec:** User request, 6 October 2026: minimum one template per market, ideally several to cover each vertical.

- [x] Audit canonical market counts and application gaps.
- [x] Add four Energy and four Manufacturing/Logistics concepts; two Sports, two Broadcast and two Residential concepts; one Worship and one Transportation concept.
- [x] Register explicit existing image assignments and include the designs in the catalogue.
- [x] Add coverage tests for all canonical markets, unique IDs, valid room concepts and bounded hardware quantities; remove fixed historical catalogue-size assertions.
- [x] Run deployment, market, image/profile and schematic checks, strict typecheck and build; verify market counts in browser.
- [x] Synchronize changed files to the main checkout and document final counts and scope.
