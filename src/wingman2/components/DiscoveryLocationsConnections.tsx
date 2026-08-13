import { useState } from "react";
import {
  PROJECT_CONNECTION_SERVICE_OPTIONS,
  PROJECT_TRANSPORT_OPTIONS,
  generateProjectTopologyFromDiscovery,
  normaliseProjectTopology,
  projectTopologyMissingInformation,
  projectTopologySummary,
  type DiscoveryTopologySeed,
  type ProjectConnection,
  type ProjectConnectionService,
  type ProjectDevice,
  type ProjectLocation,
  type ProjectLocationType,
  type ProjectTopology,
  type ProjectTransport,
} from "../lib/projectTopology";

// WINGMAN_SIMPLE_ROUTE_PLANNER
type DiscoveryLocationsConnectionsProps = {
  value: ProjectTopology;
  seed: DiscoveryTopologySeed;
  onChange: (next: ProjectTopology) => void;
};

type EquipmentPosition =
  | "display-wall"
  | "room-furniture"
  | "table"
  | "lectern"
  | "room-rack"
  | "central-rack"
  | "unknown";

type DistanceBand =
  | "same-position"
  | "nearby"
  | "typical-room"
  | "large-room"
  | "remote-rack"
  | "over-100m"
  | "unknown";

type RouteType =
  | "direct"
  | "furniture-floorbox"
  | "ceiling-perimeter"
  | "between-rooms"
  | "between-floors-buildings"
  | "unknown";

type UsbDistance =
  | "not-required"
  | "same-position"
  | "under-5m"
  | "across-room"
  | "different-room"
  | "av-network"
  | "unknown";

type ExceptionMode = "none" | "yes" | "unknown";

type RoutePlanningState = {
  equipmentPosition: EquipmentPosition;
  videoDistance: DistanceBand;
  routeType: RouteType;
  usbDistance: UsbDistance;
  exceptionMode: ExceptionMode;
  exceptionName: string;
  exceptionDistance: DistanceBand;
};

type Choice<T extends string> = {
  value: T;
  label: string;
  help: string;
};

type DistanceChoice = Choice<DistanceBand> & {
  metres?: number;
};

const PLANNING_MARKER = "wingman-route-planner:";

const EQUIPMENT_OPTIONS: Array<Choice<EquipmentPosition>> = [
  { value: "display-wall", label: "At the display", help: "Equipment is mounted behind or beside the main display." },
  { value: "room-furniture", label: "Room furniture / credenza", help: "Sources and switching sit in nearby furniture." },
  { value: "table", label: "Meeting table", help: "The main user equipment or conferencing host is at the table." },
  { value: "lectern", label: "Lectern", help: "Sources and controls are concentrated at a lectern." },
  { value: "room-rack", label: "Local room rack", help: "Equipment is installed in a rack serving this room." },
  { value: "central-rack", label: "Central equipment rack", help: "Sources or switching are outside the room in a central rack." },
  { value: "unknown", label: "Not yet known", help: "Keep the route provisional and flag it for survey." },
];

const DISTANCE_OPTIONS: DistanceChoice[] = [
  { value: "same-position", label: "Same position", help: "Within the same furniture, rack or display position.", metres: 3 },
  { value: "nearby", label: "Nearby in the room", help: "A short local route, approximately 3–10 metres.", metres: 10 },
  { value: "typical-room", label: "Across a typical room", help: "Approximately 10–25 metres before route allowance.", metres: 25 },
  { value: "large-room", label: "Across a large room", help: "Approximately 25–50 metres before route allowance.", metres: 50 },
  { value: "remote-rack", label: "Remote rack / adjacent room", help: "Approximately 50–100 metres.", metres: 100 },
  { value: "over-100m", label: "Different floor, building or 100 m+", help: "Fibre or network architecture will usually need review.", metres: 120 },
  { value: "unknown", label: "Not yet known", help: "Do not guess. Mark the route for site survey." },
];

const ROUTE_OPTIONS: Array<Choice<RouteType> & { allowance: number }> = [
  { value: "direct", label: "Direct local route", help: "A straightforward path between nearby equipment.", allowance: 1 },
  { value: "furniture-floorbox", label: "Furniture / floor box", help: "Allow for routing through furniture and floor boxes.", allowance: 1.15 },
  { value: "ceiling-perimeter", label: "Ceiling / room perimeter", help: "Allow extra length for rising, falling and following the room edge.", allowance: 1.25 },
  { value: "between-rooms", label: "Between rooms", help: "Allow for corridors, containment and indirect cable paths.", allowance: 1.35 },
  { value: "between-floors-buildings", label: "Between floors / buildings", help: "Treat as an infrastructure route requiring validation.", allowance: 1.5 },
  { value: "unknown", label: "Not yet known", help: "Use a provisional allowance and require survey.", allowance: 1.2 },
];

