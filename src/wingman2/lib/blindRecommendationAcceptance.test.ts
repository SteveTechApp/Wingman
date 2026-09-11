import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it, vi } from "vitest";

import type { StoredDiscoveryBrief } from "../data/projectStore";
import { discoveryBriefToFinderNeed } from "../data/workflowHandoff";
import { buildDiscoveryRecommendationEvidence } from "./recommendationEvidence";
import { clearProductIntelligenceIndexCache } from "./productIntelligenceIndexCache";
import { loadRecommendationsDecisionBoundary } from "./recommendationsDecisionBoundary";

type CustomerInput = { application: string; sourceCount?: number; displayCount?: number; displayBehaviour?: string; distancesByScope?: { endpointRouteMetres?: number; infrastructureMetres?: number }; resolution?: string; usbNeed?: string; audioNeed?: string; controlNeed?: string; networkNeed?: string; wirelessNeed?: string };
type Scenario = { id: string; input: CustomerInput; expected: { architecture: string; bom: Array<{ sku: string; quantity: number }>; requiredDependencies: string[]; forbidden: string[]; missingInformation: string[]; quoteSafety: "quote-ready" | "validate-before-quote" | "do-not-quote-yet" } };

const scenarios = (JSON.parse(readFileSync("data/wingman-blind-recommendation-scenarios.json", "utf8")) as { scenarios: Scenario[] }).scenarios;
const catalog = JSON.parse(readFileSync("public/product-intelligence-index.json", "utf8"));

function toBrief(input: CustomerInput): StoredDiscoveryBrief {
  const endpoint = input.distancesByScope?.endpointRouteMetres;
  const infrastructure = input.distancesByScope?.infrastructureMetres;
  return { savedAt: new Date(0).toISOString(), roomModel: { application: input.application, applicationType: input.application, outcome: [input.application, input.displayBehaviour, input.wirelessNeed].filter(Boolean).join("; "), customerWording: input.application, sourceCount: input.sourceCount, displayCount: input.displayCount, displayBehaviour: input.displayBehaviour, signalStandard: input.resolution, resolutionRequirement: input.resolution, cableRun: endpoint ? `${endpoint}m endpoint route` : undefined, longestRun: endpoint ? `${endpoint}m endpoint route` : undefined, distanceInfrastructureNotes: infrastructure ? `${infrastructure}m infrastructure route` : undefined, usbTransport: input.usbNeed, usbOwnership: input.usbNeed, audioPath: input.audioNeed, audioNeeds: input.audioNeed, controlNeeds: input.controlNeed, networkAvailability: input.networkNeed, network: input.networkNeed, devices: input.wirelessNeed ? [input.wirelessNeed] : [], unifiedCommunicationsRequirement: input.usbNeed, processingNeeds: input.displayBehaviour }, inference: {} } as StoredDiscoveryBrief;
}

function bomDiagnostic(expected: Scenario["expected"]["bom"], actual: Array<{ sku: string; quantity: number }>) {
  const expectedBySku = new Map(expected.map((row) => [row.sku, row.quantity]));
  const actualBySku = new Map(actual.map((row) => [row.sku, row.quantity]));
  const missing = expected.filter((row) => !actualBySku.has(row.sku)).map((row) => row.sku);
  const unexpected = actual.filter((row) => !expectedBySku.has(row.sku)).map((row) => row.sku);
  const quantities = expected.filter((row) => actualBySku.has(row.sku) && actualBySku.get(row.sku) !== row.quantity).map((row) => `${row.sku}: expected ${row.quantity}, received ${actualBySku.get(row.sku)}`);
  return `missing=[${missing.join(", ")}]; unexpected=[${unexpected.join(", ")}]; quantity-mismatched=[${quantities.join(", ")}]`;
}

beforeAll(() => {
  vi.stubGlobal("fetch", vi.fn(async (request: string | URL | Request) => String(request).includes("/api/product-intelligence") ? new Response(JSON.stringify({ records: [] }), { status: 200 }) : String(request).includes("/product-intelligence-index.json") ? new Response(JSON.stringify(catalog), { status: 200 }) : new Response("not found", { status: 404 })));
  clearProductIntelligenceIndexCache();
});

describe("blind Recommendations acceptance", () => {
  it.each(scenarios)("resolves $id through the production boundary", async (scenario) => {
    const brief = toBrief(scenario.input);
    const need = discoveryBriefToFinderNeed(brief) ?? {};
    const actual = await loadRecommendationsDecisionBoundary(brief, need);
    const bom = actual.systemSlots.flatMap(({ slot, candidates }) => candidates[0] ? [{ sku: candidates[0].sku, quantity: slot.quantity }] : []);
    const dependencies = actual.systemSlots.filter(({ slot }) => slot.required).map(({ slot }) => slot.kind);
    const evidence = buildDiscoveryRecommendationEvidence(brief);
    expect(actual.design.architecture, scenario.id).toBe(scenario.expected.architecture);
    expect(bom, `${scenario.id}: ${bomDiagnostic(scenario.expected.bom, bom)}`).toEqual(scenario.expected.bom);
    expect(dependencies, `${scenario.id}: exact required system roles`).toEqual(scenario.expected.requiredDependencies);
    for (const forbidden of scenario.expected.forbidden) expect(forbidden === "*" ? bom.length === 0 : !bom.some(({ sku }) => sku.includes(forbidden)), `${scenario.id}: forbidden ${forbidden}`).toBe(true);
    for (const missing of scenario.expected.missingInformation) expect([...actual.design.openQuestions, ...evidence.missingInformation].some((item) => item.toLowerCase().includes(missing.toLowerCase())), `${scenario.id}: missing ${missing}`).toBe(true);
    expect(evidence.quoteSafetyStatus, scenario.id).toBe(scenario.expected.quoteSafety);
  });
});
