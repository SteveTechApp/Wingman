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

export type CatalogDistanceClass = "Class A" | "Class B";

export type CatalogVideo = {
  maxResolution?: string;
  maxFramerate?: string;
  chroma?: string;
  hdr?: boolean;
  dolbyVision?: boolean;
  hdmi?: string;
  hdmiVersion?: string;
  hdcpVersion?: string;
  bandwidthGbps?: number;
  scaling?: boolean;
  downscaling?: boolean;
  upscaling?: boolean;
  multiview?: boolean;
  seamlessSwitching?: boolean;
};

export type CatalogDistance = {
  meters?: number;
  meters1080p?: number;
  meters4k?: number;
  hdbasetClass?: CatalogDistanceClass;
  networkSpeed?: string;
  codec?: string;
  latencyClass?: string;
  notes?: string;
};

export type CatalogUsbProfile = {
  passthrough?: boolean;
  hostPorts?: number;
  devicePorts?: number;
  usbCVideoInput?: boolean;
  usbCChargingWatts?: number;
  kvmSupport?: boolean;
  cameraSharing?: boolean;
  peripheralSwitching?: boolean;
};

export type CatalogWirelessProfile = {
  airplay?: boolean;
  miracast?: boolean;
  googleCast?: boolean;
  wirelessPresentation?: boolean;
  wirelessConference?: boolean;
  mst?: boolean;
  byod?: boolean;
  byom?: boolean;
};

export type CatalogIntegrationProfile = {
  rs232?: boolean;
  ir?: boolean;
  lanControl?: boolean;
  webUi?: boolean;
  api?: boolean;
  cec?: boolean;
  relayCount?: number;
  gpioCount?: number;
  poe?: boolean;
  poePd?: boolean;
};

export type CatalogPowerProfile = {
  powerSupplyType?: string;
  poc?: boolean;
  poh?: boolean;
  rackWidth?: string;
  formFactor?: string;
  wallPlate?: boolean;
  tableMount?: boolean;
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
  technology?: string;
  topology?: string;
  role?: string;
  directionality?: string;
  inputTotal?: number;
  outputTotal?: number;
  outputBehavior?: string;
  inputs?: CatalogPortCount[];
  outputs?: CatalogPortCount[];
  control?: string[];
  audio?: string[];
  video?: CatalogVideo;
  latency?: string;
  transport?: CatalogTransport;
  distance?: CatalogDistance;
  usb?: CatalogUsbProfile;
  wireless?: CatalogWirelessProfile;
  integration?: CatalogIntegrationProfile;
  power?: CatalogPowerProfile;
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
