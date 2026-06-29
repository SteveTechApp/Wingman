import { MarkerType, type Edge, type Node } from "@xyflow/react";
import type {
  VisualDiagramEdge,
  VisualDiagramMode,
  VisualDiagramModel,
  VisualDiagramNode,
  VisualNodeEmphasis,
  VisualNodeStatus
} from "./visualStudioTypes";

export interface WingmanFlowNodeData extends Record<string, unknown> {
  label: string;
  subtitle?: string;
  kind: string;
  status: VisualNodeStatus;
  mode: VisualDiagramMode;
  emphasis: VisualNodeEmphasis;
  reference: string;
  connectionLabels: string[];
}

const statusClass: Record<VisualNodeStatus, string> = {
  normal: "wm-vs-node-normal",
  recommended: "wm-vs-node-recommended",
  optional: "wm-vs-node-optional",
  missing: "wm-vs-node-missing",
  risk: "wm-vs-node-risk"
};

const VISUAL_STUDIO_COLUMN_GAP = 356;
const VISUAL_STUDIO_ROW_GAP = 214;
const emphasisClass: Record<VisualNodeEmphasis, string> = {
  primary: "wm-vs-node-emphasis-primary",
  support: "wm-vs-node-emphasis-support",
  compact: "wm-vs-node-emphasis-compact"
};

const emphasisWidth: Record<VisualNodeEmphasis, number> = {
  primary: 330,
  support: 252,
  compact: 218,
};

const _kindLabel: Record<string, string> = {
  customer: "Customer",
  source: "Source",
  switching: "Switching",
  transport: "Transport",
  network: "Network",
  controller: "Control",
  display: "Display",
  audio: "Audio",
  usb: "USB",
  camera: "Camera",
  processor: "Processor",
  warning: "Check",
  output: "Output"
};

function makeNodeLabel(node: VisualDiagramNode, _mode: VisualDiagramMode): string {
  return node.label;
}

function makeNodeSubtitle(node: VisualDiagramNode, mode: VisualDiagramMode): string | undefined {
  if (mode === "customer") {
    return node.subtitle;
  }

  if (!node.subtitle) {
    return "Confirm details before quote.";
  }

  return node.subtitle;
}

function edgeClass(edge: VisualDiagramEdge): string {
  if (!edge.status) {
    return "wm-vs-edge-normal";
  }

  if (edge.status === "risk") {
    return "wm-vs-edge-risk";
  }

  if (edge.status === "missing") {
    return "wm-vs-edge-missing";
  }

  return "wm-vs-edge-normal";
}

type SignalFamily = "video" | "usb" | "network" | "audio" | "control" | "validation";

const signalColour: Record<SignalFamily, string> = {
  video: "#2563eb",
  usb: "#7c3aed",
  network: "#059669",
  audio: "#d97706",
  control: "#475569",
  validation: "#c2410c",
};

const signalReference: Record<SignalFamily, string> = {
  video: "VIDEO",
  usb: "USB",
  network: "LAN",
  audio: "AUDIO",
  control: "CTRL",
  validation: "CHECK",
};

const nodeReferencePrefix: Record<string, string> = {
  customer: "USR",
  source: "SRC",
  switching: "SWT",
  transport: "TXR",
  network: "NET",
  controller: "CTL",
  display: "DSP",
  audio: "AUD",
  usb: "USB",
  camera: "CAM",
  processor: "PRC",
  warning: "CHK",
  output: "OUT",
};

function signalFamily(label = "", status?: VisualNodeStatus): SignalFamily {
  const normalized = label.toLowerCase();

  if (status === "risk" || status === "missing" || /check|confirm|validate|risk/.test(normalized)) {
    return "validation";
  }

  if (/usb|host|device/.test(normalized)) {
    return "usb";
  }

  if (/audio|dante|speaker|microphone|mic\b/.test(normalized)) {
    return "audio";
  }

  if (/lan|network|av-over-ip|avoip|ip \/|multicast|ethernet/.test(normalized)) {
    return "network";
  }

  if (/control|preset|rs-232|cec|ir|api/.test(normalized)) {
    return "control";
  }

  return "video";
}

