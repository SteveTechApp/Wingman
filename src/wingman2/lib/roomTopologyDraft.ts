import { normaliseProjectTopology } from "./projectTopology";

/** Keep a room under construction, even before its signal connections exist. */
export function roomTopologyHasDraft(value: unknown): boolean {
  const topology = normaliseProjectTopology(value);
  return topology.locations.length > 0 || topology.devices.length > 0 || topology.connections.length > 0;
}
