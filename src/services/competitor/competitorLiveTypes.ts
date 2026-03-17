export type CompetitorLookupInput = {
  manufacturer: string;
  model: string;
  productUrl?: string;
};

export type CompetitorLiveRecord = {
  manufacturer: string;
  model: string;
  productUrl?: string;
  title?: string;
  summary?: string;
  category?: string;
  technology?: string;
  features: string[];
  rawText?: string;
  extractedAtIso?: string;
  source: "database" | "live-page";
};

export type CompetitorLookupResolution = {
  found: boolean;
  record?: CompetitorLiveRecord;
  usedLiveFallback: boolean;
  databaseUpdated: boolean;
  reason?: string;
};