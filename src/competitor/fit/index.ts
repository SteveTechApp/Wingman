import { buildStructuredProduct } from "./classifier";
import { rankStructuredCandidates } from "./score";
import type { StructuredFitResult } from "./types";

type RawCandidate = {
  sku: string;
  name?: string;
  summary?: string;
  description?: string;
  category?: string;
  technology?: string;
  features?: string[];
};

export function compareStructuredCompetitor(
  competitor: RawCandidate,
  candidates: RawCandidate[]
): StructuredFitResult[] {
  const structuredCompetitor = buildStructuredProduct(competitor);
  const structuredCandidates = candidates.map(buildStructuredProduct);

  return rankStructuredCandidates(structuredCompetitor, structuredCandidates);
}