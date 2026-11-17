import { buildDiscoverySourcePlan } from "./projectTopologySourcePlan";
export const PROJECT_TOPOLOGY_SCHEMA_VERSION = 1;

export type ProjectLocationType =
  | "table"
  | "lectern"
  | "floor-box"
  | "display-wall"
  | "ceiling"
  | "projector-position"
  | "room-rack"
  | "local-cupboard"
  | "central-rack"
  | "other-room"
  | "other-floor"
  | "other-building"
  | "network"
  | "custom"
  | "unknown";

export type ProjectDeviceStatus = "confirmed" | "assumed" | "unknown";
export type ProjectLengthMode = "estimated" | "confirmed" | "unknown";
export type ProjectConnectionScope = "local-patch" | "endpoint-route" | "infrastructure";
export type ProjectDeviceSignalRole = "source" | "processor" | "destination" | "infrastructure" | "other";
export type ProjectPortDirection = "input" | "output";
export type ProjectDeviceOwnership = "wyrestorm" | "third-party" | "unassigned";

export type ProjectConnectionService =
  | "video"
  | "embedded-audio"
  | "analogue-audio"
  | "usb-2"
  | "usb-3"
  | "usb-kvm"
  | "ethernet"
  | "av-over-ip"
  | "rs232"
  | "ir"
  | "gpio-relay"
  | "dante-aes67"
  | "power";

export type ProjectTransport =
  | "hdmi"
  | "usb-c"
  | "displayport"
  | "hdbaset-2"
  | "hdbaset-3"
  | "fibre-mm"
  | "fibre-sm"
  | "ip-av-vlan"
  | "shared-ip-network"
  | "point-to-point-network"
  | "usb-data"
  | "usb-extender"
  | "rs232"
  | "ir"
  | "analogue-audio"
  | "dante-aes67"
  | "other"
  | "unknown";

export type ProjectLocation = {
  id: string;
  name: string;
  type: ProjectLocationType;
  roomId?: string;
  buildingId?: string;
  notes?: string;
};

export type ProjectDevicePort = {
  id: string;
  direction: ProjectPortDirection;
  name: string;
  connector?: string;
  services: ProjectConnectionService[];
  status: ProjectDeviceStatus;
};

export type ProjectDevice = {
  id: string;
  name: string;
  category: string;
  signalRole?: ProjectDeviceSignalRole;
  locationId: string;
  manufacturer?: string;
  sku?: string;
  ownership?: ProjectDeviceOwnership;
  productRelationship?: "competitor" | "complementary";
  quantity: number;
  thirdParty: boolean;
  status: ProjectDeviceStatus;
  notes?: string;
  ports?: ProjectDevicePort[];
  /** Rebuilt from Discovery answers; user-added equipment remains unmarked. */
  generatedByDiscovery?: boolean;
};

export type ProjectConnection = {
  id: string;
  fromDeviceId: string;
  /** One-based physical unit index. Missing values in legacy records mean unit 1. */
  fromUnit?: number;
  toDeviceId: string;
  /** One-based physical unit index. Missing values in legacy records mean unit 1. */
  toUnit?: number;
  fromPort?: string;
  toPort?: string;
  services: ProjectConnectionService[];
  transport: ProjectTransport;
  /** Inferred when absent so topology saved before schema v1 remains usable. */
  scope?: ProjectConnectionScope;
  lengthMode: ProjectLengthMode;
  lengthMetres?: number;
  estimateReason?: string;
  networkSegmentId?: string;
  status: ProjectDeviceStatus;
  notes?: string;
};

export type ProjectSignalRequirement = {
  id: string;
  fromDeviceId: string;
  fromUnit: number;
  toDeviceId: string;
  toUnit: number;
  services: ProjectConnectionService[];
  notes?: string;
};

