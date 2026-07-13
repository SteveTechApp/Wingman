export const TEMPLATE_MARKETS = [
  "Corporate",
  "Education",
  "Government",
  "Healthcare",
  "Hospitality",
  "Retail",
  "Sports & Leisure",
  "House of Worship",
  "Control Rooms",
  "Transportation",
  "Broadcast / Media",
  "Residential",
] as const;

export type TemplateMarket = (typeof TEMPLATE_MARKETS)[number];

export const ALL_MARKET_FILTER = "All";
export const CUSTOM_MARKET_FILTER = "Custom";

export const TEMPLATE_MARKET_FILTERS = [ALL_MARKET_FILTER, ...TEMPLATE_MARKETS, CUSTOM_MARKET_FILTER];

// Older room templates were authored before this market list existed. Map their
// vertical text onto the closest canonical market rather than rewriting 37 records.
const LEGACY_MARKET_ALIASES: Record<string, string> = {
  Venue: "House of Worship",
  Transport: "Transportation",
};

export function normalizeTemplateMarket(vertical: string): string {
  const clean = (vertical ?? "").trim();
  return LEGACY_MARKET_ALIASES[clean] || clean;
}

export function templateMatchesMarketFilter(
  template: { vertical: string; customTemplate?: boolean },
  filter: string,
): boolean {
  if (filter === ALL_MARKET_FILTER) return true;
  if (filter === CUSTOM_MARKET_FILTER) return template.customTemplate === true;
  return normalizeTemplateMarket(template.vertical) === filter;
}
