# Wingman Production Readiness Audit

Date: 2026-04-27

## Verdict

Wingman is not production-ready, but the active app is cleaner and safer than the 2026-04-18 audit state.

The current `Wingman2` client has a routed application shell, generated product index, standalone feature flows, canonical project workflow state, visible sync status, conflict preservation, editable project detail records, document extraction, dependency-aware proposal/BOM export, evidence capture, guided rep mode, recommendation feedback capture, browser smoke coverage, and authenticated backend management surfaces. Its core sales outputs are competitor replacement, one-off outcome SKU, and full room/tender BOM, but those outputs should not narrow the supporting tools. Guru remains a standalone real-time AV and WyreStorm technical assistant for product questions, terminology, architecture checks, and proposal support. Videowall Builder remains a visual learning tool for inexperienced AV sales users to understand LED/LCD wall architecture, signal flow, processing, transport, displays, and control before creating a recommendation. The main remaining gap is still production workflow depth: governed lifecycle/region validation, exact dependency data, branded PDF/DOCX generation, richer project history, and review/approval workflow.

## What Is Ready

- Canonical client runtime is isolated to `src/wingman2`.
- Route inventory and feature inventory are centralized.
- Build, typecheck, lint, dependency audit, route-manifest checks, and readiness checks pass.
- Local API starts and serves health, product intelligence, workspace/auth, and agent endpoints.
- Authoritative product sources live under `data-sources/` and compile into `data/wingman-canonical-product-store.json`.
- Legacy competitor live lookup routes require an authenticated workspace session and only fetch approved HTTPS vendor hosts.
- Guru provides real-time AV/WyreStorm technical Q&A from the local glossary, product index, rules, and local memory; external web lookup is disabled by default for privacy.
- Discovery, Finder, Ingest, Compare, and Proposal can share active project context without forcing every standalone action into a proposal.
- Discovery now uses application-specific ask-first guidance, explains why each question matters, and allows unknowns to remain validation items instead of forcing guesses.
- Project detail pages now expose editable requirement records so reps can review and correct the opportunity before SKU/BOM output.
- Ingest extracts PDF, DOCX, text, markdown, CSV, and email exports locally.
- Proposal exports customer-safe HTML and BOM CSV from WyreStorm product selections.
- Compare uses protected lookup plus scored match evidence when authenticated.
- Finder stores evidence and caution notes with product selections.
- Proposal adds output-purpose classification, governed dependency prompts with validation questions, governance warnings, validation notes, readiness scoring, and feedback capture.
- Sales Helper now includes guided rep mode and sales-motion guidance from active project context.
- Videowall Builder now teaches LED/LCD signal flow and processing decisions as a standalone learning tool as well as a proposal handoff path.
- Verification now includes workflow integration checks, and a Playwright browser smoke check is available.

## What Blocks Production

### Client workflow readiness

- Dashboard metrics are static.
- Projects uses local browser state with detail pages, editable requirement records, visible sync status, and local/newer-change preservation when backend data appears stale.
- Discovery saves local handoff context and canonical project workflow data when the user saves the brief, with application-specific question guidance for meeting rooms, walls, multi-zone venues, signage, control rooms, teaching spaces, and worship spaces.
- Finder recommendations are client-side scored from the generated product index with seeded fallback data.
- Compare uses saved discovery/Finder context, supports editable competitor lookup and scored match evidence through authenticated endpoints, and keeps standalone comparisons standalone when no project is active.
- Ingest parses PDF, DOCX, text, markdown, CSV, and email exports; legacy `.doc` remains unsupported.
- Proposal uses active project context, discovery, shortlist, ingest, and compare warnings; classifies the output as competitor replacement, outcome SKU, or room/tender BOM; generates a governed dependency-aware BOM; captures feedback; and exports proposal HTML plus BOM CSV.
- Videowall has path selection and visual source-to-display learning aids, but no true sizing, topology, or BOM engine.

### Backend truth and drift

- Active server routes live in `server/routes/agents.mjs`, while a second unused agent router still exists in `server/server/routes/agents.mjs`.
- Product intelligence and governance paths now use the canonical `data/` tree in readiness checks.

