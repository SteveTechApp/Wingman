import type { StoredProject } from "../../data/projectStore";
import { buildSchematicBriefFromProject } from "./projectToSchematicBrief";
import type {
  SchematicConnection,
  SchematicModel,
  SchematicNode,
  SchematicNodeKind,
  SchematicTransportKind,
} from "./schematicTypes";
import { buildWingmanSchematic } from "./wingmanSchematicEngine";
import type {
  VisualDiagramEdge,
  VisualDiagramModel,
  VisualDiagramNode,
  VisualNodeKind,
  VisualNodeStatus,
} from "../visualStudioTypes";

/**
 * Builds a "whole project" VisualDiagramModel (the Visual Studio canvas
 * shape) directly from a real saved project, by running the real schematic
 * engine (buildWingmanSchematic, via wingmanSchematicEngine.ts) against a
 * SchematicProjectBrief adapted from that project's own product selections
 * and discovery details (projectToSchematicBrief.ts).
 *
 * Only real WyreStorm SKUs are ever labeled with a part code; every node the
 * engine builds without a SKU (a generic source, a generic display, the
 * network switch, a generic USB/audio/control node) is treated as a
 * third-party / "by others" placeholder rather than an invented WyreStorm
 * product.
 */

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

/**
 * Maps the schematic engine's product-domain node kind onto the Visual
 * Studio canvas's rendering-domain node kind. Nodes with no real SKU are
 * always rendered as "third-party" regardless of their schematic kind, so a
 * generic "network-switch" or fallback "source"/"display" never looks like a
 * WyreStorm product on the canvas.
 */
function mapNodeKind(kind: SchematicNodeKind, hasSku: boolean): VisualNodeKind {
  if (!hasSku) {
    return "third-party";
  }

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
  if (node.kind === "network-switch") {
    return "Network switch — customer supplied";
  }

  if (node.kind === "usb-bridge") {
    return "USB host / Room PC — by others";
  }

  if (node.kind === "audio-device") {
    return "Audio system — by others";
  }

  if (node.kind === "control-device") {
    return "Control system — by others";
  }

  return `${node.label} — by others`;
}

function emphasisForKind(kind: SchematicNodeKind): "primary" | "support" | "compact" {
  if (kind === "matrix" || kind === "switcher" || kind === "video-wall-processor" || kind === "av-over-ip-encoder") {
    return "primary";
  }

  if (kind === "accessory") {
    return "compact";
  }

  return "support";
}

/**
 * The schematic engine wires source/display/camera/speakerphone/control
 * endpoints and AV-over-IP nodes explicitly; "accessory" and any switching
 * node that lost out to another chosen switching node are legitimately left
 * unconnected by design (they're BOM-list items, not part of the signal
 * chain), so they're excluded from the "should be wired" check below.
 */
const KINDS_THAT_SHOULD_BE_WIRED = new Set<SchematicNodeKind>([
  "source",
  "display",
  "camera",
  "speakerphone",
  "touch-panel",
  "control-device",
  "audio-device",
  "av-over-ip-encoder",
  "av-over-ip-decoder",
  "av-over-ip-transceiver",
  "av-over-ip-controller",
  "network-switch",
  "usb-bridge",
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
    if (isFlagged || isIsolated) {
      status = "risk";
    } else if (node.required === false) {
      status = "optional";
    } else if (hasSku) {
      status = "recommended";
    }

    const label = hasSku ? (node.sku as string) : thirdPartyLabel(node);
    const baseSubtitle = hasSku
      ? REAL_DEVICE_SUBTITLE[node.kind] ?? node.kind
      : node.proposalSafeNote ?? "Not a WyreStorm product — confirm ownership before quote.";
    const subtitle = isIsolated
      ? `${baseSubtitle} | no paired connection — check port pairing.`
      : baseSubtitle;

    const visualNode: VisualDiagramNode = {
      id: node.id,
      label,
      subtitle,
      kind,
      status,
      emphasis: emphasisForKind(node.kind),
      column: node.column,
      row: node.lane,
    };

    return visualNode;
  });
}

function edgeStatus(connection: SchematicConnection): VisualNodeStatus | undefined {
  if (connection.transport === "unknown" || connection.proposalSafeNote) {
    return "risk";
  }

  return undefined;
}

function buildEdges(schematic: SchematicModel): VisualDiagramEdge[] {
  return schematic.connections.map((connection) => ({
    id: connection.id,
    source: connection.from,
    target: connection.to,
    label: HUMAN_TRANSPORT_LABEL[connection.transport] ?? connection.label,
    status: edgeStatus(connection),
  }));
}

/**
 * Best-effort match of an engine warning message back to the node(s) it's
 * talking about, so the blocker is visually flagged on the canvas rather
 * than only living in a side list. Every warning is still surfaced in
 * quoteRisks/assumptions regardless of whether a node match is found, so
 * nothing is silently dropped.
 */
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

export function buildWholeProjectVisualDiagram(project: StoredProject | null | undefined): VisualDiagramModel {
  const brief = buildSchematicBriefFromProject(project);
  const schematic = buildWingmanSchematic(brief);

  const connectedNodeIds = connectedNodeIdSet(schematic);
  const flaggedNodeIds = findFlaggedNodeIds(schematic);

  const nodes = buildNodes(schematic, connectedNodeIds, flaggedNodeIds);
  const edges = buildEdges(schematic);

  const blockerMessages = schematic.warnings
    .filter((warning) => warning.severity === "blocker")
    .map((warning) => warning.message);
  const otherWarningMessages = schematic.warnings
    .filter((warning) => warning.severity !== "blocker")
    .map((warning) => warning.message);
  const bomHintMessages = schematic.bomHints.map(
    (hint) => `Add ${hint.sku} to the quote — ${hint.reason}`,
  );

  const realDeviceCount = schematic.nodes.filter((node) => Boolean(node.sku)).length;
  const thirdPartyCount = schematic.nodes.length - realDeviceCount;

  const projectLabel = project?.name ?? "this project";

  return {
    id: "whole-project",
    title: schematic.title,
    subtitle: `Whole-project schematic generated from ${projectLabel}'s saved product selections and discovery details.`,
    kind: "whole-project",
    customerSummary: `This diagram shows every WyreStorm product selected for ${projectLabel} and how each one connects, plus the minimal third-party items (display, network switch, room PC, etc.) needed for the system to make sense.`,
    technicalSummary: `${realDeviceCount} real WyreStorm SKU node(s) and ${thirdPartyCount} third-party/generic placeholder node(s) were generated by the schematic engine from the project's product selections and discovery brief. Cable/transport type is shown per connection.`,
    assumptions: [...schematic.assumptions, ...otherWarningMessages],
    missingInformation: [
      "Exact camera/speakerphone/touch-panel quantities are inferred from selected SKUs and discovery notes because the project does not track exact counts for these device types.",
      "Cable distances are inferred from discovery notes where available; confirm exact run lengths before quoting HDBaseT/AV-over-IP extension gear.",
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
