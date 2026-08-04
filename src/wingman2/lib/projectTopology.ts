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

export type ProjectDevice = {
  id: string;
  name: string;
  category: string;
  locationId: string;
  manufacturer?: string;
  sku?: string;
  quantity: number;
  thirdParty: boolean;
  status: ProjectDeviceStatus;
  notes?: string;
};

export type ProjectConnection = {
  id: string;
  fromDeviceId: string;
  toDeviceId: string;
  fromPort?: string;
  toPort?: string;
  services: ProjectConnectionService[];
  transport: ProjectTransport;
  lengthMode: ProjectLengthMode;
  lengthMetres?: number;
  estimateReason?: string;
  networkSegmentId?: string;
  status: ProjectDeviceStatus;
  notes?: string;
};

export type ProjectTopology = {
  schemaVersion: number;
  mode: "simple" | "advanced";
  locations: ProjectLocation[];
  devices: ProjectDevice[];
  connections: ProjectConnection[];
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
const LENGTH_MODES = new Set<ProjectLengthMode>(["estimated", "confirmed", "unknown"]);

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

function sourceCountFrom(value: unknown): number {
  const source = list(value).join(" ");
  if (source.includes("nine-plus")) return 4;
  if (source.includes("five-eight")) return 3;
  if (source.includes("two-four")) return 2;
  return 1;
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
      locationId: locationIds.has(locationId) ? locationId : fallbackLocation,
      manufacturer: cleanText(row.manufacturer) || undefined,
      sku: cleanText(row.sku) || undefined,
      quantity: Math.max(1, Math.round(cleanNumber(row.quantity, 1) ?? 1)),
      thirdParty: Boolean(row.thirdParty),
      status: DEVICE_STATUSES.has(statusValue) ? statusValue : "assumed",
      notes: cleanText(row.notes) || undefined,
    }];
  });

  const deviceIds = new Set(devices.map((item) => item.id));
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
    return [{
      id: cleanText(row.id, `connection-${index + 1}`),
      fromDeviceId,
      toDeviceId,
      fromPort: cleanText(row.fromPort) || undefined,
      toPort: cleanText(row.toPort) || undefined,
      services: services.length ? services : ["video"],
      transport: TRANSPORT_TYPES.has(transportValue) ? transportValue : "unknown",
      lengthMode: LENGTH_MODES.has(lengthModeValue) ? lengthModeValue : "unknown",
      lengthMetres: cleanNumber(row.lengthMetres),
      estimateReason: cleanText(row.estimateReason) || undefined,
      networkSegmentId: cleanText(row.networkSegmentId) || undefined,
      status: DEVICE_STATUSES.has(statusValue) ? statusValue : "assumed",
      notes: cleanText(row.notes) || undefined,
    }];
  });

  return {
    schemaVersion: PROJECT_TOPOLOGY_SCHEMA_VERSION,
    mode: record.mode === "advanced" ? "advanced" : "simple",
    locations,
    devices,
    connections,
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
  const networked = /av-over-ip|distributed|building-wide|campus|managed-network|av vlan|networkhd|network-video-sources|cameras-ndi-network-streams/.test(blob);
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
  const network = networked ? addLocation("location-av-network", "AV network / VLAN", "network") : null;

  const addDevice = (input: Omit<ProjectDevice, "id"> & { id?: string }): ProjectDevice => {
    const id = input.id || uniqueId("device", deviceIds);
    deviceIds.add(id);
    const device = { ...input, id };
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

  // WINGMAN_DISCOVERY_SOURCE_UC_TOPOLOGY_START
  const sourceTypes = list(answers["source-connection"]);
  const sourceCount = sourceCountFrom(answers.sources);
  const sourceDevices: ProjectDevice[] = [];
  const unifiedCommsValues = Array.from(new Set([
    ...list(answers["uc-purpose"]),
    ...list(answers["unified-comms"]),
    ...list(answers["camera-microphone-workflow"]),
    ...list(answers["camera-microphone-workflows"]),
    ...list(answers["camera-microphone-requirements"]),
  ]));
  const noUnifiedComms =
    unifiedCommsValues.includes("no-uc");
  const unifiedCommsUnknown =
    unifiedCommsValues.includes("unknown-uc");
  const unifiedCommsInactive =
    noUnifiedComms || unifiedCommsUnknown;
  const legacyCombinedWorkflow =
    unifiedCommsValues.includes("conferencing-recording");
  const conferencingRequired =
    !unifiedCommsInactive &&
    (
      unifiedCommsValues.includes("video-conferencing") ||
      legacyCombinedWorkflow
    );
  const recordingRequired =
    !unifiedCommsInactive &&
    (
      unifiedCommsValues.includes("recording-streaming") ||
      legacyCombinedWorkflow
    );
  const cameraDistributionRequired =
    !unifiedCommsInactive &&
    unifiedCommsValues.includes("camera-distribution-only");
  const microphonesOnlyRequired =
    !unifiedCommsInactive &&
    unifiedCommsValues.includes("microphones-only");
  const cameraRequiredByUnifiedComms =
    conferencingRequired ||
    recordingRequired ||
    cameraDistributionRequired;
  const cameraCountValue = list(answers["uc-camera-count"])[0] ?? "";
  const cameraQuantity = cameraCountValue === "two-cameras"
    ? 2
    : cameraCountValue === "three-four-cameras"
      ? 4
      : cameraCountValue === "five-plus-cameras"
        ? 5
        : 1;
  const multiCameraRequired = cameraQuantity > 1;
  const multiCameraPath = list(answers["uc-multi-camera-path"])[0] ?? "";
  const ndiMultiCamera = multiCameraRequired && multiCameraPath === "multi-camera-ndi";
  const standardMultiCamera = multiCameraRequired && multiCameraPath === "multi-camera-non-ndi";

  if (
    sourceTypes.some(
      (item) =>
        item === "mixed-hdmi-usbc" ||
        item === "laptops-wireless-inputs" ||
        item === "all-source-types",
    ) ||
    /laptop|byod|byom|usb-c/.test(blob)
  ) {
    sourceDevices.push(addDevice({
      id: "device-user-laptop",
      name: "User laptop / BYOD source",
      category: "source",
      locationId: table.id,
      quantity: 1,
      thirdParty: true,
      status: "assumed",
    }));
  }

  const fixedSourceNeeded =
    sourceTypes.length === 0 ||
    sourceTypes.some(
      (item) =>
        item === "fixed-hdmi-sources" ||
        item === "mixed-hdmi-usbc" ||
        item === "all-source-types",
    );

  if (fixedSourceNeeded) {
    for (let index = 0; index < sourceCount; index += 1) {
      sourceDevices.push(addDevice({
        id: `device-fixed-source-${index + 1}`,
        name:
          sourceCount > 1
            ? `Fixed HDMI source ${index + 1}`
            : "Fixed HDMI source / room PC",
        category: "source",
        locationId: rack.id,
        quantity: 1,
        thirdParty: true,
        status: "assumed",
      }));
    }
  }

  if (
    sourceTypes.some(
      (item) =>
        item === "laptops-wireless-inputs" ||
        item === "all-source-types",
    ) ||
    /wireless presentation|casting/.test(blob)
  ) {
    sourceDevices.push(addDevice({
      id: "device-wireless-receiver",
      name: "Wireless presentation receiver",
      category: "source",
      locationId: rack.id,
      quantity: 1,
      thirdParty: false,
      status: "assumed",
    }));
  }

  if (sourceTypes.includes("network-video-sources")) {
    sourceDevices.push(addDevice({
      id: "device-local-source-tbc",
      name: "Local fixed or user presentation source TBC",
      category: "source",
      locationId: table.id,
      quantity: 1,
      thirdParty: true,
      status: "unknown",
      notes:
        "Confirm whether the local source is fixed HDMI, user HDMI, USB-C or wireless presentation.",
    }));

    sourceDevices.push(addDevice({
      id: "device-network-video-source",
      name: /ndi/.test(blob)
        ? "NDI / network video source"
        : "AV-over-IP / network video source",
      category: "network-video-source",
      locationId: network?.id ?? central?.id ?? rack.id,
      quantity: 1,
      thirdParty: true,
      status: "assumed",
      notes:
        "Confirm the network video format, ownership, encoder/decoder or bridge requirement and routing destination.",
    }));
  }

  const legacyCameraSourceSelected = sourceTypes.some(
    (item) =>
      item === "cameras-ndi-network-streams" ||
      item === "all-source-types",
  );

  if (
    legacyCameraSourceSelected ||
    (!unifiedCommsInactive && /ndi|ptz|camera/.test(blob)) ||
    cameraRequiredByUnifiedComms
  ) {
    sourceDevices.push(addDevice({
      id: "device-camera",
      name:
        ndiMultiCamera
          ? "CAM-210-NDI-PTZ camera"
          : standardMultiCamera
            ? "CAM-420-PTZ camera"
            : legacyCameraSourceSelected || /ndi/.test(blob)
              ? "NDI / network camera"
              : "Room camera",
      category: "camera",
      locationId: ceiling?.id ?? front.id,
      quantity: cameraQuantity,
      thirdParty: !(ndiMultiCamera || standardMultiCamera),
      status: "assumed",
      notes:
        cameraRequiredByUnifiedComms
          ? "Confirm camera count, framing, USB/HDMI/NDI output and whether a camera bridge is required."
          : undefined,
    }));
  }

  if (!sourceDevices.length) {
    sourceDevices.push(addDevice({
      id: "device-source-placeholder",
      name: "Customer source TBC",
      category: "source",
      locationId: table.id,
      quantity: 1,
      thirdParty: true,
      status: "unknown",
    }));
  }
  // WINGMAN_DISCOVERY_SOURCE_UC_TOPOLOGY_END

  const outputCount = displayCountFrom(answers.displays);
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

  const microphoneRequired =
    conferencingRequired ||
    recordingRequired ||
    microphonesOnlyRequired;

  const roomMicrophone = microphoneRequired
    ? addDevice({
        id: "device-room-microphone",
        name: microphonesOnlyRequired
          ? "Room microphone system"
          : "Room microphone / conferencing audio",
        category: "microphone",
        locationId: ceiling?.id ?? table.id,
        quantity: 1,
        thirdParty: true,
        status: "assumed",
        notes:
          "Confirm microphone type, count, USB/analogue/Dante connection, DSP and echo-cancellation requirements.",
      })
    : null;

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

  const cameraRoutingBridge = cameraDistributionRequired || multiCameraRequired
    ? addDevice({
        id: "device-camera-routing-bridge",
        name: ndiMultiCamera
          ? "NHD-128-NDI-TRX NDI / NetworkHD bridge"
          : standardMultiCamera
            ? "CAM-0402-BRG multi-camera bridge"
            : "Camera routing / bridge path TBC",
        category: "camera-bridge",
        locationId: rack.id,
        quantity: 1,
        thirdParty: false,
        status: ndiMultiCamera || standardMultiCamera ? "assumed" : "unknown",
        notes:
          ndiMultiCamera
            ? "Each CAM-210-NDI-PTZ stream can join the NetworkHD source pool through the NHD-128-NDI-TRX. NHD-150-RX can create the camera/data multiview at its HDMI output; validate the separate encode/capture path required if that composite must return to Teams or the NDI/NetworkHD networks."
            : standardMultiCamera
              ? "CAM-0402-BRG switches or bridges the CAM-420-PTZ USB/HDMI camera feeds into the conferencing host."
              : "Confirm whether the camera path is USB, HDMI, NDI or AV-over-IP and which WyreStorm bridge or routing architecture is required.",
      })
    : null;

  const ndiMainDisplayDecoder = ndiMultiCamera
    ? addDevice({
        id: "device-ndi-main-display-decoder",
        name: "NHD-150-RX main display decoder",
        category: "decoder",
        locationId: front.id,
        quantity: 1,
        thirdParty: false,
        status: "assumed",
        notes: "Use as the main display decoder for the NetworkHD/NDI multi-camera workflow.",
      })
    : null;
  // WINGMAN_DISCOVERY_UC_DEVICE_DEPENDENCIES_END

  if (hasAnswer(answers, "control", "touch-panel")) {
    addDevice({
      id: "device-control-panel",
      name: "Control touch panel",
      category: "control",
      locationId: table.id,
      quantity: 1,
      thirdParty: false,
      status: "assumed",
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
    if (conferencingRequired && host) {
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
        roomMicrophone,
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

export function migrateLegacyDiscoveryTopology(seed: DiscoveryTopologySeed): ProjectTopology {
  return generateProjectTopologyFromDiscovery(seed);
}

export function projectTopologyHasContent(value: unknown): boolean {
  const topology = normaliseProjectTopology(value);
  return topology.devices.length >= 2 && topology.connections.length >= 1;
}

export function projectTopologyLongestRun(value: unknown): number | undefined {
  const topology = normaliseProjectTopology(value);
  const values = topology.connections
    .map((item) => item.lengthMetres)
    .filter((item): item is number => typeof item === "number" && Number.isFinite(item));
  return values.length ? Math.max(...values) : undefined;
}

export function projectTopologyConnectionTypes(value: unknown): string[] {
  const topology = normaliseProjectTopology(value);
  const labelByValue = new Map(PROJECT_TRANSPORT_OPTIONS.map((item) => [item.value, item.label]));
  return Array.from(new Set(topology.connections.map((item) => labelByValue.get(item.transport) ?? item.transport)));
}

export function projectTopologyNetworkSummary(value: unknown): string {
  const topology = normaliseProjectTopology(value);
  const networkConnections = topology.connections.filter((item) =>
    ["ip-av-vlan", "shared-ip-network", "point-to-point-network", "dante-aes67"].includes(item.transport),
  );
  if (!networkConnections.length) return "No network transport currently indicated";
  return networkConnections.some((item) => item.transport === "ip-av-vlan")
    ? "Dedicated or governed AV-over-IP VLAN indicated"
    : "Customer/shared network transport indicated";
}

export function projectTopologySummary(value: unknown): string {
  const topology = normaliseProjectTopology(value);
  if (!topology.devices.length) return "Locations and connections not captured";
  const longest = projectTopologyLongestRun(topology);
  const estimated = topology.connections.filter((item) => item.lengthMode === "estimated").length;
  const unknown = topology.connections.filter((item) => item.lengthMode === "unknown").length;
  return [
    `${topology.devices.length} devices across ${topology.locations.length} locations`,
    `${topology.connections.length} defined connections`,
    longest !== undefined ? `longest recorded run ${longest} m` : "lengths not yet confirmed",
    estimated ? `${estimated} estimated` : "",
    unknown ? `${unknown} unknown` : "",
  ].filter(Boolean).join("; ");
}

export function projectTopologyMissingInformation(value: unknown): string[] {
  const topology = normaliseProjectTopology(value);
  const missing: string[] = [];
  if (!topology.devices.length) missing.push("Add the primary source, WyreStorm path and destination devices.");
  if (!topology.connections.length) missing.push("Define at least one connection between known project devices.");
  if (topology.devices.some((item) => !item.locationId || item.status === "unknown")) {
    missing.push("Confirm the location and identity of devices still marked unknown.");
  }
  if (topology.connections.some((item) => item.transport === "unknown")) {
    missing.push("Confirm the transport type for connections still marked unknown.");
  }
  if (topology.connections.some((item) => item.lengthMode === "unknown")) {
    missing.push("Confirm cable-route lengths currently marked unknown.");
  }
  if (topology.connections.some((item) => item.lengthMode === "estimated")) {
    missing.push("Validate estimated cable lengths against the installed route before final quoting.");
  }
  if (topology.connections.some((item) => item.services.includes("usb-3") && (item.lengthMetres ?? 0) > 3 && item.transport === "usb-data")) {
    missing.push("Validate the high-bandwidth USB 3.x extension method; the current direct USB path exceeds the planning allowance.");
  }
  if (topology.connections.some((item) => item.transport === "ip-av-vlan" || item.transport === "shared-ip-network")) {
    missing.push("Confirm network ownership, switch suitability, multicast/IGMP, bandwidth and VLAN policy with IT.");
  }
  // WINGMAN_DISCOVERY_UC_MISSING_INFORMATION_START
  if (
    topology.devices.some(
      (item) => item.id === "device-uc-host-tbc",
    )
  ) {
    missing.push(
      "Confirm whether conferencing is hosted by a user laptop, room PC or UC appliance.",
    );
  }

  if (
    topology.devices.some(
      (item) => item.id === "device-room-microphone",
    )
  ) {
    missing.push(
      "Confirm microphone type, quantity, connection method, DSP and echo-cancellation requirements.",
    );
  }

  if (
    topology.devices.some(
      (item) => item.id === "device-recording-capture",
    )
  ) {
    missing.push(
      "Confirm the recording or streaming platform, capture inputs, audio mix, resolution and destination.",
    );
  }

  if (
    topology.devices.some(
      (item) => item.id === "device-camera-routing-bridge",
    )
  ) {
    missing.push(
      "Confirm whether camera distribution uses USB, HDMI, NDI or AV-over-IP and select the required bridge or routing path.",
    );
  }

  if (
    topology.devices.some(
      (item) => item.id === "device-network-video-source",
    )
  ) {
    missing.push(
      "Confirm the network video format, network ownership, routing destination and encoder/decoder or bridge dependency.",
    );
  }
  // WINGMAN_DISCOVERY_UC_MISSING_INFORMATION_END

  return Array.from(new Set(missing));
}

export function projectTopologyEvidenceLines(value: unknown): string[] {
  const topology = normaliseProjectTopology(value);
  const locationById = new Map(topology.locations.map((item) => [item.id, item.name]));
  const deviceById = new Map(topology.devices.map((item) => [item.id, item]));
  const transportLabel = new Map(PROJECT_TRANSPORT_OPTIONS.map((item) => [item.value, item.label]));
  return topology.connections.map((connection) => {
    const from = deviceById.get(connection.fromDeviceId);
    const to = deviceById.get(connection.toDeviceId);
    const length = connection.lengthMode === "unknown"
      ? "length unknown"
      : `${connection.lengthMetres ?? 0} m ${connection.lengthMode}`;
    return [
      `${from?.name ?? connection.fromDeviceId} (${locationById.get(from?.locationId ?? "") ?? "unknown location"})`,
      "to",
      `${to?.name ?? connection.toDeviceId} (${locationById.get(to?.locationId ?? "") ?? "unknown location"})`,
      transportLabel.get(connection.transport) ?? connection.transport,
      connection.services.join(" + "),
      length,
    ].join(" | ");
  });
}

function mermaidId(value: string): string {
  const clean = value.replace(/[^a-zA-Z0-9_]/g, "_");
  return /^[A-Za-z_]/.test(clean) ? clean : `node_${clean}`;
}

function mermaidLabel(value: string): string {
  return value.replace(/["\[\]{}|]/g, " ").replace(/\s+/g, " ").trim();
}

export function projectTopologyToMermaid(value: unknown): string {
  const topology = normaliseProjectTopology(value);
  const transportLabel = new Map(PROJECT_TRANSPORT_OPTIONS.map((item) => [item.value, item.label]));
  const lines = ["flowchart LR"];
  topology.locations.forEach((location) => {
    lines.push(`  subgraph ${mermaidId(`location_${location.id}`)}["${mermaidLabel(location.name)}"]`);
    topology.devices.filter((device) => device.locationId === location.id).forEach((device) => {
      lines.push(`    ${mermaidId(device.id)}["${mermaidLabel(device.name)}"]`);
    });
    lines.push("  end");
  });
  topology.connections.forEach((connection) => {
    const length = connection.lengthMode === "unknown" ? "length TBC" : `${connection.lengthMetres ?? 0}m ${connection.lengthMode}`;
    const label = `${transportLabel.get(connection.transport) ?? connection.transport}; ${connection.services.join(" + ")}; ${length}`;
    lines.push(`  ${mermaidId(connection.fromDeviceId)} -->|"${mermaidLabel(label)}"| ${mermaidId(connection.toDeviceId)}`);
  });
  return lines.join("\n");
}

export const DISCOVERY_TOPOLOGY_STORAGE_KEY = "wingman:discovery-topology-v1";

function topologyStorageAvailable(): boolean {
  return typeof window !== "undefined" && Boolean(window.sessionStorage);
}

export function readDiscoveryTopology(): ProjectTopology {
  if (!topologyStorageAvailable()) return createBlankProjectTopology();
  try {
    const raw = window.sessionStorage.getItem(DISCOVERY_TOPOLOGY_STORAGE_KEY);
    return raw ? normaliseProjectTopology(JSON.parse(raw)) : createBlankProjectTopology();
  } catch {
    return createBlankProjectTopology();
  }
}

export function writeDiscoveryTopology(value: unknown): ProjectTopology {
  const topology = normaliseProjectTopology(value);
  if (topologyStorageAvailable()) {
    window.sessionStorage.setItem(DISCOVERY_TOPOLOGY_STORAGE_KEY, JSON.stringify(topology));
  }
  return topology;
}

export function clearDiscoveryTopology(): void {
  if (topologyStorageAvailable()) {
    window.sessionStorage.removeItem(DISCOVERY_TOPOLOGY_STORAGE_KEY);
  }
}
