import {
  findApprovedCompetitorMatchDecision,
  type CompetitorMatchDecision,
  type CompetitorMatchDecisionLedger,
} from "./competitorMatchDecisionLedger";

export function resolveApprovedGovernedDecision(
  ledger: CompetitorMatchDecisionLedger,
  manufacturer: string,
  competitorSku: string,
): CompetitorMatchDecision | null {
  return findApprovedCompetitorMatchDecision(
    ledger,
    manufacturer,
    competitorSku,
  );
}

export function governedDecisionSuppressesCandidates(
  decision: CompetitorMatchDecision | null,
): boolean {
  return decision?.decisionType === "no-suitable-match";
}

export function applyGovernedCandidateOrder<T>(
  candidates: readonly T[],
  decision: CompetitorMatchDecision | null,
  getSku: (candidate: T) => string,
): T[] {
  if (!decision) return [...candidates];
  if (governedDecisionSuppressesCandidates(decision)) return [];

  const targetSku = String(decision.wyrestormSku ?? "")
    .trim()
    .toUpperCase();

  if (!targetSku) return [...candidates];

  const target = candidates.find(
    (candidate) => getSku(candidate).trim().toUpperCase() === targetSku,
  );

  if (!target) return [...candidates];

  return [
    target,
    ...candidates.filter(
      (candidate) => getSku(candidate).trim().toUpperCase() !== targetSku,
    ),
  ];
}

export function governedDecisionLabel(
  decision: CompetitorMatchDecision,
): string {
  switch (decision.decisionType) {
    case "confirmed-equivalent":
      return "Confirmed equivalent";
    case "closest-technical-match":
      return "Approved closest technical match";
    case "architecture-alternative":
      return "Approved architecture alternative";
    case "review-required":
      return "Technical review required";
    case "no-suitable-match":
      return "Approved no suitable match";
  }
}