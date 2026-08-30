/**
 * templateVisualDiagram — Builds a VisualDiagramModel (the Visual Studio
 * canvas shape) directly from a RoomTemplate's BOM rows, by running the
 * native schematic engine (buildWingmanSchematic) against a
 * SchematicProjectBrief adapted from the template via
 * templateBomToSchematicBrief.
 *
 * This is the template-page equivalent of wholeProjectVisualDiagram.ts:
 * it produces the same VisualDiagramModel shape but reads from template
 * BOM rows instead of a saved StoredProject. The template page can then
 * feed this directly to the VisualStudioCanvas component.
 */

import type { RoomTemplate, TemplateBomRow } from "../roomTemplates";
import type {
  SchematicConnection,
  SchematicModel,
  SchematicNode,
  SchematicNodeKind,
  SchematicTransportKind,
} from "./schematicTypes";
import { buildWingmanSchematic } from "./wingmanSchematicEngine";
import { templateBomToSchematicBrief } from "./templateBomToSchematicBrief";
import type {
  VisualDiagramEdge,
  VisualDiagramModel,
  VisualDiagramNode,
  VisualNodeKind,
  VisualNodeStatus,
} from "../visualStudioTypes";

// ─── Shared helpers (mirrored from wholeProjectVisualDiagram.ts) ──────────────

const HUMAN_TRANSPORT_LABEL: Record<SchematicTransportKind, string> = {
  hdmi: "HDMI",
  hdbaset: "HDBaseT (Cat6)",
  "av-over-ip": "AVoIP (1GbE)",
  usb: "USB",
  "usb-over-ip": "USB-over-IP",
  "analogue-audio": "Analogue audio",
  dante: "Dante / network audio",
  network: "Network (AV-over-IP)",
  control: "Control / RS-232",
  unknown: "Unconfirmed — verify before quote",
};

const REAL_DEVICE_SUBTITLE: Partial<Record<SchematicNodeKind, string>> = {
  "av-over-ip-encoder": "AV-over-IP Encoder",
  "av-over-ip-decoder": "AV-over-IP Decoder",
  "av-over-ip-transceiver": "AV-over-IP Transceiver",
  "av-over-ip-controller": "AVoIP Controller",
  matrix: "Matrix Switcher",
  switcher: "Switcher",
  "video-wall-processor": "Video Wall Processor",
  camera: "Camera",
  speakerphone: "Speakerphone",
  "touch-panel": "Touch Panel",
  "usb-bridge": "USB Bridge",
  "audio-device": "Audio Device",
  "control-device": "Control Device",
  "network-switch": "Network Switch",
  accessory: "Accessory",
  source: "Source",
  display: "Display",
};

function mapNodeKind(kind: SchematicNodeKind, hasSku: boolean): VisualNodeKind {
  if (!hasSku) return "third-party";
  switch (kind) {
    case "av-over-ip-encoder":
    case "av-over-ip-decoder":
    case "av-over-ip-transceiver":
      return "transport";
    case "av-over-ip-controller":
      return "controller";
    case "matrix":
    case "switcher":
    case "video-wall-processor":
      return "switching";
    case "camera":
      return "camera";
    case "speakerphone":
    case "audio-device":
      return "audio";
    case "touch-panel":
    case "control-device":
      return "controller";
    case "usb-bridge":
      return "usb";
    case "network-switch":
      return "network";
    case "source":
      return "source";
    case "display":
      return "display";
    default:
      return "processor";
  }
}

function thirdPartyLabel(node: SchematicNode): string {
  if (node.kind === "network-switch") return "Network switch — customer supplied";
  if (node.kind === "usb-bridge") return "USB host / Room PC — by others";
  if (node.kind === "audio-device") return "Audio system — by others";
  if (node.kind === "control-device") return "Control system — by others";
  return `${node.label} — by others`;
}

function emphasisForKind(kind: SchematicNodeKind): "primary" | "support" | "compact" {
  if (kind === "matrix" || kind === "switcher" || kind === "video-wall-processor" || kind === "av-over-ip-encoder") {
    return "primary";
  }
  if (kind === "accessory") return "compact";
  return "support";
}

const KINDS_THAT_SHOULD_BE_WIRED = new Set<SchematicNodeKind>([
  "source", "display", "camera", "speakerphone", "touch-panel",
  "control-device", "audio-device", "av-over-ip-encoder", "av-over-ip-decoder",
  "av-over-ip-transceiver", "av-over-ip-controller", "network-switch", "usb-bridge",
]);

