import * as React from "react";

export type RoomType =
  | "huddle" | "small" | "medium" | "large"
  | "divisible" | "training" | "boardroom" | "classroom" | "auditorium";

export type DisplayType = "flat_panel" | "projector" | "led_wall" | "lcd_wall";
export type ResolutionTarget = "1080p" | "4k";
export type ConnectionPreference = "hdmi" | "usb_c" | "wireless";
export type AudioMode = "none" | "basic" | "reinforcement" | "conferencing";
export type ControlLevel = "none" | "basic" | "touchpanel" | "integrated";
export type DesignType = "HDBaseT" | "AVoIP" | "Hybrid";

export type MustLevel = "must" | "should" | "could";
export type IssueType = "violation" | "warning";

export type UsageMode = "presentation" | "video_conferencing" | "byod" | "training" | "digital_signage";

export type SourceType =
  | "laptop" | "pc" | "doccam" | "media_player"
  | "wireless_presenter" | "camera" | "streaming_device";

export type ComputeMode = "appliance" | "room_pc" | "byod" | "unknown";

export type RoomProfileVersion = "1.0";

export type RoomProfile = {
  roomProfileVersion: RoomProfileVersion;

  roomName: string;
  roomType: RoomType;
  occupancy?: number;
  dimensionsMeters?: { length?: number; width?: number; height?: number };

  usageModes: UsageMode[];

  displayCount: number;
  displayType: DisplayType;
  displayResolutionTarget: ResolutionTarget;
  displayInterfaces?: Array<"hdmi" | "usb_c" | "dp">;
  contentDistribution?: "mirror" | "extend" | "matrix";
  localPreviewNeeded?: boolean;

  sources: Array<{
    sourceType: SourceType;
    connectionPreference: ConnectionPreference;
    count: number;
    needsCharging?: boolean;
    chargingWatts?: number;
    isGuestDevice?: boolean;
  }>;

  audioMode: AudioMode;

  vc?: {
    enabled: boolean;
    platform?: "teams" | "zoom" | "meet" | "byod" | "unknown";
    computeMode?: ComputeMode;
    cameraCount?: number;
    cameraType?: "usb" | "hdmi" | "ndi";
    contentToCall?: boolean;
    usbPeripheralsRequired?: boolean;
  };

  controlLevel: ControlLevel;
  autoSwitching?: boolean;
  roomSchedulingPanel?: boolean;

  constraints?: {
    maxCableRunMeters?: number;
    cableInfrastructure?: "new_build" | "existing";
    networkAvailable?: boolean;
    vlanAvailable?: boolean;
    poeAvailable?: "none" | "poe" | "poe_plus" | "poe_plus_plus" | "unknown";
    redundancyRequired?: boolean;
  };

  commercial?: {
    budgetBand?: "low" | "medium" | "high";
    region?: "uk" | "eu" | "us" | "other";
    riskTolerance?: "low" | "medium" | "high";
    mustHaves?: string[];
    niceToHaves?: string[];
  };
};

export type DecisionLogEntry = {
  ruleId: string;
  phase: Phase;
  priority: number;
  inputsUsed: string[]; // JSON paths / field names
  message: string;
  diff?: Record<string, unknown>; // optional structured change note
};

export type Requirement = {
  id: string;
  category: "video" | "audio" | "usb" | "control" | "network";
  mustLevel: MustLevel;
  details: Record<string, unknown>;
  rationale: string[];
};

export type TopologyNode = {
  id: string;
  type: "source" | "processor" | "transport" | "endpoint" | "display" | "audio" | "control" | "network";
  role: string; // role name (e.g. "presentation_switcher")
  label: string;
};

export type TopologyEdge = {
  from: string;
  to: string;
  signal: "video" | "audio" | "usb" | "control" | "network";
};

export type TopologyGraph = {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
};

export type BomLineItem = {
  sku: string;
  name: string;
  qty: number;
  role: string;
  justificationRuleIds: string[];
  assumptions?: string[];
};

export type ValidationIssue = {
  type: IssueType;
  code: string;
  message: string;
  affected?: { nodeIds?: string[]; requirementIds?: string[] };
};

export type DesignPackage = {
  designType: DesignType;
  confidence: number; // 0â€“100
  topology: TopologyGraph;
  requirements: Requirement[];
  bom: BomLineItem[];
  alternates?: { name: string; bom: BomLineItem[] }[];
  violations: ValidationIssue[];
  warnings: ValidationIssue[];
  assumptions: string[];
  decisionLog: DecisionLogEntry[];
  exports: {
    scopeNarrative: string;
    statementOfOperation: string;
    networkRequirementsSummary: string;
    cableScheduleSummary: string;
  };
};

export type Phase =
  | "normalize"
  | "classify"
  | "derive"
  | "select_pattern"
  | "bind_products"
  | "validate"
  | "explain";

export type EngineeringContext = {
  phase: Phase;
  designTypeCandidate: DesignType;
  complexityScore: number;
  roomArchetype?: string;

  requirements: Requirement[];
  topology?: TopologyGraph;

  chosenPatternId?: string;

  bom: BomLineItem[];
  alternates: { name: string; bom: BomLineItem[] }[];

  violations: ValidationIssue[];
  warnings: ValidationIssue[];
  assumptions: string[];
  decisionLog: DecisionLogEntry[];
};