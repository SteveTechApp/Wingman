export type AvTopologyModel =
  | "point-to-point" | "one-to-many-mirrored" | "many-to-one-selected"
  | "many-to-many-routed" | "many-to-one-composited" | "canvas-to-many"
  | "network-routed" | "bridge" | "room-core" | "endpoint-source"
  | "endpoint-destination" | "bidirectional-endpoint" | "support-only" | "unknown";

export type AvSignalDirection =
  | "source-side" | "destination-side" | "bidirectional"
  | "processing" | "room-core" | "support" | "unknown";

export type AvOutputBehaviour =
  | "routed" | "mirrored" | "selected" | "loop" | "local-monitor"
  | "composited" | "encoded-network" | "decoded-local"
  | "powered-audio" | "control" | "none" | "unknown";

export type AvSemanticPort = {
  connector: string;
  direction: "input" | "output" | "bidirectional" | "unspecified";
  signalFamily: "video" | "audio" | "usb-data" | "network-av" | "network-audio" | "control" | "power" | "other";
  count: number;
  logicalFunction:
    | "source-input" | "routed-output" | "mirrored-output"
    | "loop-output" | "monitor-output" | "host-port"
    | "device-port" | "network-stream" | "control" | "power" | "other";
  evidence?: string;
};

export type AvProductSemanticProfile = {
  manufacturer?: string;
  sku?: string;
  name?: string;
  archetypeId: string;
  archetypeName: string;
  productFamily?: string;
  practicalPurpose: string;
  topologyModel: AvTopologyModel;
  canonicalRole: string;
  direction: AvSignalDirection;
  compareDomain?: string;
  logicalInputCount?: number;
  logicalOutputCount?: number;
  physicalInputConnectorCount?: number;
  physicalOutputConnectorCount?: number;
  routedOutputCount?: number;
  mirroredOutputCount?: number;
  loopOutputCount?: number;
  localMonitorOutputCount?: number;
  compositedOutputCount?: number;
  networkStreamInputCount?: number;
  networkStreamOutputCount?: number;
  inputConnectors: string[];
  outputConnectors: string[];
  primaryOutputBehaviour: AvOutputBehaviour;
  ports: AvSemanticPort[];
  specialistFeatures: string[];
  dependencies: string[];
  confidence: "high" | "medium" | "low" | "requires-review";
  evidence: string[];
  unknowns: string[];
};

export type SemanticRecallCandidate = {
  sku: string;
  name: string;
  family: string;
  score: number;
  cautions: string[];
  semanticReasons: string[];
  semanticProfile: AvProductSemanticProfile;
};