export type ProjectTopology = {
  schemaVersion: number;
  mode: "simple" | "advanced";
  locations: ProjectLocation[];
  devices: ProjectDevice[];
  connections: ProjectConnection[];
  /** Explicit source-to-destination service paths the design is expected to provide. */
  signalRequirements?: ProjectSignalRequirement[];
  generatedFromDiscovery: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DiscoveryTopologySeed = {
  answers?: Record<string, unknown>;
  notes?: Record<string, string>;
  application?: string;
  existing?: unknown;
};

export const PROJECT_LOCATION_OPTIONS: Array<{ value: ProjectLocationType; label: string }> = [
  { value: "table", label: "Table" },
  { value: "lectern", label: "Lectern" },
  { value: "floor-box", label: "Floor box" },
  { value: "display-wall", label: "Display wall" },
  { value: "ceiling", label: "Ceiling" },
  { value: "projector-position", label: "Projector position" },
  { value: "room-rack", label: "Room rack" },
  { value: "local-cupboard", label: "Local equipment cupboard" },
  { value: "central-rack", label: "Central communications room" },
  { value: "other-room", label: "Another room" },
  { value: "other-floor", label: "Another floor" },
  { value: "other-building", label: "Another building" },
  { value: "network", label: "Customer network / AV VLAN" },
  { value: "custom", label: "Custom location" },
  { value: "unknown", label: "Unknown" },
];

export const PROJECT_CONNECTION_SERVICE_OPTIONS: Array<{ value: ProjectConnectionService; label: string }> = [
  { value: "video", label: "Video" },
  { value: "embedded-audio", label: "Embedded audio" },
  { value: "analogue-audio", label: "Analogue audio" },
  { value: "usb-2", label: "USB 2.0 data" },
  { value: "usb-3", label: "USB 3.x data" },
  { value: "usb-kvm", label: "USB KVM" },
  { value: "ethernet", label: "Ethernet" },
  { value: "av-over-ip", label: "AV-over-IP" },
  { value: "rs232", label: "RS-232 control" },
  { value: "ir", label: "IR control" },
  { value: "gpio-relay", label: "GPIO / relay" },
  { value: "dante-aes67", label: "Dante / AES67" },
  { value: "power", label: "Power / PoH / PoE" },
];

export const PROJECT_TRANSPORT_OPTIONS: Array<{ value: ProjectTransport; label: string }> = [
  { value: "hdmi", label: "HDMI" },
  { value: "usb-c", label: "USB-C" },
  { value: "displayport", label: "DisplayPort" },
  { value: "hdbaset-2", label: "HDBaseT 2.0" },
  { value: "hdbaset-3", label: "HDBaseT 3.0" },
  { value: "fibre-mm", label: "Fibre - multimode" },
  { value: "fibre-sm", label: "Fibre - single-mode" },
  { value: "ip-av-vlan", label: "IP AV-VLAN" },
  { value: "shared-ip-network", label: "Shared customer IP network" },
  { value: "point-to-point-network", label: "Dedicated point-to-point network" },
  { value: "usb-data", label: "USB data cable" },
  { value: "usb-extender", label: "USB extender path" },
  { value: "rs232", label: "RS-232" },
  { value: "ir", label: "IR" },
  { value: "analogue-audio", label: "Analogue audio" },
  { value: "dante-aes67", label: "Dante / AES67" },
  { value: "other", label: "Other" },
  { value: "unknown", label: "Unknown" },
];

const LOCATION_TYPES = new Set<ProjectLocationType>(PROJECT_LOCATION_OPTIONS.map((item) => item.value));
const SERVICE_TYPES = new Set<ProjectConnectionService>(PROJECT_CONNECTION_SERVICE_OPTIONS.map((item) => item.value));
const TRANSPORT_TYPES = new Set<ProjectTransport>(PROJECT_TRANSPORT_OPTIONS.map((item) => item.value));
const DEVICE_STATUSES = new Set<ProjectDeviceStatus>(["confirmed", "assumed", "unknown"]);
const SIGNAL_ROLES = new Set<ProjectDeviceSignalRole>(["source", "processor", "destination", "infrastructure", "other"]);
const PORT_DIRECTIONS = new Set<ProjectPortDirection>(["input", "output"]);
const DEVICE_OWNERSHIP = new Set<ProjectDeviceOwnership>(["wyrestorm", "third-party", "unassigned"]);
const LENGTH_MODES = new Set<ProjectLengthMode>(["estimated", "confirmed", "unknown"]);
const CONNECTION_SCOPES = new Set<ProjectConnectionScope>(["local-patch", "endpoint-route", "infrastructure"]);

function inferConnectionScope(
  connection: Pick<ProjectConnection, "fromDeviceId" | "toDeviceId" | "services" | "transport">,
  devices: ProjectDevice[],
  locations: ProjectLocation[],
): ProjectConnectionScope {
  const deviceById = new Map(devices.map((item) => [item.id, item]));
  const locationById = new Map(locations.map((item) => [item.id, item]));
  const fromLocation = locationById.get(deviceById.get(connection.fromDeviceId)?.locationId ?? "");
  const toLocation = locationById.get(deviceById.get(connection.toDeviceId)?.locationId ?? "");
  if (fromLocation && toLocation && fromLocation.id === toLocation.id) return "local-patch";

  const isNetworkTransport = ["ip-av-vlan", "shared-ip-network"].includes(connection.transport);
  const isBuildingLocation = (location?: ProjectLocation) => Boolean(location && [
    "network", "central-rack", "other-room", "other-floor", "other-building",
  ].includes(location.type));
  const isInfrastructureFibre = ["fibre-mm", "fibre-sm"].includes(connection.transport)
    && (isBuildingLocation(fromLocation) || isBuildingLocation(toLocation));
  if (isNetworkTransport || connection.services.includes("av-over-ip") || isInfrastructureFibre) return "infrastructure";
  return "endpoint-route";
}

function nowIso(): string {
  return new Date().toISOString();
}

function cleanText(value: unknown, fallback = ""): string {
  const output = String(value ?? "").trim();
  return output || fallback;
}

function cleanNumber(value: unknown, fallback?: number): number | undefined {
  const output = Number(value);
  return Number.isFinite(output) && output >= 0 ? output : fallback;
}

function list(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => cleanText(item)).filter(Boolean);
  }
  const output = cleanText(value);
  return output ? [output] : [];
}

function hasAnswer(answers: Record<string, unknown>, key: string, expected: string): boolean {
  return list(answers[key]).includes(expected);
}

function textBlob(answers: Record<string, unknown>, notes: Record<string, string>, application: string): string {
  return [application, ...Object.values(answers).flatMap(list), ...Object.values(notes)]
    .join(" ")
    .toLowerCase();
}

function uniqueId(prefix: string, existing: Set<string>): string {
  let index = existing.size + 1;
  let candidate = `${prefix}-${index}`;
  while (existing.has(candidate)) {
    index += 1;
    candidate = `${prefix}-${index}`;
  }
  existing.add(candidate);
  return candidate;
}

function displayCountFrom(value: unknown): number {
  const display = list(value).join(" ");
  if (display.includes("nine-plus")) return 4;
  if (display.includes("three-eight")) return 3;
  if (display.includes("two-displays")) return 2;
  return 1;
}

