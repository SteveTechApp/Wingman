export type CompetitorManualLookupRequest = {
  manufacturer: string;
  model: string;
  productUrl?: string;
};

export function buildCompetitorLookupDisplayName(input: CompetitorManualLookupRequest): string {
  return `${input.manufacturer} ${input.model}`.trim();
}