import * as React from "react";

export type DiscoveryResolutionPreset =
  | "1080p"
  | "2K"
  | "4K"
  | "5K"
  | "8K"
  | "CUSTOM";

export type DiscoveryVideoProfile =
  | "Auto"
  | "1080p60"
  | "2K60"
  | "4K30 HDR"
  | "4K60 HDR"
  | "5K"
  | "8K"
  | "Custom";

export type DiscoveryRoutePreset =
  | "Direct"
  | "Via Central Rack"
  | "Via Local Rack"
  | "Under Table / Floor Box"
  | "Unknown";

export type DiscoveryCableManagement =
  | "None"
  | "IDB-300"
  | "Floor Box"
  | "Conduit / Trunking"
  | "Other";

export type DiscoveryUsbBandwidth =
  | "None"
  | "USB 2.0"
  | "USB 3.0";

export type AdvancedConnection = {
  id: string;
  label: string;
  sourcePosition: string;
  displayPosition: string;
  routePreset: DiscoveryRoutePreset;
  cableManagement: DiscoveryCableManagement;
  expectedDistanceM: string;
  resolution: DiscoveryResolutionPreset;
  videoProfile: DiscoveryVideoProfile;
  customVideoFormat: string;
  usbBandwidth: DiscoveryUsbBandwidth;
  notes: string;
};

export const ADVANCED_DEFAULTS = {
  defaultResolution: "1080p" as DiscoveryResolutionPreset,
  defaultVideoProfile: "Auto" as DiscoveryVideoProfile,
  customVideoFormat: "",
  defaultRoutePreset: "Direct" as DiscoveryRoutePreset,
  defaultCableManagement: "None" as DiscoveryCableManagement,
  defaultUsbBandwidth: "None" as DiscoveryUsbBandwidth,
  detailConnectionsEnabled: false,
  connections: [] as AdvancedConnection[],
};

export function emptyDiscoveryConnection(seed: Partial<AdvancedConnection> = {}): AdvancedConnection {
  return {
    id: seed.id ?? `conn_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    label: seed.label ?? "Primary signal path",
    sourcePosition: seed.sourcePosition ?? "",
    displayPosition: seed.displayPosition ?? "",
    routePreset: seed.routePreset ?? "Direct",
    cableManagement: seed.cableManagement ?? "None",
    expectedDistanceM: seed.expectedDistanceM ?? "",
    resolution: seed.resolution ?? "1080p",
    videoProfile: seed.videoProfile ?? "Auto",
    customVideoFormat: seed.customVideoFormat ?? "",
    usbBandwidth: seed.usbBandwidth ?? "None",
    notes: seed.notes ?? "",
  };
}

export function normalizeDiscoveryAdvanced<T extends Record<string, any>>(raw?: T | null): T & typeof ADVANCED_DEFAULTS {
  const base: Record<string, any> = raw ?? {};
  const incoming = Array.isArray(base.connections) ? base.connections : [];
  return {
    ...ADVANCED_DEFAULTS,
    ...base,
    connections: incoming.map((x) => emptyDiscoveryConnection(x)),
  } as T & typeof ADVANCED_DEFAULTS;
}

function toNum(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function resolveProfile(record: Record<string, any>, link?: AdvancedConnection): DiscoveryVideoProfile {
  const explicit = (link?.videoProfile ?? record.defaultVideoProfile ?? "Auto") as DiscoveryVideoProfile;
  if (explicit !== "Auto") return explicit;

  const resolution = (link?.resolution ?? record.defaultResolution ?? "1080p") as DiscoveryResolutionPreset;
  switch (resolution) {
    case "1080p": return "1080p60";
    case "2K": return "2K60";
    case "4K": return "4K60 HDR";
    case "5K": return "5K";
    case "8K": return "8K";
    default: return "Custom";
  }
}

function effectiveConnections(record: Record<string, any>): AdvancedConnection[] {
  const safe = normalizeDiscoveryAdvanced(record);
  if (safe.detailConnectionsEnabled && safe.connections.length > 0) return safe.connections;

  return [
    emptyDiscoveryConnection({
      id: "primary",
      label: "Primary signal path",
      expectedDistanceM: String(record.cableDistanceM ?? ""),
      resolution: safe.defaultResolution,
      videoProfile: safe.defaultVideoProfile,
      customVideoFormat: safe.customVideoFormat,
      routePreset: safe.defaultRoutePreset,
      cableManagement: safe.defaultCableManagement,
      usbBandwidth: safe.defaultUsbBandwidth,
    }),
  ];
}

export function recommendDiscoveryFamiliesAdvanced(raw: Record<string, any>): string[] {
  const record = normalizeDiscoveryAdvanced(raw);
  const scores: Record<string, number> = {
    Apollo: 0,
    HDBaseT: 0,
    AVoIP: 0,
    Matrix: 0,
    "USB Extension": 0,
    "Video Wall": 0,
  };

  const sourceCount = toNum(record.sourceCount);
  const displayCount = toNum(record.displayCount);
  const appType = String(record.applicationType ?? "").toLowerCase();
  const links = effectiveConnections(record);

  if (sourceCount > 1 || displayCount > 1) scores.Matrix += 2;
  if (appType.includes("video wall") || displayCount >= 4) scores["Video Wall"] += 4;

  for (const link of links) {
    const distance = toNum(link.expectedDistanceM || record.cableDistanceM || 0);
    const route = link.routePreset || record.defaultRoutePreset;
    const cableMgmt = link.cableManagement || record.defaultCableManagement;
    const usb = link.usbBandwidth || record.defaultUsbBandwidth;
    const profile = resolveProfile(record, link);

    if (route === "Under Table / Floor Box" || cableMgmt === "IDB-300") scores.Apollo += 3;
    if (route === "Via Central Rack" || route === "Via Local Rack") scores.HDBaseT += 2;

    if (usb === "USB 3.0") scores["USB Extension"] += distance > 5 ? 4 : 2;
    else if (usb === "USB 2.0") scores["USB Extension"] += distance > 5 ? 2 : 1;

    switch (profile) {
      case "1080p60":
        if (distance <= 40) scores.HDBaseT += 3; else scores.AVoIP += 3;
        break;
      case "2K60":
        if (distance <= 35) scores.HDBaseT += 2; else scores.AVoIP += 3;
        break;
      case "4K30 HDR":
        if (distance <= 35) scores.HDBaseT += 3; else scores.AVoIP += 4;
        break;
      case "4K60 HDR":
        if (distance <= 10) scores.HDBaseT += 1;
        else if (distance <= 35) { scores.HDBaseT += 2; scores.AVoIP += 1; }
        else scores.AVoIP += 4;
        break;
      case "5K":
      case "8K":
      case "Custom":
        scores.AVoIP += distance > 3 ? 5 : 2;
        break;
    }

    if (distance > 40) scores.AVoIP += 2;
  }

  return Object.entries(scores)
    .filter(([, s]) => s > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k)
    .slice(0, 3);
}