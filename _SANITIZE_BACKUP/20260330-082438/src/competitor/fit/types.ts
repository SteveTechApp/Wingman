export type TransportClass =
  | "AVOIP"
  | "HDBASET"
  | "HDMI_DISTRIBUTION"
  | "USB_EXTENSION"
  | "UNKNOWN";

export type ComparisonDomain =
  | "AVOIP"
  | "MATRIX"
  | "PRESENTATION"
  | "EXTENDER"
  | "VIDEO_WALL"
  | "CONTROL"
  | "UNKNOWN";

export type ComparisonUseCase =
  | "DISTRIBUTION"
  | "COLLABORATION"
  | "ROUTING"
  | "MULTIVIEW"
  | "WALL_PROCESSING"
  | "EXTENSION"
  | "CONTROL"
  | "UNKNOWN";

export type ComparisonHints = {
  preferredDomains: ComparisonDomain[];
  preferredUseCases: ComparisonUseCase[];
  avoidDomains: ComparisonDomain[];
  avoidUseCases: ComparisonUseCase[];
  rankLowerUseCases: ComparisonUseCase[];
};

export type AvoipSubtype =
  | "JPEG2000"
  | "H264_H265"
  | "SDVOE"
  | "PROPRIETARY"
  | "MULTIVIEW"
  | "UNKNOWN";

export type HdbtGeneration =
  | "HDBT_2_0"
  | "HDBT_3_0"
  | "UNKNOWN";

export type DeviceRole =
  | "ENCODER"
  | "DECODER"
  | "MULTIVIEW_DECODER"
  | "SWITCHER"
  | "MATRIX"
  | "EXTENDER_TX"
  | "EXTENDER_RX"
  | "UNKNOWN";

export type VideoCapability = {
  maxResolution: "1080p" | "4K30" | "4K60" | "8K" | "Unknown";
  chroma: "4:2:0" | "4:4:4" | "Unknown";
  bandwidth: "10G" | "18G" | "Unknown";
};

export type StructuredProduct = {
  sku: string;
  name: string;
  notes?: string[];
  familyRuleId?: string;
  comparisonDomain: ComparisonDomain;
  comparisonUseCase: ComparisonUseCase;
  comparisonHints?: ComparisonHints;
  transport: TransportClass;
  avoipSubtype: AvoipSubtype;
  hdbtGeneration: HdbtGeneration;
  role: DeviceRole;
  video: VideoCapability;
  ports: {
    hdmiIn: number;
    hdmiOut: number;
    lan: number;
  };
  features: {
    scaling: boolean;
    kvm: boolean;
    videoWall: boolean;
    audioBreakout: boolean;
    multiview: boolean;
  };
};

export type FitBreakdown = {
  comparisonDomainScore: number;
  transportScore: number;
  subtypeScore: number;
  generationScore: number;
  roleScore: number;
  videoScore: number;
  featureScore: number;
  total: number;
  reasons: string[];
};

export type FitResult = {
  sku: string;
  score: number;
  breakdown: FitBreakdown;
};

export type StructuredFitResult = FitResult;