const USB_OPTIONS: Array<Choice<UsbDistance> & { metres?: number }> = [
  { value: "same-position", label: "Together", help: "USB host and peripheral share the same equipment position.", metres: 2 },
  { value: "under-5m", label: "Less than 5 m apart", help: "A local USB cable may be suitable, subject to USB generation.", metres: 5 },
  { value: "across-room", label: "Across the room", help: "USB extension or USB-capable AV transport is likely.", metres: 15 },
  { value: "different-room", label: "Different rooms", help: "A dedicated USB extension or networked USB path is likely.", metres: 30 },
  { value: "av-network", label: "Through the AV network", help: "The chosen AV-over-IP platform must explicitly support the required USB workflow.", metres: 5 },
  { value: "unknown", label: "Not yet known", help: "USB ownership and route must be confirmed before quoting." },
];

const EQUIPMENT_LOCATION_MAP: Record<EquipmentPosition, { name: string; type: ProjectLocationType }> = {
  "display-wall": { name: "Main display position", type: "display-wall" },
  "room-furniture": { name: "Room furniture / credenza", type: "local-cupboard" },
  table: { name: "Meeting table", type: "table" },
  lectern: { name: "Lectern", type: "lectern" },
  "room-rack": { name: "Local room rack", type: "room-rack" },
  "central-rack": { name: "Central equipment rack", type: "central-rack" },
  unknown: { name: "Main equipment position - TBC", type: "unknown" },
};

function timestamp(): string {
  return new Date().toISOString();
}

function seedText(seed: DiscoveryTopologySeed): string {
  return JSON.stringify({
    answers: seed.answers ?? {},
    notes: seed.notes ?? {},
    application: seed.application ?? "",
  }).toLowerCase();
}

function deriveDefaultPlan(blob: string): RoutePlanningState {
  let equipmentPosition: EquipmentPosition = "room-rack";
  let videoDistance: DistanceBand = "typical-room";
  let routeType: RouteType = "ceiling-perimeter";

  if (/single-small-room|huddle|small room/.test(blob)) {
    equipmentPosition = "room-furniture";
    videoDistance = "nearby";
    routeType = "furniture-floorbox";
  }

  if (/meeting-room|boardroom|byod|byom|speakerphone/.test(blob)) {
    equipmentPosition = "table";
  }

  if (/classroom|teaching|lecture|lectern/.test(blob)) {
    equipmentPosition = "lectern";
  }

  if (/video-wall|display wall|led wall/.test(blob)) {
    equipmentPosition = "room-rack";
    videoDistance = "large-room";
  }

  if (/multi-room|other-room/.test(blob)) {
    equipmentPosition = "central-rack";
    videoDistance = "remote-rack";
    routeType = "between-rooms";
  }

  if (/building-wide|campus|other-building|other-floor/.test(blob)) {
    equipmentPosition = "central-rack";
    videoDistance = "over-100m";
    routeType = "between-floors-buildings";
  }

  const usbNeeded = /usb|camera|speakerphone|touch|interactive|kvm|byom|conferencing/.test(blob);

  return {
    equipmentPosition,
    videoDistance,
    routeType,
    usbDistance: usbNeeded ? (videoDistance === "nearby" ? "under-5m" : "across-room") : "not-required",
    exceptionMode: "none",
    exceptionName: "",
    exceptionDistance: "large-room",
  };
}

function planningMarker(plan: RoutePlanningState): string {
  return `${PLANNING_MARKER}${JSON.stringify(plan)}`;
}

function stripPlanningMarker(notes: string | undefined): string {
  return String(notes ?? "")
    .split(/\r?\n/)
    .filter((line) => !line.startsWith(PLANNING_MARKER))
    .join("\n")
    .trim();
}

function readStoredPlan(topology: ProjectTopology, fallback: RoutePlanningState): RoutePlanningState {
  for (const location of topology.locations) {
    const markerLine = String(location.notes ?? "")
      .split(/\r?\n/)
      .find((line) => line.startsWith(PLANNING_MARKER));

    if (!markerLine) continue;

    try {
      const parsed = JSON.parse(markerLine.slice(PLANNING_MARKER.length)) as Partial<RoutePlanningState>;
      return { ...fallback, ...parsed };
    } catch {
      return fallback;
    }
  }

  return fallback;
}

