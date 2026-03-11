export type DeviceRole =
  | "source"
  | "display"
  | "switcher"
  | "tx"
  | "rx"
  | "processor"
  | "usb"
  | "audio"
  | "control"
  | "network";

export type PortKind =
  | "HDMI"
  | "HDBaseT"
  | "USB-C"
  | "USB 2.0"
  | "USB 3.x"
  | "LAN"
  | "Audio"
  | "RS-232"
  | "IR"
  | "Relay"
  | "Dante"
  | "SDVoE";

export type DevicePort = {
  id: string;
  name: string;
  kind: PortKind;
  direction: "in" | "out" | "bidirectional";
};

export type ProjectDevice = {
  id: string;
  name: string;
  role: DeviceRole;
  manufacturer?: string;
  family?: string;
  sku?: string;
  location?: string;
  ports?: DevicePort[];
};

export type CableSignalType = "video" | "usb" | "audio" | "control" | "network" | "power";

export type CableScheduleItem = {
  id: string;
  fromDeviceId: string;
  fromPort: string;
  toDeviceId: string;
  toPort: string;
  signalType: CableSignalType;
  cableType: string;
  connectorA: string;
  connectorB: string;
  estimatedLengthM: number;
  quantity: number;
  routeNote?: string;
  assumption?: string;
};

export type BlockDiagramNode = {
  id: string;
  label: string;
  kind: DeviceRole | "group";
  zone?: string;
};

export type BlockDiagramEdge = {
  id: string;
  source: string;
  target: string;
  label?: string;
  signalType?: CableSignalType;
};

export type TemplateSeed = {
  id: string;
  name: string;
  vertical: string;
  roomType: string;
  defaultFamilies: string[];
  assumptions: string[];
  starterDevices: ProjectDevice[];
};

export type DiscoverySeed = {
  customer?: string;
  site?: string;
  roomName?: string;
  applicationType?: string;
  roomLengthM?: string;
  roomWidthM?: string;
  roomHeightM?: string;
  displayLocation?: string;
  sourceLocation?: string;
  rackLocation?: string;
  cableDistanceM?: string;
  transportDistanceBand?: string;
  displayCount?: string;
  sourceCount?: string;
  sourceTypes?: string;
  sourcePlacement?: string;
  sourceConnectionPath?: string;
  sourceConnectionType?: string;
  signalFormats?: string;
  signalHdr?: string;
  sourceCableType?: string;
  displayConnectionPath?: string;
  displayConnectionType?: string;
  displayCableType?: string;
  networkEnvironment?: string;
  usbNeeds?: string;
  usbStandards?: string;
  audioNeeds?: string;
  controlNeeds?: string;
  budgetBand?: string;
  urgency?: string;
  notes?: string;
  recommendedFamilies?: string[];
  recommendedNextTool?: string;
};

export type VideoWallSeed = {
  displayType: "LCD" | "LED";
  rows: number;
  columns: number;
  sourceCount: number;
  processorPreference: string;
  processorInputMode?: "single-source" | "multiview";
  qualityProfile?: "cost" | "balanced" | "premium";
  pixelPitch?: string;
  bezelMm?: string;
  targetWidthM?: string;
  targetHeightM?: string;
  cabinetRows?: number;
  cabinetColumns?: number;
  cabinetWidthPx?: number;
  cabinetHeightPx?: number;
  cabinetWidthMm?: number;
  cabinetHeightMm?: number;
  canvasWidthPx?: number;
  canvasHeightPx?: number;
  outputRows?: number;
  outputColumns?: number;
  lcdDriveMode?: "decoder-per-screen" | "tile-loop-multiview" | "dedicated-processor";
  contentAspectRatio?: string;
  warnings?: string[];
  assumptions?: string;
};

export type DesignBundle = {
  discovery: DiscoverySeed;
  template?: TemplateSeed | null;
  videoWall?: VideoWallSeed | null;
  devices: ProjectDevice[];
  cables: CableScheduleItem[];
  nodes: BlockDiagramNode[];
  edges: BlockDiagramEdge[];
  assumptions: string[];
};
