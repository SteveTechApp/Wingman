import { resolveCompareVerdictCandidates } from "../../lib/compareVerdictPipeline";

/** Public governed Compare decision interface. Route code renders this result; it does not own candidate policy. */
export const decideComparison = resolveCompareVerdictCandidates;

export type {
  CompareVerdictResult as CompareDecision,
  PipelineCompetitorProfile,
  ScoredCandidate,
  Verdict,
  WyreStormProduct,
} from "../../lib/compareVerdictPipeline";