### Agent readiness

- `discovery`, `architect`, and `validate` are usable as heuristic pipeline steps.
- Guru is usable as the active in-app technical helper, independent of a project or proposal.
- `proposal`, backend `guru`, and `competitor` agent endpoints are still scaffold endpoints in the active server.
- Separate Gemini-backed agent code exists but is not the active runtime truth.

### Verification gaps

- `verify` checks typecheck, build, route manifest completeness, canonical data readiness, and workflow integration assertions.
- `check:browser` runs a Playwright smoke check against the built app.
- Deeper interaction tests for file upload, export button behavior, and authenticated workspace sync are still needed.

## Production Readiness By Feature

| Feature | Status | Assessment |
| --- | --- | --- |
| Dashboard | Partial | Routed and usable as a launcher, but metrics are static. |
| Projects | Partial | Local persistence with active project context, editable requirement detail pages, sync status, and conflict preservation. |
| Discovery | Partial | Structured guided capture saves to project workflow state and now explains application-specific question intent, but backend sync visibility is still missing. |
| Finder | Partial | Generated product index, scoring, evidence, and cautions exist, but exact accessory pairing still needs governed data. |
| Compare | Partial | Editable lookup, scored match evidence, and feedback capture are wired to protected backend endpoints and save only when an active project exists. |
| Templates | Wired | Standalone real-room boilerplates across verticals with pre-populated WyreStorm BOMs, editable quantities/include states, exports, project save, assumptions, upgrade paths, and by-others AV design scope. |
| Videowall | Partial | Interactive path selection plus visual LED/LCD signal-flow teaching, but detailed sizing/topology logic remains. |
| Sales Helper | Wired | Project-aware guided rep mode, sales-motion guidance, static positioning, and objection guidance. |
| Call Cards | Wired | Useful static call support module. |
| Ingest | Partial | PDF, DOCX, and text extraction persist requirements to active project context; legacy `.doc` remains unsupported. |
| Proposal | Partial | Active-project preview, output-purpose classification, governed dependency-aware BOM, readiness scoring, feedback capture, proposal HTML export, and BOM CSV export exist; branded PDF/document output remains. |
| Support | Wired | Useful audit and escalation hub, but no real escalation workflow. |

## Highest-Priority Remediation Order

1. Map edited project requirements back into discovery fields and add a guided legacy `.doc` conversion path.
2. Add branded PDF/document generation, proposal template selection, and approval workflow.
3. Connect exact accessory/dependency governance, lifecycle, and regional suitability before customer issue.
4. Add richer project history, review outcomes, and approval status.
5. Remove or archive duplicate backend agent surfaces and name one runtime truth.
6. Replace scaffold agent endpoints or remove them from the active product surface.
7. Add deeper browser tests for upload, export, authenticated sync, detail-page edits, and conflict states.

## Completed Remediation

Completed cleanup includes:

- canonical catalog/governance checks under `data/`
- public product index generation and readiness verification
- dependency audit cleanup
- authenticated legacy competitor lookup routes
- approved-host URL guard for legacy live lookup
- Guru external lookup disabled by default
- removal of misleading static Compare/Ingest/Proposal content
- shared project workflow state for saved discovery, product selections, ingest analysis, compare runs, and proposal previews
- editable project detail workspace with requirement records and readiness counts
- application-specific Discovery question guidance with ask-first, why-it-matters, and unknown-safe paths
- protected Compare lookup UI with standalone-safe behavior
- browser-side PDF/DOCX/text extraction
- proposal HTML and BOM CSV export
- scored competitor match evidence display
- evidence/caution storage on Finder selections
- governed dependency-aware BOM engine with sales-motion classification, trigger evidence, validation questions, governance warnings, and validation notes
- guided rep mode, sales-motion guidance, and recommendation feedback capture
- explicit Guru positioning as a standalone real-time AV/WyreStorm technical assistant
- explicit Videowall Builder positioning as a standalone visual AV learning tool for inexperienced sales users
- visible project sync status and conflict preservation
- workflow integration check and Playwright browser smoke check
