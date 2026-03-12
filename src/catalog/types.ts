export type CatalogTransport =
  | "HDBaseT"
  | "AVoIP"
  | "Local"
  | "USB Extension"
  | "Unknown";

export type CatalogStatus = "active" | "legacy" | "draft";

export type CatalogPortCount = {
  type: string;
  count: number;
};

export type CatalogVideo = {
  maxResolution?: string;
  hdr?: boolean;
  hdmi?: string;
  bandwidthGbps?: number;
};

export type CatalogDistance = {
  meters?: number;
  notes?: string;
};

export type CatalogProduct = {
  sku: string;
  name: string;
  family: string;
  category: string;
  subcategory?: string;
  status: CatalogStatus;
  summary?: string;
  sourceUrl?: string;
  inputs?: CatalogPortCount[];
  outputs?: CatalogPortCount[];
  control?: string[];
  audio?: string[];
  video?: CatalogVideo;
  latency?: string;
  transport?: CatalogTransport;
  distance?: CatalogDistance;
  features?: string[];
  notes?: string;

  normalizedTags?: string[];
  ioSummary?: string;
  controlSummary?: string;
  matchKeywords?: string[];
};

export type CatalogFilters = {
  q?: string;
  family?: string;
  category?: string;
  transport?: CatalogTransport | "All";
  status?: CatalogStatus | "All";
  feature?: string | "All";
};

export type CatalogMatchRequest = {
  family?: string;
  category?: string;
  transport?: CatalogTransport | "All";
  requiredFeatures?: string[];
  minDistanceM?: number;
  q?: string;
};

export type CatalogMatchResult = {
  product: CatalogProduct;
  score: number;
  reasons: string[];
};
