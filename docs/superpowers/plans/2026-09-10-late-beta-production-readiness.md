# Wingman Late-Beta Production-Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close all eight findings from the late-beta assessment and produce a release-evidence pack suitable for a v1.0 go/no-go review.

**Architecture:** Treat each finding as an independently reviewable tranche. Keep governed source data authoritative, derive runtime/public artefacts through existing generators, add behavioural acceptance coverage at the decision boundary, and reserve rendered/browser evidence for workflows whose risk cannot be proven with component tests alone.

**Tech Stack:** TypeScript 5, React, Vitest, Node.js ESM, Playwright, Vite, JSON/CSV governed data, browser DOCX generation, browser print-to-PDF.

**Spec:** `docs/superpowers/specs/2026-09-10-late-beta-production-readiness.md`

## Global Constraints

- Preserve fail-closed recommendation, comparison, and proposal-export behaviour.
- `data/governance/wyrestorm-technical-profiles.json` is the hand-reviewed authority; regenerate derived stores rather than hand-editing generated/public copies.
- Run the real strict typecheck with `npm run typecheck`.
- Run server tests with Vitest, not raw `node --test`.
- Do not raise size-budget or style-drift baselines without the exception process in `docs/SIZE_BUDGETS.md`.
- Avoid sales-language gate terms in source, test comments, and CSS comments.
- On Windows, terminate native Node processes with `Stop-Process`, confirm ports are free, and keep server stdout/stderr in separate files.
- If execution occurs in a Codex worktree, copy changed files to `C:/Users/steve/wingman` and prove both copies are byte-identical.

## File Structure

- `data/governance/wyrestorm-technical-profiles.json`: authoritative corrected connector/category records.
- `tools/lib/product-port-semantics.mjs`: reusable port-semantic predicates shared by checks and tests.
- `tools/check-product-semantic-integrity.mjs`: scans authoritative and published datasets and reports SKU/source failures.
- `tools/check-product-semantic-integrity.test.mjs`: regression tests for Phoenix, Euroblock, terminal-block, TRS, and legitimate RJ45 cases.
- `src/wingman2/lib/projectTopology.ts`: structured connection lengths and route classification.
- `src/wingman2/lib/dependencyGovernance.ts`: dependency decisions based only on applicable point-to-point path length.
- `src/wingman2/lib/projectTopology.test.ts` and `src/wingman2/lib/dependencyGovernance.test.ts`: distance regression coverage.
- `data/wingman-real-av-scenarios.json`: customer-requirement fixtures with expected architecture/BOM outcomes.
- `tools/check-wingman-recommendation-scenarios.mjs`: executes blind scenarios through the recommendation boundary.
- `src/wingman2/lib/roomTemplates.ts`: explicit shared-content assumptions for three templates.
- `tools/check-template-signal-path.mjs`: turns explained ratios into passing evidence while preserving unexplained warnings.
- `e2e/production-critical-workflows.spec.ts`: real-browser critical-path suite.
- `e2e/offline-reconnect.spec.ts`: browser contexts exercising offline edits, reconnect, and conflict behaviour.
- `e2e/proposal-output-parity.spec.ts`: screen/DOCX/PDF fixture capture.
- `tools/check-proposal-output-parity.mjs`: semantic parity assertions and evidence manifest.
- `src/wingman2/data/uiMode.tsx`, `src/wingman2/components/UiModeToggle.tsx`, `src/wingman2/pages/DiscoveryPage.tsx`, and `src/wingman2/pages/discovery/DiscoveryGuidedInterview.tsx`: canonical user-facing terminology.
- `docs/release-evidence/late-beta-v1-candidate.md`: accumulated run commands, results, screenshots, device matrix, and residual risks.

---

### Task 1: Correct analogue-audio connector authority and widen the semantic gate

**Files:**
- Create: `tools/lib/product-port-semantics.mjs`
- Create: `tools/check-product-semantic-integrity.test.mjs`
- Modify: `tools/check-product-semantic-integrity.mjs`
- Modify: `data/governance/wyrestorm-technical-profiles.json`
- Regenerate: `data/wingman-canonical-product-store.json`
- Regenerate: `data/product-intelligence-db.json`
- Regenerate: `public/product-intelligence-index.json`
- Regenerate: `src/wingman2/lib/__fixtures__/productIntelligenceIndexSample.json`

