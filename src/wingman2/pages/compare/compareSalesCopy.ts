/**
 * The sentences the compared cards print about a competitor and a candidate.
 *
 * Pure: a summary and a candidate in, copy out - the role label, what to ask the
 * customer, the identity callouts and the two confidence labels. They live
 * together because a card prints several of them at once and they must agree
 * about how confident the comparison is.
 */
import { uniqueText, competitorPlainEnglishPurpose } from "../../lib/repScript";
import { type ScoredCandidate } from "../../features/compare";
import type { CompetitorSummary } from "./compareTypes";
import type { CompareReportedStatus } from "./compareReportedStatus";
import { compareReportedStatusMeta } from "./compareReportedStatus";

export function shortRoleLabel(role: string): string {
  const value = role.trim();
  if (/ndi camera/i.test(value)) return "NDI camera";
  if (/ptz camera/i.test(value)) return "PTZ camera";
  if (/wireless casting/i.test(value)) return "wireless presentation endpoint";
  if (/encoder|transmitter/i.test(value)) return "source-side AV-over-IP encoder";
  if (/decoder|receiver/i.test(value)) return "display-side AV-over-IP decoder";
  if (/transceiver/i.test(value)) return "AV-over-IP transceiver";
  if (/tx\/rx extender kit/i.test(value)) return "point-to-point HDBaseT extender kit";
  if (/usb extender/i.test(value)) return "USB extension endpoint";
  if (/presentation switcher|switcher/i.test(value)) return "presentation switcher";
  if (/matrix/i.test(value)) return "matrix switcher";
  if (/video wall/i.test(value)) return "video wall processor";
  return value.toLowerCase();
}

function _salesOutcomeBadges(competitor: CompetitorSummary, candidate: ScoredCandidate): string[] {
  const badges: string[] = [];

  if (candidate.outcomeLabel !== "Wrong product type" && candidate.outcomeLabel !== "Insufficient competitor data") badges.push("Correct product direction");
  if (candidate.matched.some((item) => /Same endpoint role/i.test(item))) badges.push("Same product job");
  if (candidate.matched.some((item) => /Same product class|Same product class: point-to-point HDBaseT extender path|Same NetworkHD 500 source-side encoder architecture|matrix/i.test(item))) badges.push("Same system type");
  if (candidate.mismatches.length > 0 || candidate.blockers.length > 0) badges.push("Not drop-in compatible");
  if (candidate.unknowns.length > 0 || competitor.warning) badges.push("Feature check needed");
  if (candidate.outcomeLabel === "Wrong product type") badges.push("Wrong product type");
  if (candidate.outcomeLabel === "Insufficient competitor data") badges.push("Insufficient competitor data");

  return uniqueText(badges, 5);
}

export function salesAskCustomer(competitor: CompetitorSummary, candidate: ScoredCandidate): string[] {
  const visiblePrompts = uniqueText([
    ...competitor.verifyItems,
    ...candidate.dependencies,
    ...candidate.unknowns,
  ], 8).filter((item) => !/^Why this matters:/i.test(item) && !/^Educational point:/i.test(item));

  if (competitor.warning) {
    return visiblePrompts.slice(0, 5);
  }

  return visiblePrompts.slice(0, 5);
}

function _salesWhatItDoes(competitor: CompetitorSummary): string {
  return `${competitor.heading} is used to ${competitorPlainEnglishPurpose(competitor)}.`;
}

export function competitorIdentityItems(competitor: CompetitorSummary): string[] {
  return uniqueText([
    ...competitor.identityItems,
    competitor.resolution && competitor.resolution !== "Not verified locally" && !competitor.identityItems.some((item) => item.includes(competitor.resolution))
      ? `Key feature callouts: Resolution ${competitor.resolution}.`
      : "",
  ], 4);
}

export function openGuruForCompareResult(
  competitor: CompetitorSummary,
  candidate: ScoredCandidate | null,
  status: CompareReportedStatus,
) {
  if (typeof window === "undefined") {
    return;
  }

  const statusLabel = compareReportedStatusMeta(status).label;
  const candidateLine = candidate
    ? `WyreStorm direction: ${candidate.product.sku} - ${candidate.product.name}.`
    : "No WyreStorm candidate was returned.";
  const coreRequirement = candidate
    ? `${competitorPlainEnglishPurpose(competitor)} The WyreStorm option must preserve the ${candidate.product.role.toLowerCase()} role in a ${candidate.product.family} system.`
    : competitorPlainEnglishPurpose(competitor);
  const evidence = candidate ? uniqueText([...candidate.matched, ...candidate.partialMatches], 4) : [];
  const differences = candidate ? uniqueText([...candidate.mismatches, ...candidate.gaps], 4) : [];
  const dependencies = candidate ? uniqueText([...candidate.dependencies, ...candidate.unknowns, ...candidate.checks], 5) : competitor.verifyItems.slice(0, 5);

  const prompt = [
    "Act as the WyreStorm technical product manager for this Wingman Compare result.",
    `Result status: ${statusLabel}.`,
    `Competitor: ${competitor.heading} - ${competitor.detail}.`,
    candidateLine,
    `Core requirement: ${coreRequirement}.`,
    evidence.length ? `Match evidence: ${evidence.join(" | ")}.` : "Match evidence: No confirmed matching evidence was recorded.",
    differences.length ? `Important differences: ${differences.join(" | ")}.` : "Important differences: No explicit functional difference is recorded; do not assume exact equivalence.",
    dependencies.length ? `Dependencies and checks: ${dependencies.join(" | ")}.` : "Dependencies and checks: Confirm lifecycle, accessories and complete signal-path compatibility.",
    "Response request: Explain the technical reason this option is being considered, the nuanced differences that affect design or customer positioning, what must be confirmed, and the next two questions the salesperson should ask.",
    "Speak with product-manager authority, remain evidence-led, and invite a useful follow-up about I/O, topology, dependencies or customer wording. Do not answer only with a glossary definition.",
  ].join(" ");

  window.dispatchEvent(
    new CustomEvent("wingman:open-guru", {
      detail: {
        prompt,
        source: "competitor-compare",
        competitor: competitor.heading,
        wyrestormSku: candidate?.product.sku ?? null,
        resultStatus: status,
      },
    }),
  );
}

export function salesDirectionFitLabel(candidate: ScoredCandidate): string {
  if (candidate.outcomeLabel === "Insufficient competitor data") return "Insufficient competitor data";
  if (candidate.outcomeLabel === "Wrong product type") return "Wrong product type";
  return "Correct product direction";
}

export function salesReplacementConfidenceLabel(competitor: CompetitorSummary, candidate: ScoredCandidate): string {
  if (/av-over-ip/i.test(competitor.recognisedClass) && /^NHD-/i.test(candidate.product.sku)) {
    return "Not a drop-in replacement";
  }

  if (candidate.mismatches.length > 0 || candidate.blockers.length > 0) {
    return "Not a drop-in replacement";
  }

  if (candidate.unknowns.length > 0 || competitor.warning) {
    return "Feature check needed";
  }

  return "Same product job";
}
