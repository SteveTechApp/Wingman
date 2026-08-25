/**
 * Site Survey Photo to Topology — converts photo extraction results
 * into topology locations, devices, and connections.
 *
 * Used when the user confirms photo analysis results to add them
 * to the project topology as real nodes.
 */

import {
  normaliseProjectTopology,
  type ProjectTopology,
  type ProjectLocation,
  type ProjectLocationType,
  type ProjectDevice,
  type ProjectConnection,
  type ProjectConnectionService,
  type ProjectTransport,
} from "./projectTopology";
import type {
  SiteSurveyPhotoResult,
  ExtractedLocation,
  ExtractedEquipment,
  ExtractedCable,
} from "./siteSurveyPhotoAnalysis";

/* ──────────────────────────────────────────────
   Types
   ────────────────────────────────────────────── */

export type PhotoToTopologyResult = {
  locationsAdded: ProjectLocation[];
  devicesAdded: ProjectDevice[];
  connectionsAdded: ProjectConnection[];
  warnings: string[];
};

/* ──────────────────────────────────────────────
   Mapping helpers
   ────────────────────────────────────────────── */

function mapLocationType(extracted?: string): ProjectLocationType {
  if (!extracted) return "custom";

  const lower = extracted.toLowerCase();
  if (lower.includes("table") || lower.includes("desk")) return "table";
  if (lower.includes("lectern") || lower.includes("podium")) return "lectern";
  if (lower.includes("floor")) return "floor-box";
  if (lower.includes("display") || lower.includes("screen") || lower.includes("wall")) return "display-wall";
  if (lower.includes("ceiling")) return "ceiling";
  if (lower.includes("projector")) return "projector-position";
  if (lower.includes("rack") && lower.includes("central")) return "central-rack";
  if (lower.includes("rack")) return "room-rack";
  if (lower.includes("cupboard") || lower.includes("cabinet")) return "local-cupboard";
  if (lower.includes("network") || lower.includes("switch")) return "network";
  return "custom";
}

function mapTransport(extracted?: string): ProjectTransport {
  if (!extracted) return "other";

  const lower = extracted.toLowerCase();
  if (lower.includes("hdmi")) return "hdmi";
  if (lower.includes("usb-c") || lower.includes("usbc")) return "usb-c";
  if (lower.includes("displayport") || lower.includes("dp")) return "displayport";
  if (lower.includes("hdbaset") && lower.includes("3")) return "hdbaset-3";
  if (lower.includes("hdbaset")) return "hdbaset-2";
  if (lower.includes("fibre") && lower.includes("single")) return "fibre-sm";
  if (lower.includes("fibre")) return "fibre-mm";
  if (lower.includes("ip") || lower.includes("avoip") || lower.includes("av-over-ip")) return "ip-av-vlan";
  if (lower.includes("network") || lower.includes("ethernet") || lower.includes("cat")) return "shared-ip-network";
  if (lower.includes("usb")) return "usb-data";
  if (lower.includes("rs-232") || lower.includes("rs232")) return "rs232";
  if (lower.includes("ir")) return "ir";
  if (lower.includes("audio") || lower.includes("analogue")) return "analogue-audio";
  if (lower.includes("dante")) return "dante-aes67";
  return "other";
}