**Interfaces:**
- Consumes: governed port objects shaped as `{ connector, category, detail?, evidence? }`.
- Produces: `isAnalogueAudioEvidence(text: unknown): boolean` and `isEthernetConnector(text: unknown): boolean`; a gate that scans both the governed authority and every published derivative.

- [ ] **Step 1: Write failing predicate tests**

```js
import { describe, expect, it } from "vitest";
import { isAnalogueAudioEvidence, isEthernetConnector } from "./lib/product-port-semantics.mjs";

describe("product port semantics", () => {
  it.each([
    "1 x Line In (balanced)",
    "1 x Line Out (balanced, max +4 dBu)",
    "1x 5-pin Phoenix Female | unbalanced | Left and Right channels output",
    "1x 3-pin Phoenix Female | Balanced Input",
    "1x 3.5 mm TRS jack connector, Analog audio output",
    "Euroblock balanced terminal output",
  ])("recognises analogue audio evidence: %s", (text) => {
    expect(isAnalogueAudioEvidence(text)).toBe(true);
  });

  it.each(["RJ45 / Ethernet", "RJ-45", "10GbE 8-pin RJ45"])("recognises Ethernet connectors: %s", (text) => {
    expect(isEthernetConnector(text)).toBe(true);
  });

  it("does not classify a microphone transport RJ45 as analogue solely from its purpose", () => {
    expect(isAnalogueAudioEvidence("RJ45 | connect and power the ceiling microphone")).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test and verify the new module is missing**

Run: `npx vitest run tools/check-product-semantic-integrity.test.mjs`

Expected: FAIL because `tools/lib/product-port-semantics.mjs` does not exist.

- [ ] **Step 3: Implement focused predicates**

```js
const text = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

export function isEthernetConnector(value) {
  return /\b(?:rj-?45|ethernet|\d+g?be)\b/i.test(text(value));
}