function connectionLabels(model: VisualDiagramModel, nodeId: string): string[] {
  return [...new Set(
    model.edges
      .filter((edge) => edge.source === nodeId || edge.target === nodeId)
      .map((edge) => edge.label?.trim())
      .filter((label): label is string => Boolean(label)),
  )].slice(0, 3);
}

function edgeHandles(
  source: VisualDiagramNode,
  target: VisualDiagramNode,
): { sourceHandle: string; targetHandle: string } {
  const deltaX = target.column - source.column;
  const deltaY = target.row - source.row;

  if (Math.abs(deltaX) >= Math.abs(deltaY)) {
    return deltaX >= 0
      ? { sourceHandle: "source-right", targetHandle: "target-left" }
      : { sourceHandle: "source-left", targetHandle: "target-right" };
  }

  return deltaY >= 0
    ? { sourceHandle: "source-bottom", targetHandle: "target-top" }
    : { sourceHandle: "source-top", targetHandle: "target-bottom" };
}

export function buildReactFlowModel(
  model: VisualDiagramModel,
  mode: VisualDiagramMode
): { nodes: Node<WingmanFlowNodeData>[]; edges: Edge[] } {
  const nodesById = new Map(model.nodes.map((node) => [node.id, node]));
  const nodes: Node<WingmanFlowNodeData>[] = model.nodes.map((node, index) => {
    const status = node.status ?? "normal";
    const emphasis = node.emphasis ?? "support";
    const referencePrefix = nodeReferencePrefix[node.kind] ?? "DEV";

    return {
      id: node.id,
      type: "wingmanVisualNode",
      position: {
        x: node.column * VISUAL_STUDIO_COLUMN_GAP,
        y: node.row * VISUAL_STUDIO_ROW_GAP
      },
      style: {
        width: emphasisWidth[emphasis],
      },
      data: {
        label: makeNodeLabel(node, mode),
        subtitle: makeNodeSubtitle(node, mode),
        kind: node.kind,
        status,
        mode,
        emphasis,
        reference: `${referencePrefix}-${String(index + 1).padStart(2, "0")}`,
        connectionLabels: connectionLabels(model, node.id),
        className: `${statusClass[status]} ${emphasisClass[emphasis]} wm-vs-node-kind-${node.kind} wm-vs-node-mode-${mode}`
      }
    };
  });

  const signalSequence = new Map<SignalFamily, number>();
  const edges: Edge[] = model.edges.map((edge) => {
    const source = nodesById.get(edge.source);
    const target = nodesById.get(edge.target);
    const handles = source && target
      ? edgeHandles(source, target)
      : { sourceHandle: "source-right", targetHandle: "target-left" };
    const family = signalFamily(edge.label, edge.status);
    const colour = signalColour[family];
    const sequence = (signalSequence.get(family) ?? 0) + 1;
    signalSequence.set(family, sequence);

    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: handles.sourceHandle,
      targetHandle: handles.targetHandle,
      label: mode === "technical" ? `${signalReference[family]}-${sequence}` : edge.label,
      type: "smoothstep",
      pathOptions: {
        borderRadius: mode === "technical" ? 4 : 12,
        offset: mode === "technical" ? 28 : 20,
      },
      animated: false,
      className: `${edgeClass(edge)} wm-vs-signal-${family}`,
      style: {
        stroke: colour,
        strokeWidth: mode === "technical" ? 2.2 : 2.6,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 16,
        height: 16,
        color: colour,
      },
      labelStyle: {
        fill: "#1f2937",
        fontSize: 11,
        fontWeight: 700,
      },
      labelBgStyle: {
        fill: "#ffffff",
        fillOpacity: 0.96,
        stroke: colour,
        strokeWidth: 0.75,
      },
      labelBgPadding: [7, 4],
      labelBgBorderRadius: 4,
    };
  });

  return { nodes, edges };
}