function legacyDistanceMetres(value: unknown): number | undefined {
  const distance = list(value).join(" ");
  if (distance.includes("under-5m")) return 5;
  if (distance.includes("5-10m")) return 10;
  if (distance.includes("10-35m")) return 25;
  if (distance.includes("35-70m")) return 50;
  if (distance.includes("70-100m-plus")) return 100;
  return undefined;
}

function estimateBetween(
  from: ProjectLocation,
  to: ProjectLocation,
  scale: string,
): Pick<ProjectConnection, "lengthMode" | "lengthMetres" | "estimateReason"> {
  if (from.id === to.id) {
    return { lengthMode: "estimated", lengthMetres: 1, estimateReason: "Devices share the same location" };
  }

  const types = new Set([from.type, to.type]);
  const isSmall = scale.includes("single-small-room");
  const isLarge = scale.includes("single-large-room");

  if (types.has("other-building")) {
    return { lengthMode: "unknown", estimateReason: "Route between buildings must be confirmed" };
  }
  if (types.has("central-rack") && (types.has("other-room") || types.has("display-wall") || types.has("room-rack"))) {
    return { lengthMode: "estimated", lengthMetres: 50, estimateReason: "Central building rack to room endpoint" };
  }
  if (types.has("room-rack") && (types.has("display-wall") || types.has("projector-position") || types.has("ceiling"))) {
    return { lengthMode: "estimated", lengthMetres: isLarge ? 25 : 15, estimateReason: "Room rack to display, projector or ceiling endpoint" };
  }
  if ((types.has("table") || types.has("lectern")) && (types.has("display-wall") || types.has("projector-position"))) {
    return { lengthMode: "estimated", lengthMetres: isSmall ? 5 : isLarge ? 15 : 10, estimateReason: "Presentation position to front-of-room display" };
  }
  if (types.has("local-cupboard")) {
    return { lengthMode: "estimated", lengthMetres: 30, estimateReason: "Room endpoint to local equipment cupboard" };
  }
  if (types.has("network")) {
    return { lengthMode: "estimated", lengthMetres: 3, estimateReason: "Endpoint patch lead to network access" };
  }

  return { lengthMode: "estimated", lengthMetres: 10, estimateReason: "Typical same-room planning allowance" };
}

function chooseTransport(
  services: ProjectConnectionService[],
  estimate: Pick<ProjectConnection, "lengthMode" | "lengthMetres">,
  networked: boolean,
): ProjectTransport {
  if (services.includes("av-over-ip")) return networked ? "ip-av-vlan" : "shared-ip-network";
  if (services.includes("dante-aes67")) return "dante-aes67";
  if (services.includes("rs232") && services.length === 1) return "rs232";
  if (services.includes("ir") && services.length === 1) return "ir";
  if (services.includes("analogue-audio") && services.length === 1) return "analogue-audio";
  if (services.includes("usb-3")) return (estimate.lengthMetres ?? 0) > 3 ? "usb-extender" : "usb-data";
  if (services.includes("usb-2") || services.includes("usb-kvm")) return (estimate.lengthMetres ?? 0) > 5 ? "usb-extender" : "usb-data";
  if (networked) return "ip-av-vlan";
  if (estimate.lengthMode === "unknown") return "unknown";
  if ((estimate.lengthMetres ?? 0) > 100) return "fibre-sm";
  if ((estimate.lengthMetres ?? 0) > 70) return "fibre-mm";
  if ((estimate.lengthMetres ?? 0) > 10) return "hdbaset-3";
  return "hdmi";
}