export function isAnalogueAudioEvidence(value) {
  const valueText = text(value);
  const analogueFunction = /\b(?:analogue|analog|balanced|unbalanced|line\s*(?:in|out|input|output)|audio\s*(?:in|out|input|output))\b/i.test(valueText);
  const analogueTermination = /\b(?:phoenix|euroblock|terminal\s*block|trs|xlr|3\.5\s*mm|[2345]-?pin)\b/i.test(valueText);
  return analogueFunction && analogueTermination;
}
```

- [ ] **Step 4: Correct the three governed profiles**

Apply these exact semantic corrections while retaining counts, directions, and evidence text:

- `AMP-2120`: change balanced Line In and Line Out connectors from `RJ45 / Ethernet` to `Phoenix / Euroblock` and categories from `network` to `audio`.
- `COM-MIC-HUB`: change the 5-pin Phoenix outputs and 3-pin Phoenix balanced input from `RJ45 / Ethernet` to `Phoenix / Euroblock`; keep category `audio`. Keep the ceiling-microphone RJ45 record as `RJ45 / Ethernet` because its physical connector really is RJ45.
- `NHD-600-E-TXRX`: change the 3.5 mm analogue output from `RJ45 / Ethernet` to `3.5 mm TRS`; keep category `audio`. Also correct the 3.5 mm analogue-output row currently labelled `HDMI` to `3.5 mm TRS` so the same defect class is fully removed.

- [ ] **Step 5: Extend the checker to scan governed profiles and use the predicates**

Add `data/governance/wyrestorm-technical-profiles.json` to the source loop via a `profiles` branch in `payloadArray`. Replace the narrow `5-pin balanced audio` regex with this invariant:

```js
if (isAnalogueAudioEvidence(combined) && isEthernetConnector(connector)) {
  fail(rel, sku, `Analogue audio termination is still Ethernet/RJ45: ${combined}`);
}
if (lower(port.category) === "network" && isAnalogueAudioEvidence(combined)) {
  fail(rel, sku, `Analogue audio termination still has network category: ${combined}`);
}
```

- [ ] **Step 6: Run the focused tests and semantic check**

Run: `npx vitest run tools/check-product-semantic-integrity.test.mjs`

Expected: PASS.

Run: `npm run check:product-semantic-integrity`

Expected: FAIL until derived data is regenerated, proving stale public records are detected.

- [ ] **Step 7: Regenerate canonical and public data**

Run: `npm run data:canonical-products`

Run: `npm run data:product-intelligence-index`

Do not manually edit generated JSON. Review `git diff --stat` and `git diff -- data/governance/wyrestorm-technical-profiles.json tools/check-product-semantic-integrity.mjs tools/lib/product-port-semantics.mjs` before accepting generator output.

- [ ] **Step 8: Verify all customer-facing derivatives**

Run: `npm run check:product-semantic-integrity`

Run: `npm run check:technical-data`

Run: `npm run check:call-card-profile-consistency`

Run: `npm run check:governed-coverage-render`

Expected: all PASS and no targeted SKU contains an Ethernet connector on a Phoenix/Euroblock/TRS analogue-audio row.

- [ ] **Step 9: Commit the first independently releasable tranche**

```bash
git add data/governance/wyrestorm-technical-profiles.json data/wingman-canonical-product-store.json data/product-intelligence-db.json public/product-intelligence-index.json src/wingman2/lib/__fixtures__/productIntelligenceIndexSample.json tools/check-product-semantic-integrity.mjs tools/check-product-semantic-integrity.test.mjs tools/lib/product-port-semantics.mjs
git commit -m "fix(data): correct analogue audio connector semantics"
```

### Task 2: Make cable-distance decisions location-aware

**Files:**
- Modify: `src/wingman2/lib/projectTopology.ts`
- Modify: `src/wingman2/lib/dependencyGovernance.ts`
- Modify: `src/wingman2/data/workflowHandoff.ts`
- Test: `src/wingman2/lib/projectTopology.test.ts`
- Test: `src/wingman2/lib/dependencyGovernance.test.ts`
- Test: `src/wingman2/data/workflowHandoff.buildDiscoveryBriefFromState.test.ts`

**Interfaces:**
- Consumes: `ProjectConnection` records with endpoints, transport, `lengthMode`, and `lengthMetres`.
- Produces: `ProjectConnectionScope = "local-patch" | "endpoint-route" | "infrastructure"` and `projectTopologyDistanceSummary(topology)` returning `{ localPatchMaxMetres, endpointRouteMaxMetres, infrastructureMaxMetres }`.

- [ ] **Step 1: Add failing topology tests** proving a 2 m source-to-encoder HDMI patch plus 70 m AV-network infrastructure returns `localPatchMaxMetres: 2` and `infrastructureMaxMetres: 70`.
- [ ] **Step 2: Add `scope` to `ProjectConnection`**, infer `local-patch` for same-location device links, `infrastructure` for AV-over-IP/shared network/fibre between network or building locations, and `endpoint-route` for point-to-point room links.
- [ ] **Step 3: Implement `projectTopologyDistanceSummary`** by reducing confirmed/estimated lengths independently per scope rather than taking a global maximum.
- [ ] **Step 4: Replace `distanceMetresFromInput`'s first-number text parse** with structured topology distances when available; only local/endpoint routes may trigger point-to-point HDMI/HDBaseT dependencies, while infrastructure distance may influence fibre/network architecture.
- [ ] **Step 5: Add the assessed higher-education regression** with 3 encoders, 6 decoders, 1 controller, a 70 m infrastructure route, and short local HDMI patches; assert no generic extender and no local HDMI-distance warning.
- [ ] **Step 6: Preserve legacy state compatibility** by mapping old `cableRun` into `endpoint-route` only when no structured topology exists and marking the basis as inferred.
- [ ] **Step 7: Run focused verification**: `npx vitest run src/wingman2/lib/projectTopology.test.ts src/wingman2/lib/dependencyGovernance.test.ts src/wingman2/data/workflowHandoff.buildDiscoveryBriefFromState.test.ts` and `npm run check:discovery-topology`.
- [ ] **Step 8: Commit** with `git commit -m "fix(discovery): scope cable distances by connection role"`.

### Task 3: Add blind requirement-to-BOM acceptance scenarios

**Files:**
- Modify: `data/wingman-real-av-scenarios.json`
- Modify: `tools/check-wingman-recommendation-scenarios.mjs`
- Create: `src/wingman2/lib/blindRecommendationAcceptance.test.ts`
- Modify: `src/wingman2/lib/recommendationEvidence.ts`

**Interfaces:**
- Consumes: customer-only inputs (`application`, counts, display behaviour, distances by scope, USB/audio/control/network needs).
- Produces: independently computed `{ architecture, bom, dependencies, warnings, quoteSafety }`; fixtures must not contain an input SKU or candidate list.

- [ ] **Step 1: Add a scenario-schema failure** when `input` contains `sku`, `product`, `candidate`, `leadProduct`, or `preferredFamily`.
- [ ] **Step 2: Add at least eight blind scenarios** covering higher-education AVoIP, fixed HDMI matrix, HDBaseT point-to-point, wireless BYOM, video wall, multiview, audio/Dante, and a deliberately underspecified request.
- [ ] **Step 3: For each fixture, encode exact assertions** for primary architecture, required SKU quantities, required dependencies, forbidden SKUs/families, missing information, and quote-safety status.
- [ ] **Step 4: Execute the same public recommendation entry point used by Recommendations**, with catalogue data loaded normally and no preselected product.
- [ ] **Step 5: Make failures diagnostic** by printing scenario id plus missing, unexpected, and quantity-mismatched BOM rows.
- [ ] **Step 6: Run** `npm run check:wingman-recommendation-scenarios`, `npm run check:recommendation-accuracy`, and `npm run test:recommendation-scenarios`; all must PASS.
- [ ] **Step 7: Commit** with `git commit -m "test(recommendations): add blind requirement-to-BOM acceptance"`.

### Task 4: Resolve the three template ratio warnings

**Files:**
- Modify: `src/wingman2/lib/roomTemplates.ts`
- Modify: `tools/check-template-signal-path.mjs`
- Test: `src/wingman2/lib/roomTemplates.test.ts`

**Interfaces:**
- Consumes: template `assumptions: string[]`.
- Produces: an explicit shared-content assumption containing both intent and source/display allocation for every legitimate high-ratio design.

- [ ] **Step 1: Add failing assertions** that the three named templates declare intentional shared content.
- [ ] **Step 2: Add exact assumptions**: Retail zones repeat two signage sources across eight displays; the STEM lab distributes teacher/demo sources to eight benches; the clinic repeats patient-calling/signage sources across six waiting displays.
- [ ] **Step 3: Teach the ratio check to accept only explicit intent** matching `shared|repeat|same content|distribution` plus a source/display count; vague assumptions must still warn.
- [ ] **Step 4: Run** `npm run check:template-signal-path` and confirm `0 source/display ratio warning(s)` while all 55 templates remain covered.
- [ ] **Step 5: Run** `npm run check:template-sku-lifecycle` and `npx playwright test e2e/template-bom-verification.spec.ts e2e/template-to-proposal-workflow.spec.ts`.
- [ ] **Step 6: Commit** with `git commit -m "fix(templates): document intentional shared display content"`.

### Task 5: Rebuild real Windows browser regression coverage

**Files:**
- Create: `e2e/production-critical-workflows.spec.ts`
- Modify: `playwright.config.ts`
- Modify: `e2e/visual-regression.spec.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: Vite UI plus authenticated test API on isolated ports.
- Produces: a `test:e2e:windows-critical` command covering Dashboard, Discovery, Recommendations, Compare, Battle Cards, Templates, Proposal, and Product Call Cards.

