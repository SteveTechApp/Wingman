import type { StoredDiscoveryBrief, StoredProductSelection, StoredProject } from "../projects";
import { discoveryBriefToFinderNeed } from "../../data/workflowHandoff";
import { buildDiscoveryRecommendationEvidence } from "../../lib/recommendationEvidence";
import { loadRecommendationsDecisionBoundary } from "../../lib/recommendationsDecisionBoundary";
import { compileDesignProject } from "./compileDesignProject";

export async function compileRecommendedDesignProject(project: StoredProject, brief: StoredDiscoveryBrief, compiledAt = new Date().toISOString()) {
  const boundary = await loadRecommendationsDecisionBoundary(brief, discoveryBriefToFinderNeed(brief) ?? {});
  const selections: StoredProductSelection[] = boundary.systemSlots.flatMap(({ slot, candidates }) => {
    const candidate = candidates[0];
    if (!candidate) return [];
    const product = candidate.product as Record<string, unknown>;
    const title = String(product.title ?? product.productName ?? candidate.sku);
    const family = String(product.family ?? product.category ?? "");
    return [{ sku: candidate.sku, title, family: family || undefined, category: slot.label, quantity: slot.quantity, status: "recommended" as const, source: "Design Project recommendation", evidence: candidate.reasons ?? [] }];
  });
  const enrichedBrief: StoredDiscoveryBrief = { ...brief, inference: { ...(brief.inference ?? {}), architecture: boundary.design.architecture }, recommendationEvidence: buildDiscoveryRecommendationEvidence(brief) };
  return compileDesignProject({ ...project, discoveryBrief: enrichedBrief, recommendationEvidence: enrichedBrief.recommendationEvidence, productSelections: selections }, compiledAt);
}
