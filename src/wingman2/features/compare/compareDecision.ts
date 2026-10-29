import { resolveCompareVerdictCandidates } from "../../lib/compareVerdictPipeline";

/**
 * Public governed Compare decision interface. Route code renders this result;
 * it does not own candidate policy.
 *
 * Forwarded rather than aliased: an alias reads the pipeline when this module
 * loads, and a chunk pair that imports each other can evaluate this module
 * first, which would leave the decision undefined for the rest of the session.
 */
export const decideComparison: typeof resolveCompareVerdictCandidates =
  (...args) => resolveCompareVerdictCandidates(...args);

export type {
  CompareVerdictResult as CompareDecision,
  PipelineCompetitorProfile,
  ScoredCandidate,
  Verdict,
  WyreStormProduct,
} from "../../lib/compareVerdictPipeline";
