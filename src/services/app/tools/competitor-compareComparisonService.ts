export type CompetitorMatchInput = {
  competitor?: string;
  competitorSku?: string;
  model?: string;
  text?: string;
  requirements?: any;
};

export type CompetitorMatch = {
  competitorSku: string;
  wyrestormSku?: string;
  confidence?: number;
  notes?: string[];
};

export type CompetitorMatchResult = {
  summary: string;
  matches: CompetitorMatch[];
};

/**
 * Expected by CompetitorMatchFinderPanel.tsx
 * Minimal stub: returns no matches (unblocks build).
 * Replace later with real matching logic + data sources.
 */
export function findWyreStormMatches(input: CompetitorMatchInput): CompetitorMatchResult {
  const sku = input?.competitorSku || input?.model || "";
  return {
    summary: sku ? "No matches found (stub)." : "No input provided (stub).",
    matches: []
  };
}

/**
 * Backwards-compatible API (kept if other code calls it)
 */
export function runCompetitorCompare(input: CompetitorMatchInput): CompetitorMatchResult {
  return findWyreStormMatches(input);
}

export default {
  findWyreStormMatches,
  runCompetitorCompare
};