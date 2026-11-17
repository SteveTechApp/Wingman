import { createBlankProjectTopology, normaliseProjectTopology, type ProjectConnection, type ProjectTopology } from "./projectTopology";

export const ROUTE_PLANNING_MARKER = "wingman-route-planner:";

/**
 * Reads the guided route-planner marker from any location's notes. The marker
 * records the full planning state including the exact metre figures typed by
 * the rep (videoDistanceMetres / usbDistanceMetres / exceptionDistanceMetres)
 * — the only place where exact-vs-band is distinguishable, since connections
 * carry lengthMode "estimated" for both exact and band-derived lengths.
 */
export function readRoutePlanningMarker(value: unknown): Record<string, unknown> | null {
  const topology = normaliseProjectTopology(value);
  for (const location of topology.locations) {
    const markerLine = String(location.notes ?? "")
      .split(/\r?\n/)
      .find((line) => line.startsWith(ROUTE_PLANNING_MARKER));

    if (!markerLine) continue;

    try {
      const parsed = JSON.parse(markerLine.slice(ROUTE_PLANNING_MARKER.length)) as unknown;
      return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
  return null;
}

function isUsbServiceConnection(connection: ProjectConnection): boolean {
  return connection.services.some((service) => ["usb-2", "usb-3", "usb-kvm"].includes(service));
}

export type RoutePlanningSurvey = {
  needsSurvey: boolean;
  reasons: string[];
};

/**
 * Determines whether any cable route is still band-estimated (or has no
 * recorded length) rather than an exact figure. Exact figures are only
 * recorded in the route-planning marker; confirmed (measured) connections
 * never need a survey flag. Returns the reasons so the UI can explain the flag.
 */
export function projectTopologySurveyState(value: unknown): RoutePlanningSurvey {
  const topology = normaliseProjectTopology(value);
  if (topology.connections.length === 0) {
    return { needsSurvey: false, reasons: [] };
  }

  const marker = readRoutePlanningMarker(topology);
  const exactMetres = (field: string): boolean => {
    const raw = marker?.[field];
    return raw !== undefined && Number(raw) > 0;
  };

  const videoExact = exactMetres("videoDistanceMetres");
  const usbExact = exactMetres("usbDistanceMetres");
  const exceptionExact = exactMetres("exceptionDistanceMetres");

  // A connection needs a survey unless it is confirmed (measured). Exact
  // figures still carry lengthMode "estimated", so the marker decides whether
  // that estimate is a real figure or a band guess.
  const needsVideo = topology.connections.some(
    (connection) => !isUsbServiceConnection(connection) &&
      connection.id !== "planning-exception-path" &&
      connection.lengthMode !== "confirmed",
  );
  const needsUsb = topology.connections.some(
    (connection) => isUsbServiceConnection(connection) && connection.lengthMode !== "confirmed",
  );
  const needsException = topology.connections.some(
    (connection) => connection.id === "planning-exception-path" && connection.lengthMode !== "confirmed",
  );

  const reasons: string[] = [];
  if (needsVideo && !videoExact) {
    reasons.push("The video cable route is band-estimated, not an exact figure.");
  }
  if (needsUsb && !usbExact) {
    reasons.push("The USB host-to-device path is band-estimated, not an exact figure.");
  }
  if (needsException && !exceptionExact) {
    reasons.push("The distance-exception route is band-estimated, not an exact figure.");
  }
  if (topology.connections.some((connection) => connection.lengthMode === "unknown")) {
    reasons.push("One or more cable routes have no recorded length yet.");
  }

  return { needsSurvey: reasons.length > 0, reasons };
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
