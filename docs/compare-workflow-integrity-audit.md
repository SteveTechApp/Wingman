# Compare workflow integrity audit

Generated: 2026-06-15T12:50:18.730Z

## Executive summary

- Multiple `Run compare` sources exist; duplicate buttons/actions are expected.
- Invalid SKU reference found: `SW-740` / `SW-740-TX`.

## Route and file wiring

| compareRouteUsesNew | compareRouteUsesOld | manifestPathCompare | manifestPageNew | oldCompareExists | newCompareExists |
| --- | --- | --- | --- | --- | --- |
| true | false | true | true | true | true |


## ComparePageNew static markers

| file | lines | runCompareCount | handleSkuSelectMatches | handleSubmitMatches | workflowStepMatches | hasRunKnownProfileCompare | hasLookupCompareIntelligence | hasSelectableGate | hasNoSuitableMessage | hasSeedCatalog | hasManufacturerOptions |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| src/wingman2/pages/ComparePageNew.tsx | 884 | 2 | 6 | 7 | 6 | true | true | true | true | true | true |


## Global workflow guards mounted in main.tsx

These are important because many recent fixes were global DOM overlays rather than native compare-page logic.

| component | path | mounted |
| --- | --- | --- |
| WorkflowAlphaNumericFilter | WorkflowAlphaNumericFilter | true |
| ProductStoryLanguageEnhancer | ProductStoryLanguageEnhancer | true |
| ProductCallCardsStickyLayoutEnhancer | ProductCallCardsStickyLayoutEnhancer | true |


## Duplicate Run Compare action sources

