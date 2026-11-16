# AV Design Intelligence Review and Corrections Implementation Plan

> **For agentic workers:** Execute this plan inline in the current isolated worktree. Treat already-dirty files as user work; preserve them and make only evidence-backed changes.

**Goal:** Improve Wingman's AV design intelligence so collected requirements, governed product evidence, topology, recommendations and proposal outputs form a traceable, technically defensible design workflow, and repair the known failing checks.

**Architecture:** Establish a reproducible failure and data-quality baseline, then audit the governed source-to-generated product pipeline and the Discovery-to-proposal design path. Use the current public AVIXA CTS-D exam outline and public standards descriptions as a process benchmark, not as a substitute for licensed standards or an AVIXA certification. Fix verified defects in small changes, add regression coverage at the owning boundaries, and publish a traceable gap report that distinguishes proven defects from questions requiring licensed standard or human engineering review.

**Tech Stack:** TypeScript, React, Vitest, Node.js governance checks, JSON/CSV source data, AVIXA public CTS-D and standards material.

**Spec:** User request in this Codex task; existing product and Discovery invariants in `AGENTS.md`, `docs/DISCOVERY.md`, `docs/RECOMMENDATIONS.md`, `docs/PROPOSAL_OUTPUT.md`, and `docs/QUALITY_GATES.md`.

## Global Constraints

- Preserve all existing uncommitted work and never reset, regenerate, or normalize governed data as a side effect of a check.
- Keep verified product facts distinct from inferred match reasons, defaults, estimates, assumptions, and by-others scope.
- An unknown, contradictory, unsupported, or unmeasured design input remains an explicit open check; never silently promote it to a confirmed design fact.
- Product eligibility and signal-path completeness must be grounded in structured technical evidence, lifecycle status, topology, and endpoint/port requirements.
- Reference current public AVIXA CTS-D duties and public summaries of applicable standards accurately; do not reproduce paid standard content or claim AVIXA certification/compliance.
- Do not run data writers, baseline updates, lifecycle reconciliation apply modes, or generated-index writers while establishing the baseline.

---

## File Structure

- `docs/superpowers/plans/2026-11-16-av-design-intelligence-review.md` — staged work and verification gates.
- `docs/audits/wingman-av-design-intelligence-review.md` — evidence-backed audit findings, AVIXA mapping, and unresolved scope.
- `tools/check-discovery-topology.mjs` — source-of-truth topology capture contract.
- `src/wingman2/lib/productSelectorEngine.ts` and related tests — product eligibility and candidate evidence boundary, only if the audit proves a defect there.
- `src/wingman2/lib/projectTopology.ts` and related tests — typed endpoint, transport, service, length and route facts, only if the audit proves a defect there.
- `src/wingman2/pages/discovery/discoveryQuestions.ts`, `discoveryQuestionCatalog.ts`, `discoveryTypes.ts`, `discoveryBriefBuilder.ts`, and related tests — question capture and storage boundary, only if the audit proves a defect there.
- `src/wingman2/features/recommendations/application/buildRecommendation.ts`, related evidence/safety modules and tests — complete proposed path and validation boundary, only if the audit proves a defect there.
- `src/wingman2/lib/schematic/` and proposal generation modules — diagram/BOM/document handoff, only if the audit proves a defect there.
- Existing governed product sources under `data-sources/wyrestorm/`, `data/governance/`, `data/catalog/`, and the public generated index — inspect first; edit only the canonical owner and regenerate only when explicitly required by an implemented data correction.

## Task 1: Preserve and classify the current baseline

**Files:** no product code changes; capture results in the audit report.

- [x] Record the first full-suite result and typecheck result from the current worktree.
- [ ] Re-run the full suite to JSON and extract every failing test and failed suite into a stable, readable summary.
- [ ] Group each failure as implementation defect, data drift, stale assertion, environment/import failure, or unrelated existing issue. Include exact file/test names and evidence; do not change expectations solely to turn the suite green.
- [ ] Record relevant passing gates: typecheck, Product Selector tests, Product Workspace tests, product-matching scenarios, technical-data coverage, and the failing Discovery topology check.

## Task 2: Repair the confirmed stale topology gate

**Files:**
- Modify: `tools/check-discovery-topology.mjs`
- Test: `npm run check:discovery-topology`

- [ ] Verify that the canonical `locations-connections` question is defined in `src/wingman2/pages/discovery/discoveryQuestionCatalog.ts` and consumed through `discoveryQuestions.ts`.
- [ ] Change the gate to inspect the canonical catalog file for the `locations-connections` definition; keep the consumer-wiring assertions against `discoveryQuestions.ts` and `DiscoveryExpertBuilder.tsx`.
- [ ] Run `npm run check:discovery-topology` and confirm the gate reports all checks passing.

## Task 3: Audit governed product data and derived evidence