function distanceChoice(value: DistanceBand): DistanceChoice {
  return DISTANCE_OPTIONS.find((option) => option.value === value) ?? DISTANCE_OPTIONS[DISTANCE_OPTIONS.length - 1];
}

function routeAllowance(value: RouteType): number {
  return ROUTE_OPTIONS.find((option) => option.value === value)?.allowance ?? 1.2;
}

function plannedVideoMetres(plan: RoutePlanningState): number | undefined {
  const base = distanceChoice(plan.videoDistance).metres;
  if (base === undefined) return undefined;
  if (base <= 3) return base;
  return Math.ceil((base * routeAllowance(plan.routeType)) / 5) * 5;
}

function plannedUsbMetres(plan: RoutePlanningState): number | undefined {
  return USB_OPTIONS.find((option) => option.value === plan.usbDistance)?.metres;
}

function exceptionMetres(plan: RoutePlanningState): number | undefined {
  if (plan.exceptionMode !== "yes") return undefined;
  return distanceChoice(plan.exceptionDistance).metres;
}

function hasUsbService(connection: ProjectConnection): boolean {
  return connection.services.some((service) => ["usb-2", "usb-3", "usb-kvm"].includes(service));
}

function likelyVideoTransport(
  services: ProjectConnectionService[],
  metres: number | undefined,
  existingTransport: ProjectTransport,
): ProjectTransport {
  if (services.includes("av-over-ip")) {
    return existingTransport === "shared-ip-network" ? "shared-ip-network" : "ip-av-vlan";
  }

  if (["ip-av-vlan", "shared-ip-network", "point-to-point-network"].includes(existingTransport)) {
    return existingTransport;
  }

  if (metres === undefined) return "unknown";
  if (metres <= 10) return "hdmi";
  if (metres <= 100) return "hdbaset-3";
  return "fibre-sm";
}

function likelyUsbTransport(plan: RoutePlanningState, metres: number | undefined): ProjectTransport {
  if (plan.usbDistance === "av-network") return "ip-av-vlan";
  if (metres === undefined) return "unknown";
  if (metres <= 5) return "usb-data";
  return "usb-extender";
}

