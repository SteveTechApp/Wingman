import type { ResolvedCompetitorProfile } from "../../lib/competitorSpecRegistry";

/**
 * The shapes the compare page and its helper modules share: what a competitor
 * product is once it has been read, and what a rendered fact sheet carries.
 * Types only, so a module can depend on them without pulling the page in.
 */
export type CompetitorProfile = {
  brand: string;
  sku: string;
  rawText: string;
  productClass: string;
  role: string;
  transport: string;
  requestedTags: string[];
  videoTags: string[];
  knownProfile: Record<string, unknown> | null;
  resolvedSpec: ResolvedCompetitorProfile | null;
};

export type CompetitorSummary = {
  heading: string;
  detail: string;
  recognisedClass: string;
  role: string;
  signalDirection: string;
  transport: string;
  resolution: string;
  ecosystem: string;
  facts: Array<{ label: string; value: string }>;
  identityItems: string[];
  knownFeatures: string[];
  unknownFeatures: string[];
  verifyItems: string[];
  outcomeLabel: string;
  warning: string;
  sourceUrl?: string;
};

export type WyreStormSummary = {
  heading: string;
  detail: string;
  family: string;
  productType: string;
  role: string;
  signalDirection: string;
  transport: string;
  resolution: string;
  headlineIo: string;
  identityItems: string[];
  facts: Array<{ label: string; value: string }>;
  comparisonFacts: Array<{ label: string; value: string }>;
};

export type CompareCoreFact = {
  label: string;
  competitor: string;
  wyrestorm: string;
  result: string;
};