function buildNodes(
  schematic: SchematicModel,
  connectedNodeIds: Set<string>,
  flaggedNodeIds: Set<string>,
): VisualDiagramNode[] {
  return schematic.nodes.map((node) => {
    const hasSku = Boolean(node.sku);
    const kind = mapNodeKind(node.kind, hasSku);
    const isIsolated = KINDS_THAT_SHOULD_BE_WIRED.has(node.kind) && !connectedNodeIds.has(node.id);
    const isFlagged = flaggedNodeIds.has(node.id);

    let status: VisualNodeStatus = "normal";
    if (isFlagged || isIsolated) status = "risk";
    else if (node.required === false) status = "optional";
    else if (hasSku) status = "recommended";

    const label = hasSku ? (node.sku as string) : thirdPartyLabel(node);
    const baseSubtitle = hasSku
      ? REAL_DEVICE_SUBTITLE[node.kind] ?? node.kind
      : node.proposalSafeNote ?? "Not a WyreStorm product — confirm ownership before quote.";
    const subtitle = isIsolated
      ? `${baseSubtitle} | no paired connection — check port pairing.`
      : baseSubtitle;

    return {
      id: node.id,
      label,
      subtitle,
      kind,
      status,
      emphasis: emphasisForKind(node.kind),
      column: node.column,
      row: node.lane,
    };
  });
}

function buildEdges(schematic: SchematicModel): VisualDiagramEdge[] {
  return schematic.connections.map((connection) => ({
    id: connection.id,
    source: connection.from,
    target: connection.to,
    label: HUMAN_TRANSPORT_LABEL[connection.transport] ?? connection.label,
    status: connection.transport === "unknown" || connection.proposalSafeNote ? "risk" as const : undefined,
  }));
}

function findFlaggedNodeIds(schematic: SchematicModel): Set<string> {
  const flagged = new Set<string>();
  for (const warning of schematic.warnings) {
    for (const node of schematic.nodes) {
      if (node.label && warning.message.includes(node.label)) {
        flagged.add(node.id);
      }
    }
  }
  return flagged;
}

function connectedNodeIdSet(schematic: SchematicModel): Set<string> {
  const ids = new Set<string>();
  for (const connection of schematic.connections) {
    ids.add(connection.from);
    ids.add(connection.to);
  }
  return ids;
}

// ─── Main converter ───────────────────────────────────────────────────────────

/**
 * Builds a VisualDiagramModel from a RoomTemplate and its current BOM rows,
 * so the template review page can feed the VisualStudioCanvas directly
 * without requiring a saved StoredProject.
 */
export function buildTemplateVisualDiagram(
  template: RoomTemplate,
  rows: TemplateBomRow[],
): VisualDiagramModel {
  const brief = templateBomToSchematicBrief(template, rows);
  const schematic = buildWingmanSchematic(brief);

  const connectedNodeIds = connectedNodeIdSet(schematic);
  const flaggedNodeIds = findFlaggedNodeIds(schematic);

  const nodes = buildNodes(schematic, connectedNodeIds, flaggedNodeIds);
  const edges = buildEdges(schematic);

  const blockerMessages = schematic.warnings
    .filter((w) => w.severity === "blocker")
    .map((w) => w.message);
  const otherWarningMessages = schematic.warnings
    .filter((w) => w.severity !== "blocker")
    .map((w) => w.message);
  const bomHintMessages = schematic.bomHints.map(
    (h) => `Add ${h.sku} to the quote — ${h.reason}`,
  );

  const realDeviceCount = schematic.nodes.filter((n) => Boolean(n.sku)).length;
  const thirdPartyCount = schematic.nodes.length - realDeviceCount;

  return {
    id: `template-${template.id}`,
    title: schematic.title,
    subtitle: `Topology-aware schematic generated from the "${template.name}" template BOM.`,
    kind: "whole-project",
    customerSummary: `This diagram shows every WyreStorm product in the ${template.name} template and how each one connects, plus the minimal third-party items (display, network switch, room PC, etc.) needed for the system to make sense.`,
    technicalSummary: `${realDeviceCount} real WyreStorm SKU node(s) and ${thirdPartyCount} third-party/generic placeholder node(s) were generated by the native schematic engine from the template's BOM rows. Cable/transport type is shown per connection.`,
    assumptions: [...schematic.assumptions, ...otherWarningMessages],
    missingInformation: [
      "Exact camera/speakerphone/touch-panel quantities are derived from the template BOM and may differ from the real room.",
      "Cable distances are not captured in the template — confirm exact run lengths before quoting HDBaseT/AV-over-IP extension gear.",
    ],
    quoteRisks: [...blockerMessages, ...otherWarningMessages],
    nextActions: [
      ...bomHintMessages,
      "Confirm every third-party (\"by others\") placeholder with the customer before the proposal is finalised.",
    ],
    nodes,
    edges,
  };
}
