export type KnownBoolean = boolean | null;
export type DataConfidence = "verified" | "high" | "medium" | "low" | "requires-review";
export type ProductLifecycle = "live" | "review" | "draft" | "do-not-use" | "discontinued" | "superseded" | "unlisted";

export type ProductTruth = {
  identity?: { role?: string | null; description?: string | null };
  videoInput?: { connector?: string | null; quantity?: number | null };
  videoOutput?: {
    connector?: string | null;
    routedQuantity?: number | null;
    mirroredHdmiQuantity?: number | null;
    hdBaseTQuantity?: number | null;
    localMonitorQuantity?: number | null;
    loopQuantity?: number | null;
  };
  videoCapability?: {
    maximumResolution?: string | null; maximumFrameRate?: number | null; chroma?: string | null;
    hdr?: KnownBoolean; scaling?: KnownBoolean; multiview?: KnownBoolean; videoWall?: KnownBoolean;
  };
  usb?: { supported?: KnownBoolean; version?: string | null; hostDeviceBehaviour?: string | null; kvm?: KnownBoolean };
  audio?: { embedded?: KnownBoolean; embedding?: KnownBoolean; deEmbedding?: KnownBoolean; analogue?: KnownBoolean; dante?: KnownBoolean };
  transport?: { hdBaseT?: KnownBoolean; avOverIp?: KnownBoolean; networkHdFamily?: "100" | "500" | "600" | null; networkClass?: string | null };
  control?: { ip?: KnownBoolean; rs232?: KnownBoolean; ir?: KnownBoolean; cec?: KnownBoolean; other?: string[] };
  dependencies?: { required?: string[]; compatibleAccessories?: string[]; requiredController?: string | null; requiredReceiverOrBase?: string | null; notes?: string | null };
  governance?: { confidence?: DataConfidence; sourceReferences?: string[]; lastVerifiedAt?: string | null; verificationNotes?: string | null; qualityFlags?: string[] };
};

export type ProductQualityIssue = "missing-video-capability" | "missing-io-topology" | "missing-classification" | "requires-review" | "low-confidence" | "never-verified" | "discontinued" | "missing-equivalence-review";

export type CompetitorEquivalenceStatus = "verified-equivalent" | "closest-alternative" | "application-alternative" | "no-direct-equivalent" | "requires-presales-review";
export type CompetitorEquivalenceRecord = {
  competitorManufacturer: string; competitorSku: string; wyrestormCandidateSku?: string | null;
  status: CompetitorEquivalenceStatus; evidence?: string[]; notes?: string | null; reviewer?: string | null;
  verifiedAt?: string | null; confidence: DataConfidence;
};

export type DiscoveryEvidence = {
  application?: string; roomType?: string; roomSize?: string; customerWording?: string;
  sources?: string[]; sourceLocations?: string[]; sourceConnections?: string[]; displays?: string[]; displayLocations?: string[];
  resolution?: string; distances?: string[]; usbRequirement?: string; ucRequirement?: string; cameraRequirement?: string;
  microphoneRequirement?: string; audioRequirement?: string; networkRequirement?: string; controlRequirement?: string;
  processingRequirement?: string; videoWallRequirement?: string; assumptions?: string[]; missingInformation?: string[];
  blockers?: string[]; nextBestQuestion?: string; likelyArchitecture?: string;
};

export type ProjectEvidenceFoundation = {
  discoveryEvidence?: DiscoveryEvidence; requirements?: string[]; architectureDirection?: string;
  productRecommendations?: string[]; comparisonRecordIds?: string[]; savedProductPitchIds?: string[];
  diagrams?: string[]; bom?: Array<{ sku: string; quantity: number }>; proposalHistory?: string[];
  assumptions?: string[]; risks?: string[]; missingInformation?: string[]; nextActions?: string[];
  readiness?: "ready" | "review" | "blocked"; confidence?: DataConfidence;
};