| file | line | text |
| --- | --- | --- |
| src/wingman2/pages/ComparePageNew.tsx | 577 | // committed (Run compare / known-SKU chip), not on every keystroke. |
| src/wingman2/pages/ComparePageNew.tsx | 722 | Run compare |
| src/wingman2/styles/wingman-style-stack.css | 29008 | .wingman-compare-run-action, |
| src/wingman2/styles/wingman-style-stack.css | 29018 | .wingman-compare-run-action { |
| src/wingman2/styles/wingman-style-stack.css | 29025 | .wingman-compare-run-action:hover { |
| src/wingman2/styles/wingman-style-stack.css | 29030 | .wingman-compare-run-action:disabled { |
| tools/audit-compare-workflow-integrity.mjs | 286 | const runCompareCount = (text.match(/Run compare/g) \|\| []).length; |
| tools/audit-compare-workflow-integrity.mjs | 399 | const rows = collectHits(/Run compare\|Run typed\/custom compare\|wingman-compare-run-action\|data-wingman-compare-run-action/i); |
| tools/audit-compare-workflow-integrity.mjs | 440 | severeFindings.push("Multiple `Run compare` sources exist; duplicate buttons/actions are expected."); |
| tools/audit-compare-workflow-integrity.mjs | 501 | ## Duplicate Run Compare action sources |
| tools/audit-compare-workflow-integrity.mjs | 646 | console.log(`Run compare sources: ${duplicateRunCompareSources.length}`); |
| tools/check-compare-page-candidate-gate.mjs | 93 | fail("handleSubmit should remain as Enter/manual fallback and still run compare."); |
| tools/check-compare-sku-auto-advance.mjs | 61 | fail("handleSkuSelect does not run compare directly."); |


## Product intelligence sources

| source | status | entries |
| --- | --- | --- |
| public/product-intelligence-index.json | read | 8064 |


Unique catalogue SKU count: **297**

## Invalid / non-catalogue WyreStorm SKU references

This compares SKU-like references in source/data against the product intelligence index. Some false positives may appear, but any recommended SKU must be catalogue-backed.

| sku | file |
| --- | --- |
| USB-PERIPHERAL-HOST | src/features/catalog/catalogIntelligence.ts |
| APO-UC210 | src/features/catalog/catalogIntelligence.ts |
| NHD-600 | src/features/catalog/catalogIntelligence.ts |
| NHD-110 | src/features/catalog/catalogIntelligence.ts |
| NHD-128 | src/features/catalog/catalogIntelligence.ts |
| NHD-150 | src/features/catalog/catalogIntelligence.ts |
| USB-2-HOST | src/wingman2/components/discovery/SourceDeviceCollator.tsx |
| USB-3-HOST | src/wingman2/components/discovery/SourceDeviceCollator.tsx |
| USB-C-LAPTOP | src/wingman2/components/discovery/SourceDeviceCollator.tsx |
| USB-CAMERA | src/wingman2/components/discovery/SourceDeviceCollator.tsx |
| USB-BRIDGE | src/wingman2/components/discovery/SourceDeviceCollator.tsx |
| USB-SWITCHING | src/wingman2/components/discovery/SourceDeviceCollator.tsx |
| SW-640-TX-W | src/wingman2/components/ProductPositioningStatement.tsx |
| MX-0403-MST | src/wingman2/components/ProductPositioningStatement.tsx |
| MX-0408-EDU | src/wingman2/components/ProductPositioningStatement.tsx |
| MX-AUTO | src/wingman2/components/SalesToneQuickSetter.tsx |
| NHD-600 | src/wingman2/components/TemplateSchematic.tsx |
| NHD-110 | src/wingman2/components/TemplateSchematic.tsx |
| NHD-150 | src/wingman2/components/TemplateSchematic.tsx |
| MX-1007 | src/wingman2/components/TemplateSchematic.tsx |
| SW-130 | src/wingman2/components/TemplateSchematic.tsx |
| SW-120 | src/wingman2/components/TemplateSchematic.tsx |
| APO-VX | src/wingman2/components/TemplateSchematic.tsx |
| SW-0204 | src/wingman2/components/TemplateSchematic.tsx |
| SW-0206 | src/wingman2/components/TemplateSchematic.tsx |
| RX-35 | src/wingman2/components/WingmanGuruDrawer.tsx |
| RX-70 | src/wingman2/components/WingmanGuruDrawer.tsx |
| SW-130 | src/wingman2/components/WingmanGuruDrawer.tsx |
| USB-REQUIRED | src/wingman2/components/WingmanGuruDrawer.tsx |
| TX-RX | src/wingman2/components/WingmanGuruDrawer.tsx |
| USB-2 | src/wingman2/data/avGlossary.ts |
| USB-3 | src/wingman2/data/avGlossary.ts |
| MX-0403-MST | src/wingman2/data/productMedia.ts |
| NHD-600 | src/wingman2/data/productPositioningCards.ts |
| NHD-128-NDI-BRG | src/wingman2/data/productPositioningCards.ts |
| MX-0408-EDU | src/wingman2/data/productPositioningCards.ts |
| MX-0403-MST | src/wingman2/data/productPositioningCards.ts |
| SW-640-TX-W | src/wingman2/data/productPositioningCards.ts |
| USB-HEAVY | src/wingman2/data/productPositioningCards.ts |
| USB-FIRST | src/wingman2/data/productPositioningCards.ts |
| MX-040 | src/wingman2/data/productPositioningCards.ts |
| MX-0403 | src/wingman2/data/productPositioningCards.ts |
| SW-120-TX | src/wingman2/data/usbTierRules.ts |
| MX-0804-SCL | src/wingman2/data/usbTierRules.ts |
| APO-VX20 | src/wingman2/data/workflowHandoff.ts |
| APO-210 | src/wingman2/data/workflowHandoff.ts |
| SW-0204 | src/wingman2/domain/productMatching/featureFilters.ts |
| SW-0206 | src/wingman2/domain/productMatching/featureFilters.ts |
| SYN-KEY | src/wingman2/domain/productMatching/featureFilters.ts |
| SYN-TOUCH | src/wingman2/domain/productMatching/featureFilters.ts |
| NHD-CTL | src/wingman2/lib/avDecisionEvidence.ts |
| NHD-600 | src/wingman2/lib/avDecisionEvidence.ts |
| SW-120 | src/wingman2/lib/avDecisionEvidence.ts |
| SW-130 | src/wingman2/lib/avDecisionEvidence.ts |
| USB-REQUIRED-BUT-PRODUCT-NOT-USB | src/wingman2/lib/avDecisionEvidence.ts |
| NHD-128-NDI-BRG | src/wingman2/lib/avDecisionEvidence.ts |
| APO-120-DNT | src/wingman2/lib/compareCandidateGate.ts |
| NHD-000-RACK | src/wingman2/lib/compareCandidateGate.ts |
| USB-AUDIO | src/wingman2/lib/compareEligibilityEngine.ts |
| NHD-600 | src/wingman2/lib/compareEngineModel.ts |
| NHD-124 | src/wingman2/lib/compareEngineModel.ts |
| NHD-128 | src/wingman2/lib/compareEngineModel.ts |
| NHD-150 | src/wingman2/lib/compareEngineModel.ts |
| NHD-600 | src/wingman2/lib/compareEngineRuntimeAdapter.ts |
| NHD-124 | src/wingman2/lib/compareEngineRuntimeAdapter.ts |
| NHD-128 | src/wingman2/lib/compareEngineRuntimeAdapter.ts |
| NHD-150 | src/wingman2/lib/compareEngineRuntimeAdapter.ts |
| HDBT-CLASS-A | src/wingman2/lib/compareEngineRuntimeScenarios.test.ts |
| EX-70-UNKNOWN | src/wingman2/lib/compareEngineRuntimeScenarios.test.ts |
| SW-020 | src/wingman2/lib/competitorCompareBehaviour.test.ts |
| USB-ONLY | src/wingman2/lib/competitorMatchEngine.ts |
| RX-4K-510-C-E | src/wingman2/lib/competitorProductIntelligence.ts |
| TX-4KZ-211-2G | src/wingman2/lib/competitorProductIntelligence.ts |
| EX-KIT | src/wingman2/lib/competitorProductIntelligence.ts |
| EX-100CE-KIT | src/wingman2/lib/competitorProductIntelligence.ts |
| RX-4K60 | src/wingman2/lib/competitorProductIntelligence.ts |
| TX-4K60 | src/wingman2/lib/competitorProductIntelligence.ts |
| MX-42X | src/wingman2/lib/competitorProductIntelligence.ts |
| MX-44HDBT | src/wingman2/lib/competitorProductIntelligence.ts |
| MX-88 | src/wingman2/lib/competitorProductIntelligence.ts |
| EXT-444-100A | src/wingman2/lib/competitorProductIntelligence.ts |
| TX-4KZ-211-2G | src/wingman2/lib/competitorSpecRegistry.ts |
| RX-4K-510-C-E | src/wingman2/lib/competitorSpecRegistry.ts |
| EX-KIT | src/wingman2/lib/competitorSpecRegistry.ts |
| EX-100CE-KIT | src/wingman2/lib/competitorSpecRegistry.ts |
| TX-4K60 | src/wingman2/lib/competitorSpecRegistry.ts |
| RX-4K60 | src/wingman2/lib/competitorSpecRegistry.ts |
| MX-88 | src/wingman2/lib/competitorSpecRegistry.ts |
| MX-44HDBT | src/wingman2/lib/competitorSpecRegistry.ts |
| EXT-444-100A | src/wingman2/lib/competitorSpecRegistry.ts |
| SW-130 | src/wingman2/lib/dependencyGovernance.ts |
| APO-STYLE | src/wingman2/lib/dependencyGovernance.ts |
| TX-NEEDS-RX | src/wingman2/lib/dependencyGovernance.ts |
| RX-NEEDS-TX | src/wingman2/lib/dependencyGovernance.ts |
| NHD-ENDPOINTS | src/wingman2/lib/dependencyGovernance.ts |
| USB-TOPOLOGY | src/wingman2/lib/dependencyGovernance.ts |
| USB-CONFERENCING | src/wingman2/lib/diagramTemplates.ts |
| NHD-TX-TBC | src/wingman2/lib/diagramTemplates.ts |
| NHD-RX-TBC | src/wingman2/lib/diagramTemplates.ts |
| USB-AWARE | src/wingman2/lib/diagramTemplates.ts |
| NHD-CTL | src/wingman2/lib/knownCompareProfiles.ts |
| MXV-0808-70-H2A | src/wingman2/lib/knownCompareProfiles.ts |
| MX-44HDBT | src/wingman2/lib/knownCompareProfiles.ts |
| MXV-0808-70-H2A | src/wingman2/lib/knownWyrestormCompareProfiles.ts |
| MXV-0808-H2A-70 | src/wingman2/lib/knownWyrestormCompareProfiles.ts |
| TX-ONLY | src/wingman2/lib/knownWyrestormCompareProfiles.ts |
| RX-ONLY | src/wingman2/lib/knownWyrestormCompareProfiles.ts |
| MX-0808-H2A | src/wingman2/lib/knownWyrestormCompareProfiles.ts |
| MXV-0808-70-H2A | src/wingman2/lib/knownWyrestormMatrixProfiles.ts |
| NHD-110 | src/wingman2/lib/networkHdAvoipEquivalence.test.ts |
| NHD-220 | src/wingman2/lib/networkHdAvoipEquivalence.test.ts |
| NHD-220-RX | src/wingman2/lib/networkHdAvoipEquivalence.test.ts |
| NHD-400 | src/wingman2/lib/networkHdAvoipEquivalence.test.ts |
| NHD-400-TX-V2 | src/wingman2/lib/networkHdAvoipEquivalence.test.ts |
| NHD-400-RX-V3 | src/wingman2/lib/networkHdAvoipEquivalence.test.ts |
| NHD-100-TX | src/wingman2/lib/networkHdAvoipEquivalence.test.ts |
| NHD-600 | src/wingman2/lib/networkHdAvoipEquivalence.test.ts |
| NHD-110 | src/wingman2/lib/networkHdAvoipEquivalence.ts |
| NHD-220 | src/wingman2/lib/networkHdAvoipEquivalence.ts |
| NHD-400 | src/wingman2/lib/networkHdAvoipEquivalence.ts |


## Competitor seed catalogue coverage

| brandCount | likelySkuCount | rawStringCount | hasBlustreamIp300 | hasSolstice | hasExtronDtp |
| --- | --- | --- | --- | --- | --- |
| 14 | 58 | 76 | true | false | true |


Brands detected:

- AMX
- ATEN
- AV Access
- Atlona
- Barco
- Blustream
- CYP
- Crestron
- Extron
- Just Add Power
- Kramer
- Lightware
- SY
- ZeeVee

## Compare class / eligibility risk terms

| file | line | term | text |
| --- | --- | --- | --- |
| src/wingman2/lib/compareEligibilityEngine.ts | 21 | Unknown | if (competitorNetworkClass === "unknown") { |
| src/wingman2/lib/compareEligibilityEngine.ts | 27 | Unknown | if (candidateClass === "unknown" \|\| candidateClass === competitorNetworkClass) { |
| src/wingman2/lib/compareEligibilityEngine.ts | 52 | PRESENTATION | \| "presentation-switcher" |
| src/wingman2/lib/compareEligibilityEngine.ts | 62 | Unknown | \| "unknown"; |
| src/wingman2/lib/compareEligibilityEngine.ts | 78 | Unknown | function toText(value: unknown): string { |
| src/wingman2/lib/compareEligibilityEngine.ts | 90 | Unknown | function normalise(value: unknown): string { |
| src/wingman2/lib/compareEligibilityEngine.ts | 94 | Unknown | function skuKey(value: unknown): string { |
| src/wingman2/lib/compareEligibilityEngine.ts | 168 | verify | verify: ["Verify datasheet-level requirements before external quote positioning."], |
| src/wingman2/lib/compareEligibilityEngine.ts | 171 | verify | outcome: "VERIFY", |
| src/wingman2/lib/compareEligibilityEngine.ts | 177 | verify | verify: ["Verify datasheet-level requirements before external quote positioning."], |
| src/wingman2/lib/compareEligibilityEngine.ts | 269 | Unknown | function numberFromValue(value: unknown): number \| undefined { |
| src/wingman2/lib/compareEligibilityEngine.ts | 278 | Unknown | function extractStructuredMatrixSize(value: unknown): { inputs: number; outputs: number } \| undefined { |
| src/wingman2/lib/compareEligibilityEngine.ts | 287 | Unknown | const candidates: Array<[unknown, unknown]> = [ |
| src/wingman2/lib/compareEligibilityEngine.ts | 308 | Unknown | function structuredMatrixText(value: unknown): string { |
| src/wingman2/lib/compareEligibilityEngine.ts | 313 | Unknown | function extractCompetitorText(resultOrInput: unknown, inputText = ""): string { |
| src/wingman2/lib/compareEligibilityEngine.ts | 317 | Unknown | export function classifyCompareIntent(resultOrInput: unknown, inputText = ""): CompareIntentKind { |
| src/wingman2/lib/compareEligibilityEngine.ts | 343 | PRESENTATION | if (/\b(presentation\|switcher\|usb-c\|byod\|byom\|teams\|zoom\|uc\|wireless\s*(presentation\|collaboration\|sharing)\|clickshare)\b/i.test(text)) { |
| src/wingman2/lib/compareEligibilityEngine.ts | 344 | PRESENTATION | return /\b(byod\|byom\|teams\|zoom\|unified\s*communications?\|video\s*bar\|speakerphone)\b/i.test(text) ? "uc-byod" : "presentation-switcher"; |
| src/wingman2/lib/compareEligibilityEngine.ts | 371 | PRESENTATION | if (/\b(wireless\s*(casting\|presentation\|sharing\|collaboration)\|clickshare\|solstice\|mersive\|airtame\|barco\s*c[sx]\|miracast\|airplay\|chromecast\|wifidisplay)\b/i.test(text)) { |
| src/wingman2/lib/compareEligibilityEngine.ts | 391 | Unknown | return "unknown"; |
| src/wingman2/lib/compareEligibilityEngine.ts | 565 | Unknown | const networkMismatch = avoipNetworkMismatch(args.competitorNetworkClass ?? "unknown", sku); |
| src/wingman2/lib/compareEligibilityEngine.ts | 677 | PRESENTATION | if (args.intent === "presentation-switcher" \|\| args.intent === "uc-byod") { |
| src/wingman2/lib/compareEligibilityEngine.ts | 678 | PRESENTATION | if (/^SW\|^MX\|^APO(?:100\|200\|210\|VX20)UC/.test(key) \|\| /\b(presentation\|switcher\|usb-c\|byod\|byom\|unified communications?\|video bar)\b/i.test(combined)) { |
| src/wingman2/lib/compareEligibilityEngine.ts | 679 | PRESENTATION | return direct(args.intent, ["Presentation/switching candidate for meeting-room workflow."], 0); |
| src/wingman2/lib/compareEligibilityEngine.ts | 682 | PRESENTATION | return related(args.intent, ["Related product, but not a direct presentation switcher lead."], 80); |
| src/wingman2/lib/compareEligibilityEngine.ts | 771 | Eligibility correction | `Eligibility correction: NetworkHD ${avoipRecommendation.series} (${avoipRecommendation.networkClass.toUpperCase()}) candidate inserted for AVoIP comparison.`, |
| src/wingman2/lib/compareEligibilityEngine.ts | 771 | candidate inserted | `Eligibility correction: NetworkHD ${avoipRecommendation.series} (${avoipRecommendation.networkClass.toUpperCase()}) candidate inserted for AVoIP comparison.`, |
| src/wingman2/lib/compareEligibilityEngine.ts | 787 | Eligibility correction | addCandidateBySku(nextMatches, products, "MXV-0404-H2A-KIT", "Eligibility correction: correctly sized 4x4 HDBaseT matrix candidate inserted for routed matrix comparison.", 90); |
| src/wingman2/lib/compareEligibilityEngine.ts | 787 | candidate inserted | addCandidateBySku(nextMatches, products, "MXV-0404-H2A-KIT", "Eligibility correction: correctly sized 4x4 HDBaseT matrix candidate inserted for routed matrix comparison.", 90); |
| src/wingman2/lib/compareEligibilityEngine.ts | 788 | Eligibility correction | addCandidateBySku(nextMatches, products, "MX-0404-HDMI", "Eligibility correction: correctly sized 4x4 HDMI matrix candidate inserted for routed matrix comparison.", 84); |
| src/wingman2/lib/compareEligibilityEngine.ts | 788 | candidate inserted | addCandidateBySku(nextMatches, products, "MX-0404-HDMI", "Eligibility correction: correctly sized 4x4 HDMI matrix candidate inserted for routed matrix comparison.", 84); |
| src/wingman2/lib/compareEligibilityEngine.ts | 789 | Eligibility correction | addCandidateBySku(nextMatches, products, "MX-0404-SCL", "Eligibility correction: correctly sized 4x4 scaling matrix candidate inserted for routed matrix comparison.", 82); |
| src/wingman2/lib/compareEligibilityEngine.ts | 789 | candidate inserted | addCandidateBySku(nextMatches, products, "MX-0404-SCL", "Eligibility correction: correctly sized 4x4 scaling matrix candidate inserted for routed matrix comparison.", 82); |
| src/wingman2/lib/compareEligibilityEngine.ts | 793 | Eligibility correction | addCandidateBySku(nextMatches, products, "MX-0402-MST", "Eligibility correction: correctly sized 4x2 WyreStorm matrix candidate inserted ahead of oversized 8x8 options.", 86); |
| src/wingman2/lib/compareEligibilityEngine.ts | 793 | candidate inserted | addCandidateBySku(nextMatches, products, "MX-0402-MST", "Eligibility correction: correctly sized 4x2 WyreStorm matrix candidate inserted ahead of oversized 8x8 options.", 86); |
| src/wingman2/lib/compareEligibilityEngine.ts | 798 | Eligibility correction | "Eligibility correction: correctly sized 4x2 matrix/switching candidate inserted ahead of oversized 8x8 options.", |
| src/wingman2/lib/compareEligibilityEngine.ts | 798 | candidate inserted | "Eligibility correction: correctly sized 4x2 matrix/switching candidate inserted ahead of oversized 8x8 options.", |
| src/wingman2/lib/compareEligibilityEngine.ts | 805 | Eligibility correction | addCandidateBySku(nextMatches, products, "MXV-0808-H2A-KIT", "Eligibility correction: correctly sized 8x8 HDBaseT matrix candidate inserted for routed matrix comparison.", 90); |
| src/wingman2/lib/compareEligibilityEngine.ts | 805 | candidate inserted | addCandidateBySku(nextMatches, products, "MXV-0808-H2A-KIT", "Eligibility correction: correctly sized 8x8 HDBaseT matrix candidate inserted for routed matrix comparison.", 90); |
| src/wingman2/lib/compareEligibilityEngine.ts | 806 | Eligibility correction | addCandidateBySku(nextMatches, products, "MXV-0808-H2A-70-V3", "Eligibility correction: correctly sized 8x8 long-reach HDBaseT matrix candidate inserted for routed matrix comparison.", 88); |
| src/wingman2/lib/compareEligibilityEngine.ts | 806 | candidate inserted | addCandidateBySku(nextMatches, products, "MXV-0808-H2A-70-V3", "Eligibility correction: correctly sized 8x8 long-reach HDBaseT matrix candidate inserted for routed matrix comparison.", 88); |
| src/wingman2/lib/compareEligibilityEngine.ts | 807 | Eligibility correction | addCandidateBySku(nextMatches, products, "MX-0808-H2A-MK2", "Eligibility correction: correctly sized 8x8 HDMI matrix candidate inserted for routed matrix comparison.", 86); |
| src/wingman2/lib/compareEligibilityEngine.ts | 807 | candidate inserted | addCandidateBySku(nextMatches, products, "MX-0808-H2A-MK2", "Eligibility correction: correctly sized 8x8 HDMI matrix candidate inserted for routed matrix comparison.", 86); |
| src/wingman2/lib/compareEligibilityEngine.ts | 808 | Eligibility correction | addCandidateBySku(nextMatches, products, "MX-0808-SCL", "Eligibility correction: correctly sized 8x8 scaling matrix candidate inserted for routed matrix comparison.", 84); |
| src/wingman2/lib/compareEligibilityEngine.ts | 808 | candidate inserted | addCandidateBySku(nextMatches, products, "MX-0808-SCL", "Eligibility correction: correctly sized 8x8 scaling matrix candidate inserted for routed matrix comparison.", 84); |
| src/wingman2/lib/compareEligibilityEngine.ts | 812 | PRESENTATION | if (intent === "presentation-switcher" \|\| intent === "uc-byod") { |
| src/wingman2/lib/compareEligibilityEngine.ts | 813 | Eligibility correction | addCandidateBySku(nextMatches, products, "SW-640L-TX-W", "Eligibility correction: wireless presentation switcher candidate inserted for BYOD/BYOM workflow.", 84); |
| src/wingman2/lib/compareEligibilityEngine.ts | 813 | candidate inserted | addCandidateBySku(nextMatches, products, "SW-640L-TX-W", "Eligibility correction: wireless presentation switcher candidate inserted for BYOD/BYOM workflow.", 84); |
| src/wingman2/lib/compareEligibilityEngine.ts | 813 | PRESENTATION | addCandidateBySku(nextMatches, products, "SW-640L-TX-W", "Eligibility correction: wireless presentation switcher candidate inserted for BYOD/BYOM workflow.", 84); |
| src/wingman2/lib/compareEligibilityEngine.ts | 814 | Eligibility correction | addCandidateBySku(nextMatches, products, "SW-620-TX-W", "Eligibility correction: wireless presentation switcher candidate inserted for meeting-room collaboration workflow.", 82); |
| src/wingman2/lib/compareEligibilityEngine.ts | 814 | candidate inserted | addCandidateBySku(nextMatches, products, "SW-620-TX-W", "Eligibility correction: wireless presentation switcher candidate inserted for meeting-room collaboration workflow.", 82); |
| src/wingman2/lib/compareEligibilityEngine.ts | 814 | PRESENTATION | addCandidateBySku(nextMatches, products, "SW-620-TX-W", "Eligibility correction: wireless presentation switcher candidate inserted for meeting-room collaboration workflow.", 82); |
| src/wingman2/lib/compareEligibilityEngine.ts | 815 | Eligibility correction | addCandidateBySku(nextMatches, products, "APO-200-UC", "Eligibility correction: UC room hardware candidate inserted for conferencing workflow comparison.", 78); |
| src/wingman2/lib/compareEligibilityEngine.ts | 815 | candidate inserted | addCandidateBySku(nextMatches, products, "APO-200-UC", "Eligibility correction: UC room hardware candidate inserted for conferencing workflow comparison.", 78); |
| src/wingman2/lib/compareEligibilityEngine.ts | 819 | Eligibility correction | addCandidateBySku(nextMatches, products, "EX-100-H2", "Eligibility correction: HDBaseT extender candidate inserted for point-to-point transport comparison.", 84); |
| src/wingman2/lib/compareEligibilityEngine.ts | 819 | candidate inserted | addCandidateBySku(nextMatches, products, "EX-100-H2", "Eligibility correction: HDBaseT extender candidate inserted for point-to-point transport comparison.", 84); |
| src/wingman2/lib/compareEligibilityEngine.ts | 820 | Eligibility correction | addCandidateBySku(nextMatches, products, "EX-100-USB3", "Eligibility correction: USB 3 extension candidate inserted for USB/KVM workflow comparison.", 84); |
| src/wingman2/lib/compareEligibilityEngine.ts | 820 | candidate inserted | addCandidateBySku(nextMatches, products, "EX-100-USB3", "Eligibility correction: USB 3 extension candidate inserted for USB/KVM workflow comparison.", 84); |
| src/wingman2/lib/compareEligibilityEngine.ts | 821 | Eligibility correction | addCandidateBySku(nextMatches, products, "EX-100-KVM", "Eligibility correction: KVM-capable HDBaseT extender candidate inserted for point-to-point transport comparison.", 82); |
| src/wingman2/lib/compareEligibilityEngine.ts | 821 | candidate inserted | addCandidateBySku(nextMatches, products, "EX-100-KVM", "Eligibility correction: KVM-capable HDBaseT extender candidate inserted for point-to-point transport comparison.", 82); |
| src/wingman2/lib/compareEligibilityEngine.ts | 822 | Eligibility correction | addCandidateBySku(nextMatches, products, "EX-60-USB2", "Eligibility correction: USB 2 extension candidate inserted for USB workflow comparison.", 80); |
| src/wingman2/lib/compareEligibilityEngine.ts | 822 | candidate inserted | addCandidateBySku(nextMatches, products, "EX-60-USB2", "Eligibility correction: USB 2 extension candidate inserted for USB workflow comparison.", 80); |
| src/wingman2/lib/compareEligibilityEngine.ts | 823 | Eligibility correction | addCandidateBySku(nextMatches, products, "NHD-USB-TRX", "Eligibility correction: USB over IP transceiver inserted for USB extension workflow comparison.", 78); |
| src/wingman2/lib/compareEligibilityEngine.ts | 827 | Eligibility correction | addCandidateBySku(nextMatches, products, "SW-0206-VW", "Eligibility correction: dedicated video wall processor inserted ahead of generic AVoIP or multiview alternatives.", 88); |
| src/wingman2/lib/compareEligibilityEngine.ts | 828 | Eligibility correction | addCandidateBySku(nextMatches, products, "SW-0204-VW", "Eligibility correction: simpler preset-layout video wall processor inserted for basic wall requirements.", 84); |
| src/wingman2/lib/compareEligibilityEngine.ts | 832 | Eligibility correction | addCandidateBySku(nextMatches, products, "NHD-0401-MV", "Eligibility correction: dedicated multiview processor inserted for a multi-source single-output canvas.", 88); |
| src/wingman2/lib/compareEligibilityEngine.ts | 833 | Eligibility correction | addCandidateBySku(nextMatches, products, "NHD-150-RX", "Eligibility correction: NetworkHD multiview receiver inserted for AVoIP multiview workflow.", 84); |
| src/wingman2/lib/compareEligibilityEngine.ts | 841 | Eligibility correction | "Eligibility correction: WyreStorm Apollo or wireless collaboration product inserted for wireless casting comparison.", |
| src/wingman2/lib/compareEligibilityEngine.ts | 852 | Eligibility correction | "Eligibility correction: WyreStorm USB audio or conferencing candidate inserted for USB audio comparison.", |
| src/wingman2/lib/compareEligibilityEngine.ts | 852 | candidate inserted | "Eligibility correction: WyreStorm USB audio or conferencing candidate inserted for USB audio comparison.", |
| src/wingman2/lib/compareEligibilityEngine.ts | 901 | Unknown | : "unknown"; |
| src/wingman2/lib/compareEligibilityEngine.ts | 966 | verify | ? "VERIFY" |
| src/wingman2/lib/rigorousCompare.ts | 8 | verify | * profile and decides GOOD MATCH / PARTIAL MATCH / NO MATCH / VERIFY. |
| src/wingman2/lib/rigorousCompare.ts | 54 | verify | VERIFY: 1, |
| src/wingman2/lib/rigorousCompare.ts | 88 | Unknown | (!competitor.domain \|\| competitor.domain === "UNKNOWN") && |
| src/wingman2/lib/rigorousCompare.ts | 155 | verify | const specPrompt = `Add ${competitorLabel}'s datasheet detail (role, transport, I/O count, resolution) to lift this above a verify-only result`; |
| src/wingman2/lib/rigorousCompare.ts | 167 | verify | recommendation = `No WyreStorm product compares cleanly to ${competitorLabel}. Treat as no direct equivalent or verify the requirement.`; |
| src/wingman2/lib/rigorousCompare.ts | 174 | verify | nextSteps.push(...dedupe([...top.decision.verify, "Confirm pricing, lifecycle and accessory dependencies"])); |
| src/wingman2/lib/rigorousCompare.ts | 177 | verify | nextSteps.push(...dedupe([...top.decision.gaps, ...top.decision.verify])); |
| src/wingman2/lib/rigorousCompare.ts | 181 | verify | competitor.specTier === "verified-profile" ? "Confirm the verify items on the top candidate" : specPrompt, |
| src/wingman2/lib/rigorousCompare.ts | 182 | verify | ...top.decision.verify, |
| src/wingman2/lib/compareRuntimePipeline.ts | 11 | Unknown | function isRecord(value: unknown): value is AnyRecord { |
| src/wingman2/lib/compareRuntimePipeline.ts | 15 | Unknown | function cleanSku(value: unknown): string { |
| src/wingman2/lib/compareRuntimePipeline.ts | 19 | Unknown | function normaliseSkuKey(value: unknown): string { |
| src/wingman2/lib/compareRuntimePipeline.ts | 23 | Unknown | function isProductLikeRecord(value: unknown): value is AnyRecord { |
| src/wingman2/lib/compareRuntimePipeline.ts | 43 | Unknown | function collectProductLikeRecords(value: unknown, output: AnyRecord[], seenObjects: Set<unknown>): void { |
| src/wingman2/lib/compareRuntimePipeline.ts | 76 | Unknown | export function normaliseCompareProducts(input: unknown): AnyRecord[] { |
| src/wingman2/lib/compareRuntimePipeline.ts | 99 | Unknown | products: unknown, |
| src/wingman2/lib/competitorMatchEngine.ts | 15 | PRESENTATION | \| "PRESENTATION" |
| src/wingman2/lib/competitorMatchEngine.ts | 16 | VIDEO_WALL | \| "VIDEO_WALL" |
| src/wingman2/lib/competitorMatchEngine.ts | 19 | PRESENTATION | \| "WIRELESS_PRESENTATION" |
| src/wingman2/lib/competitorMatchEngine.ts | 22 | Unknown | \| "UNKNOWN"; |
| src/wingman2/lib/competitorMatchEngine.ts | 36 | Unknown | \| "unknown"; |
| src/wingman2/lib/competitorMatchEngine.ts | 137 | PRESENTATION | [["presentation", "switcher", "dmps", "in1608", "in1804", "atome", "taurus", "ucx", "vp440", "vp551", "dvx"], "PRESENTATION"], |
| src/wingman2/lib/competitorMatchEngine.ts | 138 | VIDEO_WALL | [["videowall", "videowallprocessor", "wallprocessor", "multiview"], "VIDEO_WALL"], |
| src/wingman2/lib/competitorMatchEngine.ts | 139 | PRESENTATION | [["clickshare", "airmedia", "solstice", "screenbeam", "wireless"], "WIRELESS_PRESENTATION"], |
| src/wingman2/lib/competitorMatchEngine.ts | 151 | PRESENTATION | [["switcher", "presentation", "dmps", "in1608", "taurus", "ucx", "vp440", "atome"], "switcher"], |
| src/wingman2/lib/competitorMatchEngine.ts | 162 | PRESENTATION | [[/\b(presentation\|switcher\|scaler\|sw-\|dmps\|dvx\|ps-\|in1608)\b/i], "PRESENTATION"], |
| src/wingman2/lib/competitorMatchEngine.ts | 163 | VIDEO_WALL | [[/\b(video\s*wall\|wall\s*proc\|vw-\|multiview)\b/i], "VIDEO_WALL"], |
| src/wingman2/lib/competitorMatchEngine.ts | 166 | PRESENTATION | [[/\b(wireless\|clickshare\|airmedia\|solstice\|screenbeam\|miracast)\b/i], "WIRELESS_PRESENTATION"], |
| src/wingman2/lib/competitorMatchEngine.ts | 186 | Unknown | function compareKey(value: unknown): string { |
| src/wingman2/lib/competitorMatchEngine.ts | 247 | Unknown | return "Unknown"; |
| src/wingman2/lib/competitorMatchEngine.ts | 279 | Unknown | return "UNKNOWN"; |
| src/wingman2/lib/competitorMatchEngine.ts | 297 | Unknown | return "unknown"; |
| src/wingman2/lib/competitorMatchEngine.ts | 330 | Unknown | function stringList(value: unknown): string[] { |
| src/wingman2/lib/competitorMatchEngine.ts | 379 | Unknown | if (brand !== "Unknown") { |
| src/wingman2/lib/competitorMatchEngine.ts | 383 | Unknown | if (techClass !== "UNKNOWN") { |
| src/wingman2/lib/competitorMatchEngine.ts | 387 | Unknown | if (role !== "unknown") { |
| src/wingman2/lib/competitorMatchEngine.ts | 409 | Unknown | if (brand !== "Unknown" && technologyClass !== "UNKNOWN" && role !== "unknown") { |
| src/wingman2/lib/competitorMatchEngine.ts | 411 | Unknown | } else if (brand !== "Unknown" \|\| technologyClass !== "UNKNOWN") { |
| src/wingman2/lib/competitorMatchEngine.ts | 434 | PRESENTATION | "SW": ["PRESENTATION", "MATRIX"], |
| src/wingman2/lib/competitorMatchEngine.ts | 448 | PRESENTATION | PRESENTATION: ["PRESENTATION", "MATRIX"], |
| src/wingman2/lib/competitorMatchEngine.ts | 449 | VIDEO_WALL | VIDEO_WALL: ["VIDEO_WALL", "AVOIP", "MATRIX"], |
| src/wingman2/lib/competitorMatchEngine.ts | 451 | PRESENTATION | USB_CONFERENCE: ["USB_CONFERENCE", "PRESENTATION"], |
| src/wingman2/lib/competitorMatchEngine.ts | 452 | PRESENTATION | WIRELESS_PRESENTATION: ["WIRELESS_PRESENTATION", "PRESENTATION"], |
| src/wingman2/lib/competitorMatchEngine.ts | 455 | Unknown | UNKNOWN: [], |
| src/wingman2/lib/competitorMatchEngine.ts | 475 | PRESENTATION | if (/^SW-/.test(sku) \|\| category.includes("presentation")) { |
| src/wingman2/lib/competitorMatchEngine.ts | 476 | PRESENTATION | return "PRESENTATION"; |
| src/wingman2/lib/competitorMatchEngine.ts | 492 | Unknown | return "UNKNOWN"; |
| src/wingman2/lib/competitorMatchEngine.ts | 510 | Unknown | return "UNKNOWN"; |


## Required corrective direction

- Stop adding global DOM workflow guards for compare. They are now causing duplicated UI and masking the real engine behaviour.
- Move the workflow split, SKU click-to-run, reset behaviour and result presentation into `ComparePageNew.tsx` natively.
- The compare engine must fail closed: a candidate SKU must exist in `public/product-intelligence-index.json` before it can be shown.
- Eligibility corrections must never promote a different product class as the best match. They may only add adjacent options, clearly labelled.
- For wireless casting competitors, show no direct equivalent unless the user also describes wired AV, USB, conferencing or room switching requirements.
- Reduce the result page to decision content only: top direction, why it fits, confirm before quoting, and next action. Hide audit evidence by default.
- Competitor seed data is not enough for accurate comparisons unless each item has structured role, class, transport, I/O, resolution and required workflow metadata.

## Proposed native refactor

### 1. Remove overlay guards from main.tsx

Global compare-specific DOM guards should be removed after the native compare page is fixed. They create duplicated UI and are not reliable sources of truth.

### 2. Make ComparePageNew the only workflow owner

The page should own:

- workflow step state;
- manufacturer selection;
- known SKU selection;
- auto-run on SKU click;
- custom typed search;
- reset/start again;
- result display;
- evidence expansion.

### 3. Add a catalogue-backed candidate gate

Before rendering a WyreStorm recommendation:

1. candidate SKU must exist in product intelligence index;
2. candidate product family must match the competitor technology class;
3. candidate role must match the competitor role;
4. fallback/adjacent directions must be labelled as adjacent, not best match;
5. no direct equivalent must be allowed as a valid outcome.

### 4. Make result output decision-led

Visible by default:

- what Wingman understood;
- outcome;
- best direct match or no direct equivalent;
- why;
- check before quoting;
- next action.

Collapsed by default:

- other options;
- ruled-out list;
- copy-safe summary;
- diagnostic warnings;
- evidence text.

### 5. Data requirement

A competitor SKU is not enough unless it maps to structured fields:

- brand;
- model;
- technology class;
- product role;
- endpoint role;
- source/display I/O;
- transport;
- resolution;
- USB/audio/control requirements;
- known WyreStorm adjacent workflow type.

