import type { StoredDiscoveryBrief } from "../../../data/projectStore";
import type { FinderNeedDraft } from "../../../data/workflowHandoff";
import {
  loadRecommendationsDecisionBoundary,
  resolveRecommendationSystemSlots,
  type RecommendationDecision,
} from "../../../lib/recommendationsDecisionBoundary";

export type RecommendationResult = Awaited<ReturnType<typeof loadRecommendationsDecisionBoundary>>;

export type BuildRecommendationInput = {
  brief: StoredDiscoveryBrief | null;
  need: Partial<FinderNeedDraft>;
};

export type BuildRecommendationDependencies = {
  loadDecisionBoundary: (
    brief: StoredDiscoveryBrief | null,
    need: Partial<FinderNeedDraft>,
  ) => Promise<RecommendationResult>;
};

const defaultDependencies: BuildRecommendationDependencies = {
  loadDecisionBoundary: loadRecommendationsDecisionBoundary,
};

/** Route-independent orchestration for the governed recommendation result. */
export function buildRecommendation(
  input: BuildRecommendationInput,
  dependencies: BuildRecommendationDependencies = defaultDependencies,
): Promise<RecommendationResult> {
  return dependencies.loadDecisionBoundary(input.brief, input.need);
}

export type { RecommendationDecision };
export { resolveRecommendationSystemSlots };
