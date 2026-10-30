/**
 * The single status a compare result is reported as.
 *
 * One result reads as a match, a set of checks, a partial answer or no match,
 * and the rail, the guru prompt and the page summary all print that one word.
 * Keeping the derivation here is what stops the three from deciding separately.
 */
import { type ScoredCandidate } from "../../features/compare";
import type { CompetitorSummary } from "./compareTypes";

export type CompareReportedStatus = "match" | "checks" | "partial" | "no-match";

export const COMPARE_REPORTED_STATUS_OPTIONS: Array<{
  key: CompareReportedStatus;
  label: string;
}> = [
  { key: "match", label: "Match" },
  { key: "checks", label: "Further checks required" },
  { key: "partial", label: "Partial match" },
  { key: "no-match", label: "No match" },
];

export function compareReportedStatus(
  candidate: ScoredCandidate | null,
  competitor: CompetitorSummary,
): CompareReportedStatus {
  if (!candidate || candidate.verdict === "NO MATCH") {
    return "no-match";
  }

  // Blue takes precedence whenever the product direction still depends on
  // unresolved technical evidence, dependencies, warnings or quote blockers.
  if (
    candidate.verdict === "VERIFY" ||
    candidate.verdict === "ARCHITECTURE ALTERNATIVE" ||
    candidate.outcomeLabel === "Insufficient competitor data" ||
    candidate.blockers.length > 0 ||
    candidate.unknowns.length > 0 ||
    candidate.dependencies.length > 0 ||
    Boolean(competitor.warning)
  ) {
    return "checks";
  }

  if (candidate.verdict === "PARTIAL MATCH") {
    return "partial";
  }

  return "match";
}

export function compareReportedStatusMeta(status: CompareReportedStatus): {
  label: string;
  heading: string;
  guidance: string;
} {
  if (status === "match") {
    return {
      label: "Match",
      heading: "Suitable WyreStorm match",
      guidance: "The product direction aligns with the evidenced requirement.",
    };
  }

  if (status === "checks") {
    return {
      label: "Further checks required",
      heading: "Technical checks required",
      guidance: "The direction is plausible, but evidence or dependencies must be confirmed before quotation.",
    };
  }

  if (status === "partial") {
    return {
      label: "Partial match",
      heading: "Partial WyreStorm match",
      guidance: "The product covers part of the requirement, but the differences must be explained.",
    };
  }

  return {
    label: "No match",
    heading: "No suitable WyreStorm match",
    guidance: "Do not position a WyreStorm equivalent until the requirement or missing evidence changes.",
  };
}
