export type SchematicSignalKind =
  | "video"
  | "usb"
  | "audio"
  | "network"
  | "control"
  | "power";

export type SchematicTransportKind =
  | "hdmi"
  | "hdbaset"
  | "av-over-ip"
  | "usb"
  | "usb-over-ip"
  | "analogue-audio"
  | "dante"
  | "network"
  | "control"
  | "unknown";

export type SchematicNodeKind =
  | "source"
  | "display"
  | "camera"
  | "speakerphone"
  | "touch-panel"
  | "switcher"
  | "matrix"
  | "av-over-ip-encoder"
  | "av-over-ip-decoder"
  | "av-over-ip-transceiver"
  | "av-over-ip-controller"
  | "network-switch"
  | "video-wall-processor"
  | "audio-device"
  | "usb-bridge"
  | "control-device"
  | "accessory";

export interface SchematicPoint {
  x: number;
  y: number;
}

export interface SchematicNode {
  id: string;
  label: string;
  kind: SchematicNodeKind;
  sku?: string;
  family?: string;
  column: number;
  lane: number;
  x: number;
  y: number;
  required: boolean;
  proposalSafeNote?: string;
  metadata?: Record<string, string | number | boolean | undefined>;
}

export interface SchematicConnection {
  id: string;
  from: string;
  to: string;
  signal: SchematicSignalKind;
  transport: SchematicTransportKind;
  label: string;
  required: boolean;
  points: SchematicPoint[];
  fromPort?: string;
  toPort?: string;
  cableId?: string;
  bidirectional?: boolean;
  maxLengthM?: number;
  evidence?: "manufacturer" | "unresolved";
  proposalSafeNote?: string;
}

export interface SchematicBomHint {
  sku: string;
  reason: string;
  required: boolean;
}

export interface SchematicWarning {
  severity: "info" | "warning" | "blocker";
  title: string;
  message: string;
}

export interface SchematicModel {
  id: string;
  title: string;
  assumptions: string[];
  nodes: SchematicNode[];
  connections: SchematicConnection[];
  warnings: SchematicWarning[];
  bomHints: SchematicBomHint[];
}

export interface SchematicEndpointBrief {
  label: string;
  sku?: string;
  quantity?: number;
}

export interface SchematicProductBrief {
  operatingMode?: "transmit" | "receive";
  role?: string;
  sku: string;
  label?: string;
  quantity?: number;
}

/**
 * The programme-audio route recorded in discovery, in the rep's own values:
 * where the sound leaves the video path and everywhere it must arrive. The
 * schematic draws it as audio connections instead of only warning that audio
 * needs designing, so a reader can see what was asked for.
 */
export interface SchematicAudioRoute {
  /** A discovery `extract-` value: the source, the matrix/switcher or a display. */
  extraction?: string;
  /** Discovery `route-` values: amplifier, UC host, recorder, Dante, display speakers. */
  destinations: string[];
  /** The recorded sentence, kept for anything that narrates the drawing. */
  summary?: string;
}

export interface SchematicProjectBrief {
  id?: string;
  title: string;
  roomType?: string;
  independentPresentationLinks?: boolean;
  sources?: SchematicEndpointBrief[];
  equipmentScope?: Array<{ id: string; label: string; quantity: number; model?: string }>;
  displays?: SchematicEndpointBrief[];
  cameras?: SchematicEndpointBrief[];
  speakerphones?: SchematicEndpointBrief[];
  touchPanels?: SchematicEndpointBrief[];
  products?: SchematicProductBrief[];
  usbRequired?: boolean;
  audioRequired?: boolean;
  audioRoute?: SchematicAudioRoute;
  controlRequired?: boolean;
  networkAvailable?: boolean;
  maxSignalDistanceM?: number;
  videoWall?: {
    enabled: boolean;
    displayCount?: number;
    layout?: string;
    behaviour?: "single-canvas" | "per-display" | "multiview" | "mixed";
  };
}