function transportLabel(value: ProjectTransport): string {
  return PROJECT_TRANSPORT_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

function distanceLabel(value: DistanceBand): string {
  return distanceChoice(value).label;
}

function routeTypeLabel(value: RouteType): string {
  return ROUTE_OPTIONS.find((option) => option.value === value)?.label ?? "Not yet known";
}

function normaliseEquipmentLocation(
  locations: ProjectLocation[],
  plan: RoutePlanningState,
): { locations: ProjectLocation[]; equipmentLocation: ProjectLocation; endpointLocation: ProjectLocation } {
  const equipmentDefinition = EQUIPMENT_LOCATION_MAP[plan.equipmentPosition];
  const existingEquipment =
    locations.find((location) => location.id === "planning-equipment-position") ??
    locations.find((location) => ["room-rack", "central-rack", "local-cupboard", "table", "lectern"].includes(location.type)) ??
    locations[0];

  const equipmentLocation: ProjectLocation = {
    id: existingEquipment?.id ?? "planning-equipment-position",
    name: equipmentDefinition.name,
    type: equipmentDefinition.type,
    roomId: existingEquipment?.roomId,
    buildingId: existingEquipment?.buildingId,
    notes: [stripPlanningMarker(existingEquipment?.notes), planningMarker(plan)].filter(Boolean).join("\n"),
  };

  const nextLocations = existingEquipment
    ? locations.map((location) => (location.id === existingEquipment.id ? equipmentLocation : location))
    : [...locations, equipmentLocation];

  const existingEndpoint =
    nextLocations.find((location) =>
      location.id !== equipmentLocation.id &&
      ["display-wall", "projector-position", "ceiling", "other-room", "other-floor", "other-building"].includes(location.type),
    ) ??
    nextLocations.find((location) => location.id !== equipmentLocation.id);

  const endpointLocation: ProjectLocation = existingEndpoint ?? {
    id: "planning-display-position",
    name: "Main display / endpoint position",
    type: "display-wall",
  };

  if (!existingEndpoint) nextLocations.push(endpointLocation);

  return { locations: nextLocations, equipmentLocation, endpointLocation };
}

export default function DiscoveryLocationsConnections({
  value,
  seed,
  onChange,
}: DiscoveryLocationsConnectionsProps) {
  const topology = normaliseProjectTopology(value);
  const blob = seedText(seed);
  const usbRequired = /usb|camera|speakerphone|touch|interactive|kvm|byom|conferencing/.test(blob);
  const defaultPlan = deriveDefaultPlan(blob);
  const plan = readStoredPlan(topology, defaultPlan);
  const [showAdvanced, setShowAdvanced] = useState(topology.mode === "advanced");
  const [activePlanningStep, setActivePlanningStep] = useState(0);
  const planningSteps = [
    "Equipment position",
    "Video distance",
    "Cable route",
    ...(usbRequired ? ["USB path"] : []),
    "Exceptions",
  ];
  const finalPlanningStep = planningSteps.length - 1;

  function buildPlannedTopology(nextPlan: RoutePlanningState, baseOverride?: ProjectTopology): ProjectTopology {
    const generated = generateProjectTopologyFromDiscovery({
      ...seed,
      existing: undefined,
    });

    const base =
      baseOverride ??
      (topology.devices.length > 0 || topology.connections.length > 0 ? topology : generated);

    const locationResult = normaliseEquipmentLocation([...base.locations], nextPlan);
    let locations = [...locationResult.locations];
    const equipmentLocation = locationResult.equipmentLocation;
    const endpointLocation = locationResult.endpointLocation;
    let devices = [...base.devices];

    if (devices.length === 0) {
      devices = [
        {
          id: "planning-source",
          name: "Primary source / switching position",
          category: "source",
          locationId: equipmentLocation.id,
          quantity: 1,
          thirdParty: true,
          status: "assumed",
        },
        {
          id: "planning-display",
          name: "Main display / destination",
          category: "display",
          locationId: endpointLocation.id,
          quantity: 1,
          thirdParty: true,
          status: "assumed",
        },
      ];
    }

    if (devices.length === 1) {
      devices.push({
        id: "planning-display",
        name: "Main display / destination",
        category: "display",
        locationId: endpointLocation.id,
        quantity: 1,
        thirdParty: true,
        status: "assumed",
      });
    }

    const videoMetres = plannedVideoMetres(nextPlan);
    const usbMetres = plannedUsbMetres(nextPlan);
    const planningReason = videoMetres === undefined
      ? "Distance not yet known - site survey required"
      : `${distanceLabel(nextPlan.videoDistance)} via ${routeTypeLabel(nextPlan.routeType)}; planning allowance ${videoMetres} m`;

    let connections = base.connections.map((connection) => {
      if (connection.lengthMode === "confirmed") return connection;

      if (hasUsbService(connection)) {
        return {
          ...connection,
          transport: likelyUsbTransport(nextPlan, usbMetres),
          lengthMode: usbMetres === undefined ? "unknown" as const : "estimated" as const,
          lengthMetres: usbMetres,
          estimateReason: usbMetres === undefined
            ? "USB host-to-device distance must be confirmed"
            : `USB host-to-device planning distance ${usbMetres} m`,
          status: usbMetres === undefined ? "unknown" as const : "assumed" as const,
        };
      }

      return {
        ...connection,
        transport: likelyVideoTransport(connection.services, videoMetres, connection.transport),
        lengthMode: videoMetres === undefined ? "unknown" as const : "estimated" as const,
        lengthMetres: videoMetres,
        estimateReason: planningReason,
        status: videoMetres === undefined ? "unknown" as const : "assumed" as const,
      };
    });

    if (connections.length === 0) {
      connections.push({
        id: "planning-video-path",
        fromDeviceId: devices[0].id,
        toDeviceId: devices[1].id,
        services: ["video", "embedded-audio"],
        transport: likelyVideoTransport(["video", "embedded-audio"], videoMetres, "unknown"),
        lengthMode: videoMetres === undefined ? "unknown" : "estimated",
        lengthMetres: videoMetres,
        estimateReason: planningReason,
        status: videoMetres === undefined ? "unknown" : "assumed",
      });
    }

    if (usbRequired && !connections.some(hasUsbService)) {
      const usbService: ProjectConnectionService = /usb-3|usb3|capture/.test(blob)
        ? "usb-3"
        : /kvm/.test(blob)
          ? "usb-kvm"
          : "usb-2";

      let host = devices.find((device) => device.id === "planning-usb-host");
      if (!host) {
        host = {
          id: "planning-usb-host",
          name: "USB host / conferencing computer",
          category: "usb-host",
          locationId: equipmentLocation.id,
          quantity: 1,
          thirdParty: true,
          status: nextPlan.usbDistance === "unknown" ? "unknown" : "assumed",
        };
        devices.push(host);
      }

      let peripheral = devices.find((device) => device.id === "planning-usb-peripheral");
      if (!peripheral) {
        peripheral = {
          id: "planning-usb-peripheral",
          name: "USB camera / peripheral position",
          category: "usb-device",
          locationId: endpointLocation.id,
          quantity: 1,
          thirdParty: true,
          status: nextPlan.usbDistance === "unknown" ? "unknown" : "assumed",
        };
        devices.push(peripheral);
      }

      connections.push({
        id: "planning-usb-path",
        fromDeviceId: host.id,
        toDeviceId: peripheral.id,
        services: [usbService],
        transport: likelyUsbTransport(nextPlan, usbMetres),
        lengthMode: usbMetres === undefined ? "unknown" : "estimated",
        lengthMetres: usbMetres,
        estimateReason: usbMetres === undefined
          ? "USB host-to-device distance must be confirmed"
          : `USB host-to-device planning distance ${usbMetres} m`,
        status: usbMetres === undefined ? "unknown" : "assumed",
      });
    }

    const exceptionLength = exceptionMetres(nextPlan);
    const exceptionLocationId = "planning-exception-location";
    const exceptionDeviceId = "planning-exception-device";
    const exceptionConnectionId = "planning-exception-path";

    if (nextPlan.exceptionMode !== "yes") {
      locations = locations.filter((location) => location.id !== exceptionLocationId);
      devices = devices.filter((device) => device.id !== exceptionDeviceId);
      connections = connections.filter((connection) => connection.id !== exceptionConnectionId);
    }

    if (nextPlan.exceptionMode === "yes") {
      const exceptionLocation: ProjectLocation = {
        id: exceptionLocationId,
        name: nextPlan.exceptionName.trim() || "Distant device / area",
        type: nextPlan.exceptionDistance === "over-100m" ? "other-building" : "other-room",
        notes: "Additional route exception captured during discovery",
      };

      locations = [
        ...locations.filter((location) => location.id !== exceptionLocationId),
        exceptionLocation,
      ];

      const exceptionDevice: ProjectDevice = {
        id: exceptionDeviceId,
        name: nextPlan.exceptionName.trim() || "Distant display / endpoint",
        category: "endpoint",
        locationId: exceptionLocationId,
        quantity: 1,
        thirdParty: true,
        status: exceptionLength === undefined ? "unknown" : "assumed",
      };

      devices = [
        ...devices.filter((device) => device.id !== exceptionDeviceId),
        exceptionDevice,
      ];

      const sourceDevice = devices.find((device) => device.id !== exceptionDeviceId) ?? devices[0];
      if (sourceDevice) {
        const exceptionConnection: ProjectConnection = {
          id: exceptionConnectionId,
          fromDeviceId: sourceDevice.id,
          toDeviceId: exceptionDeviceId,
          services: ["video", "embedded-audio"],
          transport: likelyVideoTransport(["video", "embedded-audio"], exceptionLength, "unknown"),
          lengthMode: exceptionLength === undefined ? "unknown" : "estimated",
          lengthMetres: exceptionLength,
          estimateReason: exceptionLength === undefined
            ? "Exception route must be surveyed"
            : `Additional route exception planned at ${exceptionLength} m`,
          status: exceptionLength === undefined ? "unknown" : "assumed",
        };

        connections = [
          ...connections.filter((connection) => connection.id !== exceptionConnectionId),
          exceptionConnection,
        ];
      }
    }

    return normaliseProjectTopology({
      ...base,
      mode: showAdvanced ? "advanced" : "simple",
      locations,
      devices,
      connections,
      generatedFromDiscovery: true,
      updatedAt: timestamp(),
    });
  }

  const previewTopology = buildPlannedTopology(plan);
  const deviceById = new Map(previewTopology.devices.map((device) => [device.id, device]));
  const missingInformation = projectTopologyMissingInformation(previewTopology);
  const videoMetres = plannedVideoMetres(plan);
  const longestMetres = Math.max(videoMetres ?? 0, exceptionMetres(plan) ?? 0);
  const representativeVideoPath = previewTopology.connections.find((connection) => !hasUsbService(connection));
  const likelyTransport = representativeVideoPath?.transport ?? "unknown";

  function emit(next: ProjectTopology): void {
    onChange(normaliseProjectTopology({ ...next, updatedAt: timestamp() }));
  }

  function updatePlan(patch: Partial<RoutePlanningState>): void {
    const nextPlan = { ...plan, ...patch };
    emit(buildPlannedTopology(nextPlan));
  }

  function rebuildSuggestions(): void {
    const generated = generateProjectTopologyFromDiscovery({
      ...seed,
      existing: undefined,
    });
    emit(buildPlannedTopology(plan, generated));
  }

  function toggleAdvanced(): void {
    const nextAdvanced = !showAdvanced;
    setShowAdvanced(nextAdvanced);
    emit({
      ...previewTopology,
      mode: nextAdvanced ? "advanced" : "simple",
    });
  }

  function updateConnection(id: string, patch: Partial<ProjectConnection>): void {
    emit({
      ...previewTopology,
      mode: "advanced",
      connections: previewTopology.connections.map((connection) =>
        connection.id === id ? { ...connection, ...patch } : connection,
      ),
    });
  }

  function toggleConnectionService(connection: ProjectConnection, service: ProjectConnectionService): void {
    const services = connection.services.includes(service)
      ? connection.services.filter((item) => item !== service)
      : [...connection.services, service];

    updateConnection(connection.id, {
      services: services.length > 0 ? services : ["video"],
    });
  }

  const likelyRequirement =
    videoMetres === undefined
      ? "Distance survey required"
      : longestMetres <= 10
        ? "Direct HDMI may be suitable"
        : longestMetres <= 100
          ? "HDBaseT or active extension likely"
          : "Fibre or AV-over-IP architecture review";

  return (
    <section className="wm-topology-editor wm-route-planner wm-ui-card" aria-label="Signal distance check">
      <header className="wm-topology-editor-head wm-route-planner-head">
        <div>
          <span>Signal distance check</span>
          <strong>{projectTopologySummary(previewTopology)}</strong>
          <small>
            Choose broad room positions and distance bands. Wingman will create provisional paths and flag anything
            that still needs a site survey.
          </small>
        </div>
        <div className="wm-topology-editor-actions">
          <button className="wm-ui-button wm-ui-button-secondary" type="button" onClick={rebuildSuggestions}>
            Rebuild from discovery
          </button>
          <button className="wm-ui-button wm-ui-button-secondary" type="button" onClick={toggleAdvanced}>
            {showAdvanced ? "Hide advanced route planner" : "Advanced route planner"}
          </button>
        </div>
      </header>

      <nav className="wm-route-stepper" aria-label="Signal distance check progress">
        {planningSteps.map((label, index) => (
          <button
            key={label}
            type="button"
            className={index === activePlanningStep ? "is-active" : index < activePlanningStep ? "is-complete" : ""}
            onClick={() => setActivePlanningStep(index)}
            aria-current={index === activePlanningStep ? "step" : undefined}
          >
            <span>{index + 1}</span>
            <strong>{label}</strong>
          </button>
        ))}
      </nav>

      <div className="wm-route-planner-flow wm-route-planner-flow-guided">
        {activePlanningStep === 0 ? <fieldset className="wm-route-planner-step">
          <legend><span>1</span> Where is the main equipment?</legend>
          <div className="wm-route-choice-grid">
            {EQUIPMENT_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={plan.equipmentPosition === option.value ? "wm-route-choice is-selected" : "wm-route-choice"}
                onClick={() => updatePlan({ equipmentPosition: option.value })}
                aria-pressed={plan.equipmentPosition === option.value}
              >
                <strong>{option.label}</strong>
                <small>{option.help}</small>
              </button>
            ))}
          </div>
        </fieldset> : null}

        {activePlanningStep === 1 ? <fieldset className="wm-route-planner-step">
          <legend><span>2</span> What is the longest video route?</legend>
          <div className="wm-route-choice-grid wm-route-distance-grid">
            {DISTANCE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={plan.videoDistance === option.value ? "wm-route-choice is-selected" : "wm-route-choice"}
                onClick={() => updatePlan({ videoDistance: option.value })}
                aria-pressed={plan.videoDistance === option.value}
              >
                <strong>{option.label}</strong>
                <small>{option.help}</small>
              </button>
            ))}
          </div>

          <div className="wm-route-distance-visual" aria-label="Selected planning route">
            <span>{EQUIPMENT_LOCATION_MAP[plan.equipmentPosition].name}</span>
            <div><i /><strong>{videoMetres === undefined ? "Survey required" : `${videoMetres} m planning allowance`}</strong><i /></div>
            <span>Main display / endpoint</span>
          </div>
        </fieldset> : null}

        {activePlanningStep === 2 ? <fieldset className="wm-route-planner-step">
          <legend><span>3</span> How will the cable probably travel?</legend>
          <div className="wm-route-choice-grid">
            {ROUTE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={plan.routeType === option.value ? "wm-route-choice is-selected" : "wm-route-choice"}
                onClick={() => updatePlan({ routeType: option.value })}
                aria-pressed={plan.routeType === option.value}
              >
                <strong>{option.label}</strong>
                <small>{option.help}</small>
              </button>
            ))}
          </div>
        </fieldset> : null}

        {usbRequired && activePlanningStep === 3 ? (
          <fieldset className="wm-route-planner-step">
            <legend><span>4</span> Where is the USB host compared with the USB devices?</legend>
            <p className="wm-route-planner-intro">
              This appears because cameras, speakerphones, touch, conferencing or another USB workflow was captured earlier.
            </p>
            <div className="wm-route-choice-grid">
              {USB_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={plan.usbDistance === option.value ? "wm-route-choice is-selected" : "wm-route-choice"}
                  onClick={() => updatePlan({ usbDistance: option.value })}
                  aria-pressed={plan.usbDistance === option.value}
                >
                  <strong>{option.label}</strong>
                  <small>{option.help}</small>
                </button>
              ))}
            </div>
          </fieldset>
        ) : null}

        {activePlanningStep === finalPlanningStep ? <fieldset className="wm-route-planner-step">
          <legend><span>{usbRequired ? "5" : "4"}</span> Is any device much further away than the rest?</legend>
          <div className="wm-route-choice-grid wm-route-exception-choice-grid">
            {([
              { value: "none", label: "No", help: "Use the main distance for all similar routes." },
              { value: "yes", label: "Yes", help: "Add one significant distance exception." },
              { value: "unknown", label: "Not sure", help: "Keep the project survey warning visible." },
            ] as Array<Choice<ExceptionMode>>).map((option) => (
              <button
                key={option.value}
                type="button"
                className={plan.exceptionMode === option.value ? "wm-route-choice is-selected" : "wm-route-choice"}
                onClick={() => updatePlan({ exceptionMode: option.value })}
                aria-pressed={plan.exceptionMode === option.value}
              >
                <strong>{option.label}</strong>
                <small>{option.help}</small>
              </button>
            ))}
          </div>

          {plan.exceptionMode === "yes" ? (
            <div className="wm-route-exception-fields">
              <label>
                Device or area
                <input
                  className="wm-ui-input"
                  value={plan.exceptionName}
                  onChange={(event) => updatePlan({ exceptionName: event.target.value })}
                  placeholder="e.g. Overflow display in adjacent room"
                />
              </label>
              <label>
                Approximate distance
                <select
                  className="wm-ui-input"
                  value={plan.exceptionDistance}
                  onChange={(event) => updatePlan({ exceptionDistance: event.target.value as DistanceBand })}
                >
                  {DISTANCE_OPTIONS.filter((option) => option.value !== "same-position").map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}
        </fieldset> : null}

        <footer className="wm-route-step-actions">
          <button
            className="wm-ui-button wm-ui-button-secondary"
            type="button"
            onClick={() => setActivePlanningStep((step) => Math.max(0, step - 1))}
            disabled={activePlanningStep === 0}
          >
            Back
          </button>
          <span>Step {activePlanningStep + 1} of {planningSteps.length}</span>
          {activePlanningStep < finalPlanningStep ? (
            <button
              className="wm-ui-button wm-ui-button-primary"
              type="button"
              onClick={() => setActivePlanningStep((step) => Math.min(finalPlanningStep, step + 1))}
            >
              Next question
            </button>
          ) : (
            <button className="wm-ui-button wm-ui-button-primary" type="button" onClick={() => setActivePlanningStep(0)}>
              Review answers
            </button>
          )}
        </footer>
      </div>

      <section className="wm-route-result-card" aria-label="Likely transport requirement">
        <div>
          <span>Likely transport requirement</span>
          <h3>{likelyRequirement}</h3>
        </div>
        <dl>
          <div><dt>Longest estimated video route</dt><dd>{videoMetres === undefined ? "Unknown" : `${longestMetres} m`}</dd></div>
          <div><dt>Preliminary transport</dt><dd>{transportLabel(likelyTransport)}</dd></div>
          <div><dt>USB extension required</dt><dd>{usbRequired ? (plannedUsbMetres(plan) !== undefined && (plannedUsbMetres(plan) ?? 0) <= 5 ? "Check USB generation" : "Likely / confirm") : "No USB path captured"}</dd></div>
          <div><dt>Planning status</dt><dd>{videoMetres === undefined || plan.exceptionMode === "unknown" ? "Survey required" : "Estimated"}</dd></div>
        </dl>
        <ul>
          <li>
            {longestMetres <= 10 && videoMetres !== undefined
              ? "Use product-compatible HDMI patch leads; confirm resolution, HDR and cable certification."
              : longestMetres <= 100 && videoMetres !== undefined
                ? "Plan an approved structured-cabling link. Final cable category and extender SKU must follow the selected WyreStorm product."
                : "Plan fibre or managed network infrastructure. Optics, switching and exact transport products must follow the selected architecture."}
          </li>
          {usbRequired ? <li>Video and USB are checked separately. A video extender is not assumed to carry the required USB service.</li> : null}
          <li>Exact cable lengths and extender capability must be validated against the selected product datasheet before final order.</li>
        </ul>
      </section>

      {showAdvanced ? (
        <section className="wm-route-advanced-panel">
          <header>
            <div>
              <span>Advanced route planner</span>
              <strong>Edit individual paths only where the broad room estimate is not sufficient.</strong>
            </div>
            <small>Mark measured routes as Confirmed. Confirmed values are preserved when broad planning choices change.</small>
          </header>

          <div className="wm-topology-stat-grid">
            <div><strong>{previewTopology.locations.length}</strong><span>Locations</span></div>
            <div><strong>{previewTopology.devices.length}</strong><span>Devices</span></div>
            <div><strong>{previewTopology.connections.length}</strong><span>Paths</span></div>
            <div><strong>{missingInformation.length}</strong><span>Checks remaining</span></div>
          </div>

          <div className="wm-topology-connection-list">
            {previewTopology.connections.map((connection, index) => {
              const from = deviceById.get(connection.fromDeviceId);
              const to = deviceById.get(connection.toDeviceId);

              return (
                <article className="wm-topology-connection-card" key={connection.id}>
                  <div className="wm-topology-connection-title">
                    <span>Path {index + 1}</span>
                    <strong>{from?.name ?? "Unknown source"} → {to?.name ?? "Unknown destination"}</strong>
                  </div>

                  <div className="wm-topology-connection-fields">
                    <label>
                      Connection type
                      <select
                        className="wm-ui-input"
                        value={connection.transport}
                        onChange={(event) => updateConnection(connection.id, { transport: event.target.value as ProjectTransport })}
                      >
                        {PROJECT_TRANSPORT_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>

                    <label>
                      Length status
                      <select
                        className="wm-ui-input"
                        value={connection.lengthMode}
                        onChange={(event) => updateConnection(connection.id, {
                          lengthMode: event.target.value as ProjectConnection["lengthMode"],
                          lengthMetres: event.target.value === "unknown" ? undefined : connection.lengthMetres ?? 10,
                          status: event.target.value === "confirmed" ? "confirmed" : event.target.value === "unknown" ? "unknown" : "assumed",
                        })}
                      >
                        <option value="estimated">Estimated</option>
                        <option value="confirmed">Confirmed / measured</option>
                        <option value="unknown">Unknown</option>
                      </select>
                    </label>

                    <label>
                      Cable length (metres)
                      <input
                        className="wm-ui-input"
                        type="number"
                        min="0"
                        step="0.5"
                        disabled={connection.lengthMode === "unknown"}
                        value={connection.lengthMetres ?? ""}
                        onChange={(event) => updateConnection(connection.id, {
                          lengthMetres: event.target.value === "" ? undefined : Math.max(0, Number(event.target.value) || 0),
                        })}
                        placeholder="TBC"
                      />
                    </label>
                  </div>

                  <fieldset className="wm-topology-service-fieldset">
                    <legend>Signals / services carried</legend>
                    <div className="wm-topology-service-grid">
                      {PROJECT_CONNECTION_SERVICE_OPTIONS.map((service) => (
                        <label key={service.value}>
                          <input
                            type="checkbox"
                            checked={connection.services.includes(service.value)}
                            onChange={() => toggleConnectionService(connection, service.value)}
                          />
                          {service.label}
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  {connection.estimateReason ? (
                    <p className="wm-topology-estimate-note">Planning basis: {connection.estimateReason}</p>
                  ) : null}
                </article>
              );
            })}
          </div>

          {missingInformation.length > 0 ? (
            <section className="wm-topology-checks">
              <strong>Checks before product selection</strong>
              <ul>{missingInformation.map((item) => <li key={item}>{item}</li>)}</ul>
            </section>
          ) : (
            <p className="wm-topology-ready">
              Current routes have a transport and length status. Validate all assumptions before customer issue.
            </p>
          )}
        </section>
      ) : null}
    </section>
  );
}