- [ ] **Step 1: Pin a deterministic Windows project** using Chromium, desktop/tablet/mobile viewports, trace-on-first-retry, video-on-failure, and no snapshot updates in normal runs.
- [ ] **Step 2: Add behavioural critical paths** that assert navigation, data loading, user actions, and final domain outcomes rather than page-load-only stability.
- [ ] **Step 3: Extend visual snapshots** for populated Compare/Battle Cards, populated Product Call Cards, a completed recommendation, and proposal review state.
- [ ] **Step 4: Start isolated servers with PowerShell `Start-Process -WindowStyle Hidden`**, separate output/error logs, and ports not used by existing smoke suites; confirm each port with `netstat` before testing.
- [ ] **Step 5: Run the suite three consecutive times** without retries masking failures; retain Playwright HTML reports and failure artefacts.
- [ ] **Step 6: Commit** with `git commit -m "test(e2e): add Windows production-critical browser coverage"`.

### Task 6: Validate mobile/tablet and offline reconnect behaviour

**Files:**
- Create: `e2e/offline-reconnect.spec.ts`
- Modify: `src/wingman2/lib/siteSurveySync.ts`
- Modify: `src/wingman2/lib/siteSurveyStorage.ts`
- Test: `src/wingman2/lib/siteSurveyStorage.test.ts`
- Modify: `docs/release-evidence/late-beta-v1-candidate.md`

