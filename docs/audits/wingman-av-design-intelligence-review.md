# Wingman AV design intelligence review

**Review date:** 2026-11-16
**Baseline commit:** `8003c62e` (`feat: strengthen Wingman product and design workflows`)
**Scope:** Product evidence and delivery, requirements capture, topology and proposal validation, AVIXA public CTS-D and standards framework.
**Status:** First-pass review complete; several system-level gaps remain before Wingman can claim a complete, technically validated AV design.

## Executive findings

Wingman has useful foundations: structured Discovery questions, persisted needs and open checks, governed technical profiles, lifecycle gating, source attribution, scenario checks, topology capture and a proposal validation boundary. The weak point is end-to-end design assurance. Requirements, governed device ports, graph edges, product selection, reach/power checks and exported artifacts are not yet joined through one traceable, typed design model. As a result, an internally consistent-looking product list or proposal can still omit physical endpoint compatibility, route completeness, site dependencies, or verification evidence.

The user-provided 2009 AV project document is treated only as a sample of project documentation structure. Its contents are not treated as instructions or as current technical authority.

## Corrections completed in this review

### Product semantic integrity

The semantic-data repair path had been treating every `Nx optical` phrase as an SFP/fibre interface. This both rejected valid fibre ports described as `1x Optical IN/OUT` and failed to model camera zoom correctly. The rule now recognizes optical zoom wording specifically. The source repair removed six camera zoom records that had been misrepresented as SFP ports. Public WyreStorm pages identify the camera outputs and separately describe the optical zoom lens; for example, the CAM-210-NDI-PTZ lists USB, HDMI and network outputs, while CAM-420-PTZ identifies 3x optical zoom as a lens capability. ([CAM-210-NDI-PTZ](https://www.wyrestorm.com/global/product/cam-210-ndi-ptz/), [CAM-420-PTZ](https://www.wyrestorm.com/product/cam-420-ptz/))

The HDMI splitter gate was counting any port whose evidence text mentioned HDMI. For the SP-0108-SCL, one HDMI output evidence string also describes Phoenix and S/PDIF audio de-embed outputs, inflating the HDMI count from eight to nine. It now counts video-category HDMI connectors only. Confirmed fixed splitters were rebuilt with 1 input and the documented physical outputs; their outputs are mirrored and their independently routed output count is zero. The canonical product store and public product index were regenerated from the corrected sources. WyreStorm describes SP-0108-SCL as one input and eight HDMI outputs with separate audio de-embedding. ([SP-0108-SCL](https://www.wyrestorm.com/product/sp-0108-scl/))

The repair utility also had a data-loss edge case: it replaced a source connector summary with an empty array when a record had no structured port inventory. This was corrected so absence of structured ports does not erase independent source metadata. Forty valid connector summaries were recovered from the pre-repair source snapshot; seven values that were false, non-connector text or inappropriate for the record were left excluded. The regenerated catalog and full suite were checked after this recovery.

### Stale Discovery topology gate

The previously repaired topology gate passes: `npm run check:discovery-topology` reports 10 tests passed and 15 structural checks passed. It now reads the canonical question catalog rather than expecting the question definition in its consumer module.

## High-risk design assurance gaps

### P1 — Port-level signal-path validation is absent

`ProjectDevice` stores product role, SKU and quantity, but no governed port inventory. Connection endpoints can contain free-text port labels, service, transport and length; normalization checks identity and enums but does not resolve the selected SKU to its governed ports or compare direction, count, connector, signal format, resolution/rate, audio/USB/control/network service, power or conversion requirements.

**Effect:** Wingman can represent a route without establishing that the chosen source output connects to the chosen destination input or that intermediate equipment performs the required conversion, scaling, extraction, extension or routing. The design graph should bind each endpoint to an installed device instance and a specific port; unsupported or unknown compatibility must remain an open check.

### P1 — Proposal readiness does not consume topology completeness

`validateProposalExport` validates discovered requirements and route-agnostic lifecycle/power/reach/chain conditions, but does not consume a complete topology validation result or require a trace from each required use case to signal path and BOM. Its `allowed` boolean can therefore be true while the graph lacks enough physical detail to prove compatibility.

**Effect:** Proposal export readiness can be misread as design readiness. Separate administrative/export eligibility from engineering readiness, and make unresolved compatibility, dependency, route and site checks visible in the validation summary and exported proposal.

### P1 — Reach validation is project-wide rather than path-specific

The current reach validator aggregates maximum video/USB lengths across all connections and checks product profile text across products rather than associating a transport limit with the specific product pair and edge. That can cross-contaminate unrelated routes and cannot reliably validate a route with multiple cable segments or an extender pair.

**Effect:** A project can receive false warnings or miss a route-specific reach violation. Validate every edge/segment against the exact transmitting and receiving product ports, supported transport, cable class, rated reach and relevant format/rate. Record whether length is measured, estimated or unknown.

### P1 — Extender chain detection is too coarse

Chain completeness is based on transmitter/receiver SKU text and does not require a compatible series, matching pair, quantity, port binding or graph reachability. It cannot establish a complete signal chain.

### Product detail delivery collision — corrected

The public summary has 347 products. The earlier detail manifest collapsed six pairs of distinct cable SKUs when punctuation was stripped, including `EXP-4KUHD-0.5` / `EXP-4KUHD-05` and `EXP-8KUHD-0.5` / `EXP-8KUHD-05`. The generator now emits collision-safe detail keys with the exact SKU in the manifest, and runtime hydration, cache keys and selector ranking prefer exact SKU matches. Regression coverage checks that collision pairs retain independent details. The regenerated manifest now covers all 347 products.

### P2 — Search candidate ranking needs role-first relevance review

Product matching scenario checks pass, but the “NetworkHD multiview” and “Dedicated LCD video wall processors” scenarios return broad controller/rack candidates ahead of dedicated product-role matches. Review whether matching relevance gives enough weight to explicit system role and intent before general text overlap. This is an observed ordering concern, not yet a confirmed selector logic defect.

## Governed evidence status

- Read-only source parity passes: 347 WyreStorm product, lifecycle and enrichment rows; generated canonical store and summary each contain 347 products.
- Technical-data coverage is 154/174 verified active-lead SKUs. Twenty now require human review; none are missing profiles. This reflects the explicit review-required state for APO-SKY-MIC, EX-80-KVM and the two KVM H2 records; do not promote them to verified to satisfy a gate.
- The catalogue reports 178 specifiable lead products: 157 verified, 21 review-required.
- 113 human-verified profiles are older than the 60-day warning threshold; none exceed the 120-day fail threshold. Schedule refresh based on product criticality and change risk.
- `enrichment-status.json` still reports 344 products from 2026-11-12 while the checked source and generated catalogue contain 347. Refresh this metadata through its owning source-generation path.
- `PSU-12V-3A` and adjacent PSU records were corrected from cable/RJ45 metadata to power accessory records with power outputs grounded in WyreStorm's product pages. `PSU-12V-3A` remains do-not-spec, so it is not eligible for normal selection. ([official PSU-12V-3A page](https://www.wyrestorm.com/product/psu-12v-3a/), [PSU-20V-6A-BOX](https://www.wyrestorm.com/product/psu-20v-6a-box/), [PSU-20V-6A-WP](https://www.wyrestorm.com/product/psu-20v-6a-wp/))
- `EX-80-KVM` was reconciled from a legacy/discontinued identity to the current WyreStorm product and corrected for separate HDMI/video, USB and HID reach limits, USB 2.0 support, PoC and supplied power. Its governed profile is now review-required pending human confirmation. Independently sourced connector metadata is retained when the structured port inventory is empty; EX-100-G2's verified ports were restored after the first repair pass exposed that overwrite defect. ([official EX-80-KVM page](https://www.wyrestorm.com/product/ex-80-kvm/))
- `APO-SKY-MIC` was corrected from a false video/network device to a companion ceiling microphone. The RJ45 input/output are a proprietary mic cascade link, USB-C is for firmware only, and the device is powered by APO-VX20-UC or COM-MIC-HUB. The governed profile is now review-required with explicit ports and warnings; no reviewer sign-off was fabricated. ([official APO-SKY-MIC page](https://www.wyrestorm.com/product/apo-sky-mic/))
- The `EX-40-KVM-H2` and `EX-100-KVM-H2` records now point to their exact official pages, correcting a source URL that had pointed both at EX-100-KVM. Their structured I/O and USB/reach/PoC facts were reconciled to the matching pages. Their governed profiles are review-required pending human confirmation. ([EX-40-KVM-H2](https://www.wyrestorm.com/product/ex-40-kvm-h2/), [EX-100-KVM-H2](https://www.wyrestorm.com/product/ex-100-kvm-h2/))
- `MX-0402-MST-V2` gained the missing four USB 3.2 device ports, dual RJ45 Ethernet, RS-232 and GPIO in its enrichment and governed profile. It remains review-required pending human confirmation. ([official MX-0402-MST V2 page](https://www.wyrestorm.com/product/mx-0402-mst-v2/))
- Additional official-page checks corrected `CON-H2-EDID`'s analog audio/coax S/PDIF outputs; clarified `CON-H2-SCL`'s USB-A firmware port and optical S/PDIF; corrected `IDB-400-MS`'s mains/RJ45 pass-through and charging ports; removed fixed HDMI assumptions from the customer-module `IDB-400-MS-C`; and added the missing DVI-D side of the `EXP-HDMI-DVI` adapter. Exact-source summaries were also corrected for the two KVM H2 models. No review dates were advanced for products whose exact source could not be established.
- Barco CX-50 Gen2 was corrected against its current manufacturer page: HDMI 2.1 and rear USB-C DP Alt video outputs, front USB-C DP Alt input, and 2.5GbE. Unsupported chroma assertions and stale HDMI 1.4 limitations were removed. ([Barco CX-50 Gen2](https://www.barco.com/en/product/clickshare-cx-50-gen2))
- Eight competitor rows were re-read and corrected from official sources: AT-OME-MS42 and AT-OMNI-112; AT-OME-PS62 and AT-OMNI-111; AT-UHD-EX-100CE-KIT; Crestron DM-NVX-E30; Extron IN1608 xi; and HD-MD4X2-4KZ-E facts were confirmed. Corrections cover port counts, per-output video modes, PoE+, codec and removal of unsupported fixed reach/codec claims. Their overdue baseline pins were removed after re-review. ([Atlona OME-MS42](https://ts.atlona.com/product/ome-ms42/), [Atlona OMNI-112](https://ts.atlona.com/product/at-omni-112/), [Crestron DM-NVX-E30](https://www.crestron.com/Products/Catalog/AV-Over-IP/DM-NVX-AV-Over-IP/Video-Endpoint/DM-NVX-E30), [Extron IN1608 xi](https://www.extron.com/product/in1608xi))
- Competitor evidence remains aged: 342/354 records exceed 60 days and 109 exceed 120 days; 106 overdue, unpinned records still fail the aging gate. Three pinned SKUs (Extron NAV D 501 and Lightware VINX-110-HDMI-ENC / VINX-210AP-HDMI-DEC) remain unresolved because current official sources did not establish those exact identities. Only records whose manufacturer evidence was actually re-read had review dates advanced.
- The product database audit emits 26 issue rows; these require triage. Some are differences between classification axes rather than wrong device facts. For example, the NHD-0401-MV is specifically a NetworkHD multiview product, so a broad AVoIP expectation is not sufficient evidence of a defect. ([NHD-0401-MV](https://www.wyrestorm.com/product/nhd-0401-mv/))

## CTS-D and AVIXA public-framework crosswalk

AVIXA describes CTS-D work as assessing client needs, designing AV solutions, coordinating and documenting responsibilities, verifying systems and closing projects. Its 2026-updated prep material names needs analysis, implementation activities, allied-trade collaboration, AV designs, drawing/documentation, and audio, video and network systems. This review uses those competencies as a workflow benchmark, not a certification claim. ([CTS-D certification](https://www.avixa.org/training-certification/certification/cts-d-certification), [CTS-D prep updated in 2026](https://www.avixa.org/training-certification/courses/cts-d-prep-virtual-classroom-october-2026))

| AVIXA competency / public standards description | Current Wingman evidence | Review direction |
|---|---|---|
| Needs assessment and client requirements | Discovery stores room, use case, decisions and missing information; brief builder preserves some open checks | Add traceability from each client outcome to acceptance criterion, signal path, design decision, BOM line and verification item. Capture priorities, budget, operation, accessibility, future change and acceptance authority. |
| Coordination with allied trades | Site/IT questions and by-others boundaries exist in the workflow | Add conditional coordination register for architecture/interiors, structural, MEP/electrical, IT/security, acoustics, lighting, life safety and the AHJ. Record owner, dependency, due point and approval/evidence. |
| Conceptual/final design and project documentation | Schematic and proposal output exist; the topology model does not prove port compatibility | Maintain one source-of-truth design model for devices, ports, connections, cable segments, routes, assumptions, site conditions, dependencies, BOM and revisions. Distinguish concept from issued design. |
| D401.01 documentation framework | Proposal and project records exist, but no evidence was found that deliverable responsibility and delivery status are consistently tracked | Track required documents, owner, status, revision, due date and handover acceptance against the project. AVIXA's public description frames D401.01 around documentation requirements, responsibility and delivery tracking. ([catalog](https://www.avixa.org/resources/standards/published-standards)) |
| Rack planning and facility integration (F502.02:2020, reaffirmed 2023) | Product/rack items can be represented, but whole rack power, thermal, space, service clearance and facility constraints are not established from the graph | Add rack elevation/space, weight, heat, electrical circuit/load, ventilation, service access, cable management and facility coordination checks; require MEP/site evidence where applicable. ([catalog](https://www.avixa.org/resources/standards/published-standards)) |
| Cable labeling (F501.01:2015) | Cables may appear in BOM/visualization but there is no project-wide cable identifier and label schedule proven in the reviewed path | Generate cable IDs and endpoint labels from validated connections and include schedule in installation/handover. Check licensed standard for exact requirements. ([catalog](https://www.avixa.org/resources/standards/published-standards)) |
| D402.02:2013 reaffirmed 2024 performance verification | Verification exists as a proposal validation idea; criteria, timing, measures, test evidence and reports are not bound to requirements in the design model | Define project-specific verification items, criteria, timing, accountable party, instrument/method, results, exceptions and sign-off. AVIXA's public description explicitly concerns what is verified, when, metrics/criteria and reporting. ([verification description](https://www.avixa.org/resources/standards/av-systems-performance-verification)) |
| Audio/video/network system performance | Product compatibility can be inferred from text; no full acoustic/display/network acceptance model was established | Require qualified calculations and site-specific criteria for coverage, intelligibility, SPL, display size/viewing, contrast, network capacity/QoS/multicast/security and latency where applicable. Use current relevant AVIXA standards and licensed text. |
| Implementation support and closeout | Proposal outputs can describe products, but as-built topology, final settings/programming, training, test records, manuals and accepted exceptions are not consistently traced | Treat closeout package completeness as a deliverable gate separate from product selection and quote generation. |

AVIXA publicly lists D401.01:2023, D402.02:2013 (R2024), F501.01:2015, F502.02:2020 (R2023), A102.01:2022, V201.01:2021, and A104.01 among published standards. The catalog provides descriptions, not the complete normative clauses. The exact applicable edition and licensed text must be checked for any formal standards claim. ([AVIXA standards catalog](https://www.avixa.org/resources/standards/published-standards))

## Required professional review boundaries

Wingman should identify and route decisions to a qualified AV designer/integrator and relevant specialist. It should not infer approval for structural loading/attachment, electrical circuits, fire/life-safety interfaces, code/AHJ acceptance, acoustic performance, accessibility obligations, network/security policy, or construction conditions. Where a site walk, measurement, calculation, network test, manufacturer confirmation or authority approval is needed, the design remains unresolved until that evidence is captured.

## Verification performed in this pass

| Command | Result |
|---|---|
| `npm run check:product-semantic-integrity` | Pass after source and rule correction |
| `npm run check:discovery-topology` | Pass: 10 tests, 15 structural checks |
| `npm run data:sources:check` | Pass: 347 WyreStorm products; 354 competitors |
| `npm run check:product-semantic-integrity` | Pass |
| `npm run check:governance-data` | Pass: 220 profiles and 197 remaining attributed sign-offs are internally consistent |
| `npm run check:technical-data` | Fail: 4 profiles are overdue for human confirmation (EX-40-KVM-H2, EX-100-KVM-H2, EX-80-KVM and APO-SKY-MIC); they remain review-required rather than receiving invented sign-offs |
| `npm run wm:check-routed-io` | Pass: 64 matched records, 0 mismatches |
| `npm run check:competitor-intelligence` | Pass |
| `npm run check:competitor-evidence-aging` | Fail: 106 records exceed the configured age threshold; three unresolved SKU identities remain pinned |
| `npx vitest run src/wingman2/lib/blindRecommendationAcceptance.test.ts src/wingman2/features/design-project/designProjectScenarios.test.ts` | Pass: 9 tests; restored EX-100-G2 source ports resolve both prior recommendation failures |
| `npm test -- --reporter=json --outputFile=reports/av-intelligence-test-results-final.json` | Pass: 1,625/1,625 suites; 4,960 passed, 0 failed, 1 pending |
| `npx tsc --noEmit -p tsconfig.typecheck.json` | Pass |
| `git diff --check` | Pass |

## Remaining work, in priority order

1. Replace project-wide reach and coarse extender checks with edge-to-edge route validation using governed port and transport constraints.
2. Make topology completeness and verification status first-class inputs to proposal engineering readiness; preserve a separate export/quote eligibility state.
3. Build requirement-to-design-to-BOM-to-drawing-to-test traceability and a project deliverable register aligned with the AVIXA public framework.
4. Resolve the 20 review-required lead profiles (four are overdue for human confirmation) and refresh aged profiles, starting with the highest risk signal-path/network/power dependencies; independently refresh the 106 aged competitor records from current manufacturer evidence and establish the three pinned exact-SKU identities.
5. Run representative end-to-end archetypes (networked AV, USB/KVM, multi-display distribution, room audio, control, and unresolved site dependencies) after the model changes; then rerun the full suite.

**Standards limitation:** This is an engineering workflow gap review using AVIXA public competency and catalog descriptions. It is not a CTS-D assessment, licensed standards interpretation, stamped design, code review, or AVIXA compliance certification.