**Files:**
- Create/update: `docs/audits/wingman-av-design-intelligence-review.md`
- Inspect only initially: `data-sources/wyrestorm/products.csv`, `data-sources/wyrestorm/enrichment.json`, `data/governance/wyrestorm-technical-profiles.json`, schemas, technical/transport registries, generated catalog and `public/product-intelligence-*`.
- Modify source/generator/tests only when a specific defect is proven.

- [ ] Trace canonical product records through normalization, lifecycle, structured technical profiles, generated technical evidence, selector profiles and public indexes.
- [ ] Compare SKU identity and lifecycle across inputs; report duplicates, aliases, orphan records, missing active profiles, stale profiles, and generated/source mismatch separately.
- [ ] Validate physical ports/directions/counts, formats/resolution/rates, audio/video/control/USB/network capabilities, transport reach and limits, PoE/PoH, accessories/dependencies, and required third-party components against cited source evidence.
- [ ] Separate evidence coverage from evidence confidence and freshness. Never convert a draft or stale profile into verified evidence merely to satisfy a test.
- [ ] Run the read-only data checks and record their output without updating baselines.

## Task 4: Audit requirements capture and design completeness

**Files:**
- Inspect: `src/wingman2/pages/discovery/`, `discoveryBriefBuilder.ts`, `projectTopology.ts`, `discoverySystemDesign.ts`, `recommendationEvidence.ts`, `recommendationSafetyGate.ts`, `features/recommendations/`, `projectToSchematicBrief.ts`, and proposal renderers.
- Create/update: `docs/audits/wingman-av-design-intelligence-review.md`.
- Add regression tests at the smallest owning pure-function/UI boundary for each confirmed gap.

- [ ] Trace each user need from the customer question to a stored requirement, topology fact, product/system role, signal path, validation check, BOM, proposal drawing and handover artifact.
- [ ] Check source/destination counts, physical vs logical endpoints, port direction and quantity, connector/format compatibility, routing mode, signal conversion, audio extraction/destination, control/data/network, power, cable/path length and measured/estimated/unknown status.
- [ ] Check multi-room, display/wall, UC/camera, USB/KVM, audio, live-stream, AV-over-IP, redundancy/resilience, rack/thermal/power, mounting, sightline/acoustics, accessibility, code/authority, IT/security and by-others boundaries for conditional questions and explicit exclusions.
- [ ] Ensure contradictions, unresolved dependencies, unsupported device claims, and unknown site conditions prevent false-ready outputs and appear in Resolve/validation/proposal deliverables.
- [ ] Test representative end-to-end room archetypes from stored brief through system design and rendered proposal, including at least one networked path and one path with unresolved physical/site data.

## Task 5: Compare workflow against AVIXA public CTS-D and standards framework

**Files:**
- Create/update: `docs/audits/wingman-av-design-intelligence-review.md`
- Modify product workflow only where a gap is supported by evidence and matches current scope.

- [ ] Map current workflow to the CTS-D public outline: needs assessment (functional requirements, client technology plan, program report); coordination with architecture/interior, structural, MEP, IT/security, acoustics, life safety and project-specific professionals; conceptual/final design and documentation; execution support, verification and closeout.
- [ ] Compare project records and exported documents with public descriptions for D401.01 documentation, D402.02 performance verification, rack design/buildup, cable labeling, and relevant acoustic/video/system standards where applicable.
- [ ] Clearly mark normative standard text as licensed when not publicly available; use public descriptions and CTS-D competency structure as references only.
- [ ] Prioritize gaps by risk to safety, compatibility, installation, usability, quote/proposal truthfulness and supportability; identify where a qualified AV designer, IT, MEP, acoustic, structural or AHJ review is mandatory.

## Task 6: Implement evidence-backed fixes and close the failing checks

**Files:** only those named by confirmed findings in Tasks 1–5, plus their tests and the audit report.

- [ ] Add a regression test for each verified behavior/data-boundary defect before changing its implementation.
- [ ] Fix the owning source, model, selector, completeness validator, workflow, exporter, or check rather than adding a UI-only warning that leaves the system design wrong.
- [ ] For stale tests, update expectations to the current agreed UX only after confirming the behavior is intentional and preserving meaningful coverage.
- [ ] Re-run focused tests and gates per fix, then typecheck; rerun the full suite after all scoped fixes.
- [ ] Update the report with fixed, remaining, and human-review findings and exact command results.

## AVIXA public references to use

- CTS-D certification and duties: `https://www.avixa.org/training-certification/certification/cts-d-certification`
- CTS-D 2025 candidate handbook and public exam outline: `https://cdn.avixa.org/production/docs/default-source/default-document-library/cts-d_handbook_2025.pdf`
- Standards catalog and public descriptions: `https://www.avixa.org/resources/standards/published-standards`
- Standards guidelines, including Audiovisual Best Practices and Performance Verification Guide: `https://www.avixa.org/resources/standards/standards-guidelines`