**Interfaces:**
- Consumes: local offline edits and the existing project persistence API.
- Produces: idempotent sync results with explicit `synced`, `conflict`, or `error` outcome and preserved local data on failure.

- [ ] **Step 1: Add unit tests** for offline save, repeated reconnect, failed upload, server-newer conflict, and successful idempotent replay.
- [ ] **Step 2: Add Playwright multi-context tests** representing a desktop and tablet editing the same project; take one context offline, edit cable lengths/checks, update the project elsewhere, reconnect, and assert no silent overwrite.
- [ ] **Step 3: Run responsive UAT paths** at 390x844, 768x1024, and 1280x800 with touch enabled for Dashboard, Discovery, Compare, Templates, Proposal, and Site Survey.
- [ ] **Step 4: Record evidence** as a table of device/viewport, workflow, online/offline transition, result, screenshot/trace path, and residual issue.
- [ ] **Step 5: Run** `npx playwright test e2e/offline-reconnect.spec.ts` and the mobile/tablet portion of `e2e/production-critical-workflows.spec.ts`.
- [ ] **Step 6: Commit** with `git commit -m "test(sync): prove mobile offline reconnect behaviour"`.

### Task 7: Gate proposal screen, DOCX, and PDF parity

**Files:**
- Create: `e2e/proposal-output-parity.spec.ts`
- Create: `tools/check-proposal-output-parity.mjs`
- Modify: `src/wingman2/lib/proposalExport.ts`
- Modify: `src/wingman2/lib/proposalDocxExport.ts`
- Test: `src/wingman2/lib/proposalDocxExport.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: one canonical completed proposal fixture.
- Produces: normalized section manifests for screen HTML, DOCX XML, and print-PDF text plus rendered page images for manual visual sign-off.

- [ ] **Step 1: Define one canonical proposal fixture** containing customer requirement, recommendation, BOM, dependencies, assumptions, risks, discovery trail, schematic, and disclaimer.
- [ ] **Step 2: Export all three formats** from the real browser flow; capture screen screenshots, downloaded DOCX, and Chromium-generated PDF.
- [ ] **Step 3: Extract normalized manifests** and assert the same required section headings, SKU quantities, dependencies, assumptions, unresolved risks, and disclaimer appear in each format.
- [ ] **Step 4: Render DOCX and PDF pages to PNG** and store the run paths in the release-evidence document; visually inspect clipping, page breaks, table overflow, image scaling, and heading order.
- [ ] **Step 5: Add `check:proposal-output-parity`** to `verify:visual` only after it is deterministic on Windows.
- [ ] **Step 6: Run** `npx vitest run src/wingman2/lib/proposalDocxExport.test.ts`, `node tools/e2e-proposal-docx-check.mjs`, and `npm run check:proposal-output-parity`.
- [ ] **Step 7: Commit** with `git commit -m "test(proposal): gate screen DOCX and PDF parity"`.

### Task 8: Standardise interface, discovery-depth, and interview terminology

**Files:**
- Modify: `src/wingman2/data/uiMode.tsx`
- Modify: `src/wingman2/components/UiModeToggle.tsx`
- Modify: `src/wingman2/pages/DiscoveryPage.tsx`
- Modify: `src/wingman2/pages/discovery/DiscoveryGuidedInterview.tsx`
- Modify: `src/wingman2/pages/discovery/discoveryProgressiveDisclosure.tsx`
- Modify: related UI tests and `tools/check-wingman-navigation-consolidation.mjs`

**Interfaces:**
- Consumes: persisted internal values `guided|unguided` and discovery values `basic|expert` without migration-breaking storage changes.
- Produces: canonical customer labels: `Focused view` / `Full workspace` for interface scope, `Essential` / `Detailed` for discovery depth, and `Voice interview` for the conversational capture method.

- [ ] **Step 1: Add copy-contract tests** that require the three axes and reject the overlapping visible labels `Guided`, `Basic`, `Expert`, and `Guided interview` in their former contexts.
- [ ] **Step 2: Centralise labels/descriptions** in `uiMode.tsx` and a discovery-label export so components do not invent local synonyms.
- [ ] **Step 3: Update visible UI and aria labels** while retaining internal persisted enum values for backwards compatibility.
- [ ] **Step 4: Update escalation copy** to say that Detailed discovery reveals all questions; update the entry card to say Voice interview.
- [ ] **Step 5: Run** the affected Vitest suites, `npm run check:navigation-consolidation`, `npm run check:sales-facing-language`, and the Dashboard/Discovery visual tests.
- [ ] **Step 6: Conduct a terminology sweep** with `rg -n "Guided interview|Basic mode|Expert mode|>Guided<|>Full<" src/wingman2 e2e tools` and classify any remaining occurrence as internal compatibility code, locale/test fixture, or defect.
- [ ] **Step 7: Commit** with `git commit -m "fix(ux): clarify interface and discovery terminology"`.

### Task 9: Run the release gate and publish go/no-go evidence

**Files:**
- Modify: `docs/release-evidence/late-beta-v1-candidate.md`

**Interfaces:**
- Consumes: results and artefacts from Tasks 1-8.
- Produces: a dated, auditable release decision with zero unclassified failures.

- [ ] **Step 1: Run focused data and recommendation gates**: `npm run verify:data`, `npm run check:wingman-recommendation-scenarios`, and `npm run test:recommendation-scenarios`.
- [ ] **Step 2: Run the real compile/test chain**: `npm run typecheck`, `npm run lint`, `npm run test`, and plain `npm run build` before ratchet-bearing verification.
- [ ] **Step 3: Run browser and parity suites**: `npm run test:e2e:windows-critical`, `npx playwright test e2e/offline-reconnect.spec.ts`, and `npm run check:proposal-output-parity`.
- [ ] **Step 4: Run the complete gate**: `npm run verify`.
- [ ] **Step 5: Record exact counts, skipped tests, warnings, browser/device matrix, generated artefact paths, commit hash, and `git status --short` output in the evidence document.
- [ ] **Step 6: Set the decision** to GO only if every automated gate passes, all three template warnings are resolved, connector semantics are clean across authority and derivatives, blind scenarios pass, browser runs are repeatable, offline conflicts are non-destructive, and proposal visuals are signed off; otherwise record NO-GO with the failing criterion.
- [ ] **Step 7: Commit** with `git commit -m "docs(release): record late-beta v1 readiness evidence"`.

## Self-Review

- Spec coverage: all eight assessed recommendations map to Tasks 1-8; Task 9 provides the cross-cutting release decision.
- Placeholder scan: no deferred implementation markers are present; every task names files, interfaces, assertions, commands, and expected outcomes.
- Type consistency: structured distance scope originates in `ProjectConnection`, recommendation fixtures remain customer-input-only, and proposal parity uses one canonical fixture across all formats.
- Sequencing: data accuracy lands first; distance correctness precedes blind BOM assertions; template corrections precede browser/UAT evidence; terminology lands after workflow behaviour is stable; the full release gate runs last.

