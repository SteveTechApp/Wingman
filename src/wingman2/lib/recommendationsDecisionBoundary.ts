import { recommendationCandidateAllowed } from "./recommendationSafety";
import type { StoredDiscoveryBrief } from "../data/projectStore";
import type { FinderNeedDraft } from "../data/workflowHandoff";
import { buildSystemDesign, productMatchesSlot, ucAllInOneCoverage, type SystemSlot } from "./discoverySystemDesign";
import { loadWingmanProductSelectorDecisions, type ProductSelectorDecision, type ProductSelectorRequest } from "./productSelectorEngine";
import { readClassificationFacts } from "./productStoryEngine";

export type RecommendationDecision = Awaited<ReturnType<typeof loadWingmanProductSelectorDecisions>>[number];
export type RecommendationSystemSlotResult = { slot: SystemSlot; candidates: RecommendationDecision[]; ucCovered?: boolean };

export function recommendationRequest(need: Partial<FinderNeedDraft>): ProductSelectorRequest {
  return {
    mode: "recommendations",
    query: need.query ?? "",
    technicalRequirement: need.technicalRequirement ?? "",
    productPath: need.productPath ?? "",
    technologyType: need.technologyType ?? "",
    signalType: need.signalType ?? "",
    sourceConnector: need.sourceConnector ?? "",
    displayConnector: need.displayConnector ?? "",
    inputs: need.inputs ?? "",
    outputs: need.outputs ?? "",
    distance: need.distance ?? "",
    resolution: need.resolution ?? "",
    usb: need.usb ?? "",
    audio: need.audio ?? "",
    network: need.network ?? "",
    processing: need.processing ?? "",
    control: need.control ?? "",
    includeArchitectureAlternatives: true,
    includeDependencies: true,
  };
}

export function recommendationSlotRequest(): ProductSelectorRequest {
  return {
    mode: "recommendations",
    includeDependencies: true,
    includeAccessories: true,
    includeArchitectureAlternatives: true,
  };
}

function classification(decision: ProductSelectorDecision) {
  return readClassificationFacts(decision.product as Record<string, unknown>);
}

export function resolveRecommendationSystemSlots(
  brief: StoredDiscoveryBrief | null,
  slotPool: RecommendationDecision[],
) {
  const design = buildSystemDesign(brief);
  const raw: RecommendationSystemSlotResult[] = design.slots.map((slot) => ({
    slot,
    candidates: slot.supply === "external" ? [] : slotPool
      .filter((decision) => decision.eligible)
      .filter((decision) => productMatchesSlot(classification(decision), slot))
      .filter((decision) => recommendationCandidateAllowed(
        decision,
        slot.kind,
        [brief?.roomModel, brief],
      ))
      .slice(0, 4),
  }));
  const coveredByUc = new Set<string>();
  for (const entry of raw) {
    const coverage = entry.candidates[0] ? ucAllInOneCoverage(classification(entry.candidates[0])) : null;
    coverage?.forEach((kind) => coveredByUc.add(kind));
  }
  return {
    design,
    systemSlots: coveredByUc.size === 0 ? raw : raw.map((entry) => coveredByUc.has(entry.slot.kind)
      ? { ...entry, candidates: [], ucCovered: true }
      : entry),
  };
}

export async function loadRecommendationsDecisionBoundary(
  brief: StoredDiscoveryBrief | null,
  need: Partial<FinderNeedDraft>,
) {
  const [decisions, slotPool] = await Promise.all([
    loadWingmanProductSelectorDecisions(recommendationRequest(need)),
    loadWingmanProductSelectorDecisions(recommendationSlotRequest()),
  ]);
  return { decisions, slotPool, ...resolveRecommendationSystemSlots(brief, slotPool) };
}
