export type ComparisonStage =
  | "idle"
  | "dataset"
  | "web"
  | "extract"
  | "match"
  | "done"
  | "error";

export type CompetitorLookupTrace = {
  stage: ComparisonStage;
  message: string;
  sourceLabel?: string;
  checkedUrl?: string;
  usedLiveData?: boolean;
  confidence?: number;
  updatedAt?: string;
};

export type CompetitorSpecRecord = {
  brand: string;
  sku: string;
  title?: string;
  category?: string;
  inputs?: string[];
  outputs?: string[];
  maxResolution?: string;
  bandwidthGbps?: number;
  hdcp?: string;
  control?: string[];
  usb?: string[];
  distance?: string;
  notes?: string[];
  sourceUrl?: string;
  lastVerifiedAt?: string;
  [key: string]: unknown;
};

export type LiveLookupResult = {
  trace: CompetitorLookupTrace[];
  record?: CompetitorSpecRecord;
  error?: string;
  mode?: string;
  warnings?: string[];
};

export type VideoSpec = {
  maxResolution?: string;
  bandwidthGbps?: number;
  hdcp?: string;
  [key: string]: unknown;
};

export type Product = {
  id?: string;
  sku?: string;
  partNumber?: string;
  name?: string;
  title?: string;
  brand?: string;
  manufacturer?: string;
  category?: string;
  family?: string;
  subcategory?: string;
  familyHint?: string;
  role?: string;

  description?: string;
  summary?: string;

  inputs?: string[];
  outputs?: string[];
  features?: string[];
  keywords?: string[];
  tags?: string[];
  control?: string[];
  usb?: string[];

  maxResolution?: string;
  resolution?: string;
  bandwidthGbps?: number;
  hdcp?: string;
  distance?: string;
  msrp?: number | string;
  price?: number | string;

  video?: VideoSpec;

  notes?: string[];
  sourceUrl?: string;
  lastVerifiedAt?: string;

  [key: string]: unknown;
};

export type CompetitorItem = {
  id?: string;
  sku?: string;
  partNumber?: string;
  name?: string;
  title?: string;
  brand?: string;
  manufacturer?: string;
  category?: string;
  family?: string;
  subcategory?: string;
  familyHint?: string;
  role?: string;

  description?: string;
  summary?: string;

  inputs?: string[];
  outputs?: string[];
  features?: string[];
  keywords?: string[];
  tags?: string[];
  control?: string[];
  usb?: string[];

  maxResolution?: string;
  resolution?: string;
  bandwidthGbps?: number;
  hdcp?: string;
  distance?: string;
  msrp?: number | string;
  price?: number | string;

  video?: VideoSpec;

  notes?: string[];
  sourceUrl?: string;
  lastVerifiedAt?: string;

  [key: string]: unknown;
};

export type MatchReason = {
  key: string;
  score: number;
  text: string;
};

export type MatchResult = {
  competitor?: CompetitorItem;
  competitorItem?: CompetitorItem;
  product?: Product;
  wyrestormProduct?: Product;

  score?: number;
  confidence?: number;
  reason?: MatchReason;
  reasons?: MatchReason[];

  matchType?: string;
  notes?: string[];
  explanation?: string;

  trace?: CompetitorLookupTrace[];

  [key: string]: unknown;
};