export function createBlankProjectTopology(): ProjectTopology {
  const timestamp = nowIso();
  return {
    schemaVersion: PROJECT_TOPOLOGY_SCHEMA_VERSION,
    mode: "simple",
    locations: [],
    devices: [],
    connections: [],
    signalRequirements: [],
    generatedFromDiscovery: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function normaliseProjectTopology(value: unknown): ProjectTopology {
  const blank = createBlankProjectTopology();
  if (!value || typeof value !== "object" || Array.isArray(value)) return blank;
  const record = value as Record<string, unknown>;
  const locationsRaw = Array.isArray(record.locations) ? record.locations : [];
  const devicesRaw = Array.isArray(record.devices) ? record.devices : [];
  const connectionsRaw = Array.isArray(record.connections) ? record.connections : [];
  const signalRequirementsRaw = Array.isArray(record.signalRequirements) ? record.signalRequirements : [];

  const locations: ProjectLocation[] = locationsRaw.flatMap((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const row = item as Record<string, unknown>;
    const typeValue = cleanText(row.type) as ProjectLocationType;
    return [{
      id: cleanText(row.id, `location-${index + 1}`),
      name: cleanText(row.name, `Location ${index + 1}`),
      type: LOCATION_TYPES.has(typeValue) ? typeValue : "unknown",
      roomId: cleanText(row.roomId) || undefined,
      buildingId: cleanText(row.buildingId) || undefined,
      notes: cleanText(row.notes) || undefined,
    }];
  });

  const locationIds = new Set(locations.map((item) => item.id));
  const fallbackLocation = locations[0]?.id ?? "";
  const devices: ProjectDevice[] = devicesRaw.flatMap((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const row = item as Record<string, unknown>;
    const statusValue = cleanText(row.status) as ProjectDeviceStatus;
    const locationId = cleanText(row.locationId, fallbackLocation);
    return [{
      id: cleanText(row.id, `device-${index + 1}`),
      name: cleanText(row.name, `Device ${index + 1}`),
      category: cleanText(row.category, "other"),
      signalRole: SIGNAL_ROLES.has(cleanText(row.signalRole) as ProjectDeviceSignalRole)
        ? cleanText(row.signalRole) as ProjectDeviceSignalRole
        : undefined,
      locationId: locationIds.has(locationId) ? locationId : fallbackLocation,
      manufacturer: cleanText(row.manufacturer) || undefined,
      sku: cleanText(row.sku) || undefined,
      ownership: DEVICE_OWNERSHIP.has(cleanText(row.ownership) as ProjectDeviceOwnership)
        ? cleanText(row.ownership) as ProjectDeviceOwnership
        : undefined,
      productRelationship: row.productRelationship === "competitor" ? "competitor" : row.productRelationship === "complementary" ? "complementary" : undefined,
      quantity: Math.max(1, Math.round(cleanNumber(row.quantity, 1) ?? 1)),
      thirdParty: Boolean(row.thirdParty),
      status: DEVICE_STATUSES.has(statusValue) ? statusValue : "assumed",
      notes: cleanText(row.notes) || undefined,
      ports: Array.isArray(row.ports) ? row.ports.flatMap((port, portIndex) => {
        if (!port || typeof port !== "object" || Array.isArray(port)) return [];
        const portRow = port as Record<string, unknown>;
        const direction = cleanText(portRow.direction) as ProjectPortDirection;
        const portStatus = cleanText(portRow.status) as ProjectDeviceStatus;
        const services = list(portRow.services)
          .map((item) => item as ProjectConnectionService)
          .filter((item) => SERVICE_TYPES.has(item));
        const name = cleanText(portRow.name);
        if (!PORT_DIRECTIONS.has(direction) || !name) return [];
        return [{
          id: cleanText(portRow.id, `device-${index + 1}-port-${portIndex + 1}`),
          direction,
          name,
          connector: cleanText(portRow.connector) || undefined,
          services,
          status: DEVICE_STATUSES.has(portStatus) ? portStatus : "unknown",
        }];
      }) : undefined,
      generatedByDiscovery: Boolean(row.generatedByDiscovery),
    }];
  });

  const deviceIds = new Set(devices.map((item) => item.id));
  const normaliseUnit = (value: unknown) => {
    if (value === undefined || value === null || (typeof value === "string" && !value.trim())) return 1;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const connections: ProjectConnection[] = connectionsRaw.flatMap((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const row = item as Record<string, unknown>;
    const fromDeviceId = cleanText(row.fromDeviceId);
    const toDeviceId = cleanText(row.toDeviceId);
    if (!deviceIds.has(fromDeviceId) || !deviceIds.has(toDeviceId) || fromDeviceId === toDeviceId) return [];
    const transportValue = cleanText(row.transport) as ProjectTransport;
    const lengthModeValue = cleanText(row.lengthMode) as ProjectLengthMode;
    const statusValue = cleanText(row.status) as ProjectDeviceStatus;
    const services = list(row.services)
      .map((item) => item as ProjectConnectionService)
      .filter((item) => SERVICE_TYPES.has(item));
    const connection = {
      id: cleanText(row.id, `connection-${index + 1}`),
      fromDeviceId,
      fromUnit: normaliseUnit(row.fromUnit),
      toDeviceId,
      toUnit: normaliseUnit(row.toUnit),
      fromPort: cleanText(row.fromPort) || undefined,
      toPort: cleanText(row.toPort) || undefined,
      services,
      transport: TRANSPORT_TYPES.has(transportValue) ? transportValue : "unknown",
      scope: CONNECTION_SCOPES.has(cleanText(row.scope) as ProjectConnectionScope)
        ? cleanText(row.scope) as ProjectConnectionScope
        : undefined,
      lengthMode: LENGTH_MODES.has(lengthModeValue) ? lengthModeValue : "unknown",
      lengthMetres: cleanNumber(row.lengthMetres),
      estimateReason: cleanText(row.estimateReason) || undefined,
      networkSegmentId: cleanText(row.networkSegmentId) || undefined,
      status: DEVICE_STATUSES.has(statusValue) ? statusValue : "assumed",
      notes: cleanText(row.notes) || undefined,
    } satisfies ProjectConnection;
    connection.scope ??= inferConnectionScope(connection, devices, locations);
    return [connection];
  });

  const signalRequirements: ProjectSignalRequirement[] = signalRequirementsRaw.flatMap((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const row = item as Record<string, unknown>;
    const fromDeviceId = cleanText(row.fromDeviceId);
    const toDeviceId = cleanText(row.toDeviceId);
    if (!fromDeviceId || !toDeviceId) return [];
    const services = list(row.services)
      .map((service) => service as ProjectConnectionService)
      .filter((service) => SERVICE_TYPES.has(service));
    return [{
      id: cleanText(row.id, `signal-requirement-${index + 1}`),
      fromDeviceId,
      fromUnit: normaliseUnit(row.fromUnit),
      toDeviceId,
      toUnit: normaliseUnit(row.toUnit),
      services,
      notes: cleanText(row.notes) || undefined,
    }];
  });

  return {
    schemaVersion: PROJECT_TOPOLOGY_SCHEMA_VERSION,
    mode: record.mode === "advanced" ? "advanced" : "simple",
    locations,
    devices,
    connections,
    signalRequirements,
    generatedFromDiscovery: Boolean(record.generatedFromDiscovery),
    createdAt: cleanText(record.createdAt, blank.createdAt),
    updatedAt: cleanText(record.updatedAt, blank.updatedAt),
  };
}

export function generateProjectTopologyFromDiscovery(seed: DiscoveryTopologySeed): ProjectTopology {
  const existing = normaliseProjectTopology(seed.existing);
  if (existing.devices.length > 0 || existing.connections.length > 0) return existing;

  const answers = seed.answers ?? {};
  const notes = seed.notes ?? {};
  const application = cleanText(seed.application, list(answers.opportunity).join(" "));
  const blob = textBlob(answers, notes, application);
  const scale = list(answers.scale).join(" ");
  const networked = /av-over-ip|distributed|building-wide|campus|managed-network|av vlan|networkhd|network-video-sources|cameras-ndi-network-streams/.test(blob)
    || ["source-position-network", "source-position-other-room", "source-position-other-building"].some((value) => list(answers["locations-connections"]).includes(value))
    || list(answers["uc-purpose"]).includes("live-stream-out")
    || list(answers["uc-camera"]).includes("ndi-network-camera")
    || list(answers["uc-multi-camera-path"]).includes("multi-camera-ndi");
  const timestamp = nowIso();
  const locationIds = new Set<string>();
  const deviceIds = new Set<string>();
  const connectionIds = new Set<string>();
  const locations: ProjectLocation[] = [];
  const devices: ProjectDevice[] = [];
  const connections: ProjectConnection[] = [];

  const addLocation = (id: string, name: string, type: ProjectLocationType): ProjectLocation => {
    const existingLocation = locations.find((item) => item.id === id);
    if (existingLocation) return existingLocation;
    locationIds.add(id);
    const location = { id, name, type };
    locations.push(location);
    return location;
  };

  const table = addLocation("location-table", /classroom|lecture|teaching/.test(blob) ? "Lectern / teaching position" : "Table / presenter position", /classroom|lecture|teaching/.test(blob) ? "lectern" : "table");
  const front = addLocation("location-front", /projector/.test(blob) ? "Projector / front-of-room" : "Display wall", /projector/.test(blob) ? "projector-position" : "display-wall");
  const rack = addLocation("location-room-rack", "Room rack / local equipment", "room-rack");
  const ceiling = /camera|microphone|ceiling|video-conferencing|conferencing|recording|streaming|camera-distribution/.test(blob) ? addLocation("location-ceiling", "Ceiling / camera position", "ceiling") : null;
  const central = /building-wide|campus|multi-room|central/.test(blob) ? addLocation("location-central-rack", "Central communications room", "central-rack") : null;
  const localCupboard = list(answers["locations-connections"]).includes("source-position-local-cupboard")
    ? addLocation("location-local-cupboard", "Local equipment cupboard", "local-cupboard") : null;
  const remoteRoom = list(answers["locations-connections"]).includes("source-position-other-room")
    ? addLocation("location-other-room", "Another room on this site", "other-room") : null;
  const remoteBuilding = list(answers["locations-connections"]).includes("source-position-other-building")
    ? addLocation("location-other-building", "Another building / remote site", "other-building") : null;
  const network = networked ? addLocation("location-av-network", "AV network / VLAN", "network") : null;

  const addDevice = (input: Omit<ProjectDevice, "id"> & { id?: string }): ProjectDevice => {
    const id = input.id || uniqueId("device", deviceIds);
    deviceIds.add(id);
    const device = { ...input, generatedByDiscovery: input.generatedByDiscovery ?? true, id };
    devices.push(device);
    return device;
  };

  const core = addDevice({
    id: "device-system-core",
    name: networked ? "WyreStorm encoder / switching path TBC" : "WyreStorm switcher / transport path TBC",
    category: networked ? "avoip-core" : "switching-core",
    locationId: central?.id ?? rack.id,
    quantity: 1,
    thirdParty: false,
    status: "assumed",
    notes: "Placeholder until product selection confirms the WyreStorm architecture.",
  });

  if (network) {
    addDevice({
      id: "device-av-network",
      name: "Managed AV network / VLAN",
      category: "network",
      locationId: network.id,
      quantity: 1,
      thirdParty: true,
      status: hasAnswer(answers, "infrastructure", "managed-network") ? "confirmed" : "assumed",
      notes: "Confirm switch class, multicast/IGMP, bandwidth, ownership and controller dependencies.",
    });
  }

  const sourcePlan = buildDiscoverySourcePlan({
    answers, notes, blob, rack, table, front, ceiling, central, localCupboard, remoteRoom, remoteBuilding, network,
    addLocation, addDevice,
  });
  const {
    sourceDevices, unifiedCommsInactive, conferencingRequired, recordingRequired,
    liveStreamRequired, cameraDistributionRequired, microphonesOnlyRequired,
    cameraRequiredByUnifiedComms, cameraCountValue, cameraQuantity,
    multiCameraRequired, ndiMultiCamera, standardMultiCamera, explicitNoCamera,
  } = sourcePlan;

  const explicitDisplayCount = Number(answers["display-count-exact"]);
  const outputCount = Number.isInteger(explicitDisplayCount) && explicitDisplayCount > 0 && explicitDisplayCount <= 256
    ? explicitDisplayCount : displayCountFrom(answers.displays);
  const displayDevices: ProjectDevice[] = [];
  const wallOutput = hasAnswer(answers, "displays", "video-wall-output") || /video wall|led wall/.test(blob);
  if (wallOutput) {
    displayDevices.push(addDevice({
      id: "device-wall-processor",
      name: /led wall/.test(blob) ? "LED processor / display canvas" : "Video wall / wall processor",
      category: "display",
      locationId: front.id,
      quantity: 1,
      thirdParty: true,
      status: "assumed",
    }));
  } else {
    for (let index = 0; index < outputCount; index += 1) {
      displayDevices.push(addDevice({
        id: `device-display-${index + 1}`,
        name: outputCount > 1 ? `Display / output ${index + 1}` : "Main display / projector",
        category: "display",
        locationId: front.id,
        quantity: 1,
        thirdParty: true,
        status: "assumed",
      }));
    }
  }

  // WINGMAN_DISCOVERY_UC_DEVICE_DEPENDENCIES_START
  const usbValues = [
    ...list(answers.usb),
    ...list(answers["usb-path"]),
  ];
  const audioByOthers = list(answers.audio).includes("audio-by-others");
  const explicitUsbRequired = usbValues.some(
    (item) => !/no-usb|unknown-usb/.test(item),
  );
  const usbRequired =
    explicitUsbRequired ||
    conferencingRequired ||
    (
      !unifiedCommsInactive &&
      /camera|speakerphone|touch|usb|byod|byom/.test(blob)
    );

  let roomHost: ProjectDevice | null = null;

  if (
    usbValues.includes("room-pc-uc") ||
    usbValues.includes("room-host-usb2")
  ) {
    roomHost = addDevice({
      id: "device-room-host",
      name: "Room PC / UC appliance",
      category: "usb-host",
      locationId: rack.id,
      quantity: 1,
      thirdParty: true,
      status: "assumed",
    });
  }

  const userLaptop =
    sourceDevices.find((item) => item.id === "device-user-laptop") ?? null;

  if (conferencingRequired && !roomHost && !userLaptop) {
    roomHost = addDevice({
      id: "device-uc-host-tbc",
      name: "UC host / room or user device TBC",
      category: "usb-host",
      locationId: rack.id,
      quantity: 1,
      thirdParty: true,
      status: "unknown",
      notes:
        "Confirm whether the call is hosted by a user laptop, room PC or UC appliance.",
    });
  }

  if (
    (!audioByOthers || explicitUsbRequired) &&
    usbRequired &&
    !devices.some((item) => item.id === "device-camera")
  ) {
    addDevice({
      id: "device-usb-peripheral",
      name: /touch/.test(blob)
        ? "Touch / interactive USB device"
        : "USB camera / speakerphone",
      category: "usb-peripheral",
      locationId: /touch/.test(blob)
        ? front.id
        : (ceiling?.id ?? front.id),
      quantity: 1,
      thirdParty: true,
      status: "assumed",
    });
  }

  const microphoneRequired = !audioByOthers && (
    conferencingRequired ||
    recordingRequired ||
    microphonesOnlyRequired
  );
  const microphoneCountValue = list(answers["uc-microphone-count"])[0] ?? "";
  const microphoneQuantity = microphoneCountValue === "two-four-microphone-feeds" ? 4
    : microphoneCountValue === "five-eight-microphone-feeds" ? 8
      : microphoneCountValue === "nine-plus-microphone-feeds" ? 9 : 1;
  const audioProcessingValues = list(answers["uc-audio-processing"]);
  const microphoneConnectionValues = list(answers["uc-microphone-connection"]);
  const microphoneServices: ProjectConnectionService[] = [
    ...(microphoneConnectionValues.some((value) => value.includes("analogue") || value.includes("phantom")) ? ["analogue-audio" as const] : []),
    ...(microphoneConnectionValues.some((value) => value.includes("dante") || value.includes("network")) ? ["ethernet" as const] : []),
    ...(microphoneConnectionValues.some((value) => value.includes("usb")) ? ["usb-2" as const] : []),
    ...(microphoneConnectionValues.some((value) => value.includes("digital-audio")) ? ["embedded-audio" as const] : []),
  ];
  if (microphoneServices.length === 0) microphoneServices.push("analogue-audio");
  const microphoneInterfaceNote = microphoneConnectionValues.length > 0
    ? `Specified microphone interfaces: ${microphoneConnectionValues.join(", ")}. Confirm channel count, gain, phantom power, clocking and conversion.`
    : "Confirm microphone transport, channel count, gain, phantom power and DSP input allocation.";

  const roomMicrophone = microphoneRequired
    ? addDevice({
        id: "device-room-microphone",
        name: microphonesOnlyRequired
          ? "Room microphone system"
          : "Room microphone / conferencing audio",
        category: "microphone",
        locationId: ceiling?.id ?? table.id,
        quantity: microphoneQuantity,
        thirdParty: true,
        status: "assumed",
        notes:
          "Confirm microphone type, count, USB/analogue/Dante connection, DSP and echo-cancellation requirements.",
      })
    : null;

  const roomAudioDsp = microphoneRequired && (
    microphoneQuantity > 1 ||
    audioProcessingValues.some((value) => value !== "direct-integrated-audio" && value !== "unknown-audio-processing")
  ) ? addDevice({
    id: "device-room-audio-dsp",
    name: "Room audio DSP / mixer / bridge",
    category: "audio-processor",
    locationId: rack.id,
    quantity: 1,
    thirdParty: true,
    status: audioProcessingValues.includes("unknown-audio-processing") ? "unknown" : "assumed",
    notes: "Confirm I/O count, DSP/AEC/automix, USB-Dante-analogue bridging, reinforcement, recording mixes, zones, control and commissioning responsibility.",
  }) : null;

  const recordingCapture = recordingRequired
    ? addDevice({
        id: "device-recording-capture",
        name: "Recording / streaming capture path TBC",
        category: "capture",
        locationId: rack.id,
        quantity: 1,
        thirdParty: true,
        status: "unknown",
        notes:
          "Confirm recording platform, capture inputs, audio mix, programme output and streaming destination.",
      })
    : null;

  const liveStreamEncoder = liveStreamRequired
    ? addDevice({
        id: "device-live-stream-encoder",
        name: "NHD-300-TX live-stream encoder",
        category: "encoder",
        locationId: rack.id,
        manufacturer: "WyreStorm",
        sku: "NHD-300-TX",
        quantity: 1,
        thirdParty: false,
        status: "assumed",
        notes: "Available WyreStorm live-stream encoder. HDMI input is limited to 1080p60 and does not support HDCP-protected content; verify the programme feed, audio mix, platform, wired network and upload capacity.",
      })
    : null;

  const cameraRoutingBridge = (cameraDistributionRequired && !explicitNoCamera) || multiCameraRequired
    ? addDevice({
        id: "device-camera-routing-bridge",
        name: ndiMultiCamera
          ? "NHD-128-NDI-TRX NDI / NetworkHD bridge"
          : standardMultiCamera
            ? "CAM-0402-BRG multi-camera bridge"
            : "Camera routing / bridge path TBC",
        category: "camera-bridge",
        locationId: rack.id,
        manufacturer: ndiMultiCamera || standardMultiCamera ? "WyreStorm" : undefined,
        sku: ndiMultiCamera ? "NHD-128-NDI-TRX" : standardMultiCamera ? "CAM-0402-BRG" : undefined,
        quantity: 1,
        thirdParty: false,
        status: ndiMultiCamera || standardMultiCamera ? "assumed" : "unknown",
        notes:
          ndiMultiCamera
            ? "The NHD-128-NDI-TRX converts up to eight NDI HX streams into virtual NetworkHD transmitters (soft sources). Validate the managed network and NDI source compatibility. NHD-150-RX decodes NetworkHD sources and can create a display multiview; validate a separate encode/capture path if that output must return to a stream or conferencing platform."
            : standardMultiCamera
              ? "CAM-0402-BRG bridges up to four HDMI/USB camera sources into the conferencing or production workflow. Confirm host, audio, switching and output requirements; five or more cameras need a wider production design."
              : "Confirm whether the camera path is USB, HDMI, NDI or AV-over-IP and which WyreStorm bridge or routing architecture is required.",
      })
    : null;

  const ndiMainDisplayDecoder = ndiMultiCamera
    ? addDevice({
        id: "device-ndi-main-display-decoder",
        name: "NHD-150-RX main display decoder",
        category: "decoder",
        locationId: front.id,
        manufacturer: "WyreStorm",
        sku: "NHD-150-RX",
        quantity: 1,
        thirdParty: false,
        status: "assumed",
        notes: "Use as the main display decoder for the NetworkHD/NDI multi-camera workflow.",
      })
    : null;
  // WINGMAN_DISCOVERY_UC_DEVICE_DEPENDENCIES_END

  const controlValues = list(answers.control);
  const controlInterfaceValues = [
    "front-panel-remote", "wall-keypad", "touch-panel", "software-app-control",
    "staff-mobile-control", "third-party-control", "central-operator-control",
    "source-selection-at-display", "independent-display-routing", "presets-schedules",
  ];
  if (controlValues.some((value) => controlInterfaceValues.includes(value))) {
    addDevice({
      id: "device-control-panel",
      name: controlValues.includes("central-operator-control") ? "Central operator source-routing control" : "Room source-selection control requirement",
      category: "control-requirement",
      locationId: controlValues.includes("central-operator-control") ? central?.id ?? rack.id : table.id,
      quantity: 1,
      thirdParty: true,
      status: "unknown",
      notes: `Functional requirement only; no control product or SKU selected. Confirm operator, interface, independent display/zone routing and integration scope. Captured needs: ${controlValues.filter((value) => controlInterfaceValues.includes(value)).join(", ")}.`,
    });
  }

  const locationById = new Map(locations.map((item) => [item.id, item]));
  const addConnection = (
    from: ProjectDevice,
    to: ProjectDevice,
    services: ProjectConnectionService[],
    preferred?: ProjectTransport,
    note?: string,
  ): ProjectConnection => {
    const fromLocation = locationById.get(from.locationId) ?? rack;
    const toLocation = locationById.get(to.locationId) ?? rack;
    const estimate = estimateBetween(fromLocation, toLocation, scale);
    const connection: ProjectConnection = {
      id: uniqueId("connection", connectionIds),
      fromDeviceId: from.id,
      toDeviceId: to.id,
      services,
      transport: preferred ?? chooseTransport(services, estimate, networked),
      ...estimate,
      status: "assumed",
      notes: note,
    };
    connection.scope = inferConnectionScope(connection, devices, locations);
    connections.push(connection);
    return connection;
  };

  // WINGMAN_DISCOVERY_SOURCE_UC_CONNECTIONS_START
  sourceDevices.forEach((source) => {
    if (source.id === "device-network-video-source") {
      addConnection(
        source,
        core,
        ["av-over-ip", "ethernet"],
        "ip-av-vlan",
        "Confirm the network video format and encoder, decoder or bridge requirement.",
      );
      return;
    }

    if (source.category === "camera" && cameraRoutingBridge) {
      const cameraServices: ProjectConnectionService[] = networked
        ? ["av-over-ip", "ethernet"]
        : ["video", "embedded-audio"];

      addConnection(
        source,
        cameraRoutingBridge,
        cameraServices,
        networked ? "ip-av-vlan" : undefined,
        "Confirm camera output format and the required bridge or routing path.",
      );
      return;
    }

    if (
      source.category === "camera" &&
      /ndi|network/.test(source.name.toLowerCase())
    ) {
      addConnection(
        source,
        core,
        ["av-over-ip", "ethernet"],
        "ip-av-vlan",
        "Confirm camera stream format and bridge/decoder requirement.",
      );
      return;
    }

    if (source.id === "device-user-laptop") {
      addConnection(
        source,
        core,
        ["video", "embedded-audio"],
        "usb-c",
      );
      return;
    }

    addConnection(
      source,
      core,
      ["video", "embedded-audio"],
      source.id === "device-wireless-receiver"
        ? "hdmi"
        : undefined,
    );
  });

  if (cameraRoutingBridge) {
    addConnection(
      cameraRoutingBridge,
      core,
      networked
        ? ["av-over-ip", "video", "embedded-audio"]
        : ["video", "embedded-audio"],
      networked ? "ip-av-vlan" : undefined,
      "Camera routing or distribution path; validate the final bridge and transport.",
    );
  }

  if (ndiMainDisplayDecoder) {
    addConnection(
      core,
      ndiMainDisplayDecoder,
      ["av-over-ip", "video", "embedded-audio"],
      "ip-av-vlan",
      "Main display decode path for NetworkHD sources and NDI camera streams.",
    );
  }

  if (liveStreamEncoder) {
    addConnection(
      ndiMainDisplayDecoder ?? cameraRoutingBridge ?? core,
      liveStreamEncoder,
      ["video", "embedded-audio"],
      "hdmi",
      "NHD-300-TX needs an HDMI programme feed. Confirm whether the source is the NHD-150-RX multiview, a camera bridge output or another programme source.",
    );
  }

  displayDevices.forEach((display) => {
    addConnection(
      core,
      display,
      networked
        ? ["av-over-ip", "video", "embedded-audio"]
        : ["video", "embedded-audio"],
      networked ? "ip-av-vlan" : undefined,
    );
  });

  const camera = devices.find(
    (item) =>
      item.id === "device-camera" ||
      item.id === "device-usb-peripheral",
  );

  const host =
    usbValues.includes("byod-byom") ||
    usbValues.includes("user-laptop-host")
      ? userLaptop
      : roomHost ?? userLaptop;

  if (usbRequired && camera && host && camera.id !== host.id) {
    const services: ProjectConnectionService[] =
      usbValues.includes("usb3-high-bandwidth-path")
        ? ["usb-3"]
        : ["usb-2"];

    addConnection(
      host,
      camera,
      services,
      undefined,
      usbValues.includes("switchable-host-usb")
        ? "USB host ownership must switch between room and user devices."
        : "Confirm the USB host, camera bandwidth and extension method.",
    );
  }

  if (roomMicrophone) {
    if (roomAudioDsp) {
      addConnection(roomMicrophone, roomAudioDsp, microphoneServices, undefined, microphoneInterfaceNote);
      if (conferencingRequired && host) addConnection(host, roomAudioDsp, ["usb-2"], undefined, "DSP provides the conferencing USB audio/AEC bridge; confirm host ownership and USB extension.");
      addConnection(roomAudioDsp, core, ["analogue-audio", "embedded-audio", "ethernet"], undefined, "Confirm programme audio, reinforcement, Dante/analogue bridging, zones and control.");
    } else if (conferencingRequired && host) {
      addConnection(
        host,
        roomMicrophone,
        ["usb-2"],
        undefined,
        "Confirm whether the microphone connects by USB, DSP, analogue audio or Dante and where echo cancellation occurs.",
      );
    } else {
      addConnection(
        roomMicrophone,
        core,
        ["analogue-audio"],
        "analogue-audio",
        "Confirm microphone pre-amplification, DSP, mixing and programme-audio routing.",
      );
    }
  }

  if (recordingCapture) {
    addConnection(
      core,
      recordingCapture,
      ["video", "embedded-audio"],
      undefined,
      "Confirm the capture resolution, programme output, audio mix and recording/streaming platform.",
    );

    if (roomMicrophone) {
      addConnection(
        roomAudioDsp ?? roomMicrophone,
        recordingCapture,
        ["analogue-audio"],
        "analogue-audio",
        "Confirm whether the microphone reaches the recording system directly or through a DSP/mixer.",
      );
    }
  }
  // WINGMAN_DISCOVERY_SOURCE_UC_CONNECTIONS_END

  const controlPanel = devices.find((item) => item.id === "device-control-panel");
  if (controlPanel) addConnection(controlPanel, core, ["ethernet", "rs232"], networked ? "shared-ip-network" : "rs232");

  const networkDevice = devices.find((item) => item.id === "device-av-network");
  if (networkDevice) {
    if (!connections.some((item) => item.toDeviceId === networkDevice.id || item.fromDeviceId === networkDevice.id)) {
      addConnection(core, networkDevice, ["ethernet", "av-over-ip"], "ip-av-vlan", "Logical AV network connection; endpoint patch leads remain separate.");
    }
    if (liveStreamEncoder) {
      addConnection(
        liveStreamEncoder,
        networkDevice,
        ["ethernet"],
        "shared-ip-network",
        "Confirm the wired uplink reaches the agreed public streaming platform or private audience and has sufficient sustained upload capacity.",
      );
    }
  }

  const legacyLength = legacyDistanceMetres(answers.distance);
  if (legacyLength !== undefined && connections.length) {
    const longest = connections.reduce((best, current) => (current.lengthMetres ?? 0) > (best.lengthMetres ?? 0) ? current : best, connections[0]);
    longest.lengthMode = "estimated";
    longest.lengthMetres = legacyLength;
    longest.estimateReason = "Migrated from the previous overall distance answer";
    longest.transport = chooseTransport(longest.services, longest, networked);
  }

  return {
    schemaVersion: PROJECT_TOPOLOGY_SCHEMA_VERSION,
    mode: "simple",
    locations,
    devices,
    connections,
    generatedFromDiscovery: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function projectTopologyHasContent(value: unknown): boolean {
  const topology = normaliseProjectTopology(value);
  return topology.devices.length >= 2 && topology.connections.length >= 1;
}
