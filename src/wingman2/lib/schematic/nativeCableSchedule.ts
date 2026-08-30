/**
 * nativeCableSchedule — Generates a cable schedule from the native schematic
 * engine's SchematicModel connections.
 *
 * Unlike the legacy buildCableSchedule() in roomSchematicEngine.ts which uses
 * text pattern matching on a context blob, this function uses the actual
 * topology-aware connections produced by buildWingmanSchematic(). Each cable
 * row maps to a real connection between two specific nodes, with the exact
 * transport type and a validation reminder tailored to that transport.
 */

import type { SchematicConnection, SchematicModel, SchematicNode, SchematicTransportKind } from "./schematicTypes";

export type NativeCableRow = {
  label: string;
  cable: string;
  appliesTo: string;
  reminder: string;
  type: "video" | "network" | "usb" | "audio" | "control" | "other";
  transport: SchematicTransportKind;
  fromSku?: string;
  toSku?: string;
  required: boolean;
};

// ─── Transport-specific cable descriptions ────────────────────────────────────

const TRANSPORT_CABLE: Record<SchematicTransportKind, string> = {
  hdmi: "HDMI cable (confirm length, bandwidth, HDCP version)",
  hdbaset: "Certified Cat6/Cat6A cable (confirm length, termination, shield)",
  "av-over-ip": "Cat6/Cat6A or fibre to managed AV switch (confirm VLAN, multicast)",
  usb: "USB-C or USB-A cable (confirm speed, power delivery, host/device role)",
  "usb-over-ip": "USB-over-IP encoder/decoder pair on AV network",
  "analogue-audio": "Balanced audio cable (confirm length, impedance, grounding)",
  dante: "Cat6 to Dante-enabled switch (confirm VLAN, QoS, multicast)",
  network: "Cat6/Cat6A to managed switch (confirm VLAN, PoE, bandwidth)",
  control: "RS-232, IR, relay or Cat6 for IP control (confirm protocol, baud rate)",
  unknown: "Cable type to be confirmed on site",
};

const TRANSPORT_REMINDER: Record<SchematicTransportKind, string> = {
  hdmi: "Confirm source and display connector types, cable length (typically <5m passive), HDCP version, EDID behaviour, and resolution/HDR requirements.",
  hdbaset: "Confirm installed cable length (<100m), category (Cat6/Cat6A), termination quality, PoH/PoE power requirements, and bidirectional control paths.",
  "av-over-ip": "Confirm switch model, VLAN configuration, multicast policy, IGMP snooping, 1GbE/10GbE bandwidth, endpoint power (PoE), and commissioning access.",
  usb: "Confirm USB speed (2.0/3.x), cable length (<3m for USB 3.x), power delivery requirements, and host/device role assignment.",
  "usb-over-ip": "Confirm USB-over-IP encoder and decoder are both present, network path is available, and USB device class is supported.",
  "analogue-audio": "Confirm cable length, balanced/unbalanced wiring, impedance matching, grounding strategy, and signal level.",
  dante: "Confirm Dante-enabled switch, VLAN separation, QoS configuration, multicast flooding, and clock sync (PTP).",
  network: "Confirm switch port availability, VLAN assignment, PoE budget, cable category, and network topology.",
  control: "Confirm control protocol (RS-232/IR/IP), baud rate, pinout, cable routing, and control processor compatibility.",
  unknown: "Transport not confirmed. Validate the cable type, length, connector and signal path on site before quoting.",
};

// ─── Signal type mapping ──────────────────────────────────────────────────────

type CableType = NativeCableRow["type"];

function signalToCableType(signal: string): CableType {
  switch (signal) {
    case "video": return "video";
    case "usb": return "usb";
    case "audio": return "audio";
    case "network": return "network";
    case "control": return "control";
    default: return "other";
  }
}

// ─── Human-readable node labels ───────────────────────────────────────────────

function nodeLabel(node: SchematicNode): string {
  if (node.sku) return node.sku;
  if (node.kind === "network-switch") return "Network switch";
  if (node.kind === "usb-bridge") return "USB host/bridge";
  if (node.kind === "audio-device") return "Audio system";
  if (node.kind === "control-device") return "Control system";
  return node.label;
}

// ─── Main generator ───────────────────────────────────────────────────────────

/**
 * Builds a cable schedule from the native schematic engine's connections.
 * Each connection in the SchematicModel becomes one CableRow with:
 * - Exact transport type from the connection (not inferred from text)
 * - Cable description tailored to the transport
 * - Validation reminder specific to that transport and distance
 * - Source and destination SKU/node labels
 */
export function buildNativeCableSchedule(schematic: SchematicModel): NativeCableRow[] {
  const nodeMap = new Map(schematic.nodes.map((n) => [n.id, n]));
  const seen = new Set<string>();
  const rows: NativeCableRow[] = [];

  for (const conn of schematic.connections) {
    const from = nodeMap.get(conn.from);
    const to = nodeMap.get(conn.to);
    if (!from || !to) continue;

    // Deduplicate by connection ID (some connections may be generated with the same from/to)
    const dedupeKey = `${conn.from}__${conn.to}__${conn.signal}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const cableType = signalToCableType(conn.signal);
    const transport = conn.transport || "unknown";
    const fromLabel = nodeLabel(from);
    const toLabel = nodeLabel(to);

    rows.push({
      label: `${fromLabel} → ${toLabel}`,
      cable: TRANSPORT_CABLE[transport],
      appliesTo: `${fromLabel} (${from.kind}) to ${toLabel} (${to.kind})`,
      reminder: conn.proposalSafeNote || TRANSPORT_REMINDER[transport],
      type: cableType,
      transport,
      fromSku: from.sku,
      toSku: to.sku,
      required: conn.required,
    });
  }

  // Add infrastructure rows for network and control
  const hasNetwork = schematic.nodes.some((n) => n.kind === "network-switch");
  const hasControl = schematic.connections.some((c) => c.signal === "control");

  if (hasNetwork) {
    rows.push({
      label: "AV network infrastructure",
      cable: "Managed AV switch with VLAN, IGMP, QoS — confirm model and port count",
      appliesTo: "All AVoIP endpoints (encoders, decoders, controllers)",
      reminder: "Confirm switch model, port count, PoE budget, VLAN configuration, multicast policy, and uplink capacity.",
      type: "network",
      transport: "network",
      required: true,
    });
  }

  if (hasControl) {
    rows.push({
      label: "Control system integration",
      cable: "RS-232, IR, relay or IP control cables to each controlled device",
      appliesTo: "Display power, source control, presets, touch panel, control processor",
      reminder: "Define who operates the room and convert engineering routes into user-friendly presets.",
      type: "control",
      transport: "control",
      required: true,
    });
  }

  return rows;
}

/**
 * Human-readable label for a cable type, matching the legacy cableToneLabel.
 */
export function nativeCableToneLabel(type: CableType): string {
  switch (type) {
    case "video": return "Video";
    case "network": return "Network / AVoIP";
    case "usb": return "USB / camera";
    case "audio": return "Audio";
    case "control": return "Control";
    default: return "By others";
  }
}
