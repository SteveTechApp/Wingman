export type Confidence = "high" | "medium" | "low";

export type ResolutionValue = "8K" | "4K60" | "4K30" | "1080p";
export type TransportValue = "HDBaseT" | "AVoIP" | "DTP" | "SDVoE" | "Unknown";
export type AvailabilityValue = "stocked" | "special-order" | "end-of-life" | "unknown";

export type SpecField<T> = {
  value?: T | undefined;
  confidence: Confidence;
  source?: string;
};

export type MaybeScored<T> = T | SpecField<T | undefined> | undefined;

export type VideoSpec = {
  maxResolution?: MaybeScored<ResolutionValue>;
  bandwidthGbps?: MaybeScored<number>;
  hdcp?: MaybeScored<string>;
  hdr?: MaybeScored<boolean>;
};

export type ConnectivitySpec = {
  inputs?: MaybeScored<string[]>;
  outputs?: MaybeScored<string[]>;
  transport?: MaybeScored<TransportValue>;
  poe?: MaybeScored<boolean>;
};

export type DistanceSpec = {
  maxMeters1080p?: MaybeScored<number>;
  maxMeters4k?: MaybeScored<number>;
};

export type AudioSpec = {
  audioFormats?: MaybeScored<string[]>;
  analogBreakout?: MaybeScored<boolean>;
};

export type CommercialSpec = {
  estimatedStreetPriceGbp?: MaybeScored<number>;
  availability?: MaybeScored<AvailabilityValue>;
};

export type CompetitorItem = {
  id?: string;
  brand: string;
  sku: string;
  name?: string;
  model?: string;
  category?: string;
  family?: string;
  lifecycle?: "active" | "legacy" | "draft";
  notes?: string;
  sourceSummary?: string;
  lastUpdated?: string;

  video?: VideoSpec;
  connectivity?: ConnectivitySpec;
  distance?: DistanceSpec;
  audio?: AudioSpec;
  commercial?: CommercialSpec;

  role?: string;
  features?: string[];
  familyHint?: string;
  sourceurl?: string;
  io?: unknown;
  url?: string;
};

export type Product = {
  brand?: string;
  sku?: string;
  name?: string;
  model?: string;
  category?: string;
  family?: string;
  role?: string;
  video?: {
    maxResolution?: ResolutionValue | string;
    bandwidthGbps?: number;
  };
  connectivity?: {
    transport?: TransportValue | string;
    inputs?: string[];
    outputs?: string[];
  };
  features?: string[];
};

export type MatchReason = {
  key: string;
  score: number;
  text: string;
};

export type MatchResult = {
  candidate?: CompetitorItem;
  competitor?: CompetitorItem;
  product?: Product;
  score: number;
  percent?: number;
  reasons: MatchReason[];
};

export type CompetitorLookupTrace = {
  stage: string;
  message: string;
  at?: string;
  updatedAt?: string;
  sourceLabel?: string;
  checkedUrl?: unknown;
  usedLiveData?: boolean;
  confidence?: number;
  payload?: unknown;
};

export type CompetitorSpecRecord = Record<string, unknown> & {
  brand?: string;
  sku?: string;
  source?: string;
  url?: string;
};

export type LiveLookupResult = {
  ok?: boolean;
  brand?: string;
  sku?: string;
  source?: string;
  sourceurl?: string;
  sourceLabel?: string;
  traces?: CompetitorLookupTrace[];
  trace?: CompetitorLookupTrace[];
  specs?: CompetitorSpecRecord;
  record?: CompetitorSpecRecord;
  mode?: string;
  warnings?: unknown[];
  error?: string;
};

export type PartialCompetitorSeed = Partial<Omit<CompetitorItem, "video" | "connectivity" | "distance" | "audio" | "commercial">> & {
  video?: Partial<VideoSpec>;
  connectivity?: Partial<ConnectivitySpec>;
  distance?: Partial<DistanceSpec>;
  audio?: Partial<AudioSpec>;
  commercial?: Partial<CommercialSpec>;
};

export type EnrichmentWarning = {
  code: string;
  message: string;
  severity: "info" | "warning" | "error";
};

export type EnrichmentResult = {
  item: CompetitorItem;
  qualityScore: number;
  completenessBand: "complete" | "usable" | "needs-enrichment";
  warnings: EnrichmentWarning[];
};