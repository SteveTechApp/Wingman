export type TransportFamily =
  | "local"
  | "twisted-pair"
  | "fiber"
  | "ethernet-ip"
  | "wireless"
  | "usb"
  | "audio-network"
  | "unknown";

export type StandardRelationship =
  | "native"
  | "certified"
  | "compatible"
  | "selectable-mode"
  | "based-on"
  | "proprietary"
  | "not-applicable"
  | "unknown";

export type InteroperabilityClass =
  | "open-standard"
  | "third-party-compatible"
  | "vendor-ecosystem"
  | "partial"
  | "requires-matched-endpoint"
  | "unknown";

export type CompressionClass =
  | "uncompressed"
  | "lossless"
  | "visually-lossless"
  | "intra-frame"
  | "long-gop"
  | "unknown";

export type TechnologyEvidence = {
  sourceUrl?: string;
  sourceType?: "manufacturer" | "standards-body" | "distributor" | "inferred";
  statement?: string;
  confidence?: "verified" | "high" | "medium" | "low" | "requires-review";
};

export type ProductTechnologyProfile = {
  vendorTechnology?: string;
  canonicalTransport?: string;
  transportFamily?: TransportFamily;
  standardRelationship?: StandardRelationship;
  interoperability?: InteroperabilityClass;

  networkClass?: string;
  codecName?: string;
  codecStandard?: string;
  compressionClass?: CompressionClass;
  latencyClass?: string;

  medium?: string;
  distanceMeters?: number;
  powerMethod?: string;

  controllerRequirement?: string;
  notes?: string[];
  evidence?: TechnologyEvidence[];
  matchedRuleIds?: string[];
};

export type TechnologyNormalisationInput = {
  manufacturer?: string;
  sku?: string;
  model?: string;
  family?: string;
  productClass?: string;
  transport?: string;
  technology?: string;
  summary?: string;
  description?: string;
  features?: unknown;
  specs?: unknown;
  sourceUrl?: string;
};