function mapServices(transport: ProjectTransport, extracted?: string): ProjectConnectionService[] {
  const services: ProjectConnectionService[] = [];

  // Default services based on transport
  if (transport === "hdmi" || transport === "displayport" || transport === "usb-c") {
    services.push("video");
  }
  if (transport === "hdbaset-2" || transport === "hdbaset-3") {
    services.push("video", "ethernet");
  }
  if (transport === "ip-av-vlan" || transport === "shared-ip-network") {
    services.push("av-over-ip", "ethernet");
  }
  if (transport === "usb-data" || transport === "usb-extender") {
    services.push("usb-3");
  }
  if (transport === "rs232") {
    services.push("rs232");
  }
  if (transport === "ir") {
    services.push("ir");
  }
  if (transport === "analogue-audio") {
    services.push("analogue-audio");
  }
  if (transport === "dante-aes67") {
    services.push("dante-aes67");
  }

  // Add power if mentioned
  if (extracted?.toLowerCase().includes("poe") || extracted?.toLowerCase().includes("poh")) {
    services.push("power");
  }

  return services.length > 0 ? services : ["video"];
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/* ──────────────────────────────────────────────
   Main conversion function
   ────────────────────────────────────────────── */

export function applyPhotoExtractionToTopology(
  extraction: SiteSurveyPhotoResult,
  existingTopology: ProjectTopology,
): PhotoToTopologyResult {
  const topology = normaliseProjectTopology(existingTopology);
  const warnings: string[] = [];

  // Build lookup maps for deduplication
  const existingLocationNames = new Set(
    topology.locations.map((l) => l.name.toLowerCase()),
  );
  const existingDeviceNames = new Set(
    topology.devices.map((d) => d.name.toLowerCase()),
  );

  // Map location names to IDs for device assignment
  const locationNameToId = new Map<string, string>();
  for (const loc of topology.locations) {
    locationNameToId.set(loc.name.toLowerCase(), loc.id);
  }

  // 1. Add new locations
  const locationsAdded: ProjectLocation[] = [];
  for (const extracted of extraction.locations) {
    if (existingLocationNames.has(extracted.name.toLowerCase())) {
      continue; // Skip duplicates
    }

    const location: ProjectLocation = {
      id: createId("photo-loc"),
      name: extracted.name,
      type: mapLocationType(extracted.type),
      notes: extracted.notes,
    };

    locationsAdded.push(location);
    locationNameToId.set(extracted.name.toLowerCase(), location.id);
  }

  // 2. Add new devices
  const devicesAdded: ProjectDevice[] = [];
  for (const extracted of extraction.equipment) {
    if (existingDeviceNames.has(extracted.name.toLowerCase())) {
      continue; // Skip duplicates
    }

    // Find location ID
    let locationId = "";
    if (extracted.location) {
      locationId = locationNameToId.get(extracted.location.toLowerCase()) ?? "";
    }

    // If no location found, use the first location or create a default
    if (!locationId) {
      if (locationsAdded.length > 0) {
        locationId = locationsAdded[0].id;
      } else if (topology.locations.length > 0) {
        locationId = topology.locations[0].id;
      } else {
        // Create a default location
        const defaultLoc: ProjectLocation = {
          id: createId("photo-loc"),
          name: "Photo Analysis",
          type: "custom",
          notes: "Auto-created from site photo analysis",
        };
        locationsAdded.push(defaultLoc);
        locationId = defaultLoc.id;
      }
    }

    const device: ProjectDevice = {
      id: createId("photo-dev"),
      name: extracted.name,
      category: extracted.category,
      locationId,
      quantity: 1,
      thirdParty: false,
      status: "assumed",
      notes: extracted.notes,
    };

    devicesAdded.push(device);
    existingDeviceNames.add(extracted.name.toLowerCase());
  }

  // 3. Add new connections
  const connectionsAdded: ProjectConnection[] = [];
  const deviceNameToId = new Map<string, string>();

  // Map existing devices
  for (const dev of topology.devices) {
    deviceNameToId.set(dev.name.toLowerCase(), dev.id);
  }

  // Map newly added devices
  for (const dev of devicesAdded) {
    deviceNameToId.set(dev.name.toLowerCase(), dev.id);
  }

  for (const extracted of extraction.cables) {
    const fromId = deviceNameToId.get(extracted.fromEquipment.toLowerCase());
    const toId = deviceNameToId.get(extracted.toEquipment.toLowerCase());

    if (!fromId || !toId) {
      warnings.push(`Could not create cable: ${extracted.fromEquipment} → ${extracted.toEquipment} (device not found)`);
      continue;
    }

    const transport = mapTransport(extracted.transport);
    const services = mapServices(transport, extracted.transport);

    const connection: ProjectConnection = {
      id: createId("photo-conn"),
      fromDeviceId: fromId,
      toDeviceId: toId,
      services,
      transport,
      lengthMode: extracted.estimatedLengthMetres ? "estimated" : "unknown",
      lengthMetres: extracted.estimatedLengthMetres,
      estimateReason: extracted.notes,
      status: "assumed",
    };

    connectionsAdded.push(connection);
  }

  // Add notes from extraction as warnings (for visibility)
  if (extraction.roomDimensions) {
    warnings.push(`Room dimensions: ${extraction.roomDimensions}`);
  }
  if (extraction.networkInfrastructure) {
    warnings.push(`Network: ${extraction.networkInfrastructure}`);
  }
  if (extraction.powerAvailability) {
    warnings.push(`Power: ${extraction.powerAvailability}`);
  }
  if (extraction.accessNotes) {
    warnings.push(`Access: ${extraction.accessNotes}`);
  }

  return {
    locationsAdded,
    devicesAdded,
    connectionsAdded,
    warnings,
  };
}

/* ──────────────────────────────────────────────
   Build updated topology
   ────────────────────────────────────────────── */

export function buildUpdatedTopology(
  existingTopology: ProjectTopology,
  photoResult: PhotoToTopologyResult,
): ProjectTopology {
  const topology = normaliseProjectTopology(existingTopology);

  return {
    ...topology,
    locations: [...topology.locations, ...photoResult.locationsAdded],
    devices: [...topology.devices, ...photoResult.devicesAdded],
    connections: [...topology.connections, ...photoResult.connectionsAdded],
    updatedAt: new Date().toISOString(),
  };
}
