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
}

const statusClass: Record<VisualNodeStatus, string> = {
  normal: "wm-vs-node-normal",
  recommended: "wm-vs-node-recommended",
  optional: "wm-vs-node-optional",
  missing: "wm-vs-node-missing",
  risk: "wm-vs-node-risk"
};

const VISUAL_STUDIO_COLUMN_GAP = 248;
const VISUAL_STUDIO_ROW_GAP = 164;
const emphasisClass: Record<VisualNodeEmphasis, string> = {
  primary: "wm-vs-node-emphasis-primary",
  support: "wm-vs-node-emphasis-support",
  compact: "wm-vs-node-emphasis-compact"
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

export function buildReactFlowModel(
  model: VisualDiagramModel,
  mode: VisualDiagramMode
): { nodes: Node<WingmanFlowNodeData>[]; edges: Edge[] } {
  const nodes: Node<WingmanFlowNodeData>[] = model.nodes.map((node) => {
    const status = node.status ?? "normal";
    const emphasis = node.emphasis ?? "support";

    return {
      id: node.id,
      type: "wingmanVisualNode",
      position: {
        x: node.column * VISUAL_STUDIO_COLUMN_GAP,
        y: node.row * VISUAL_STUDIO_ROW_GAP
      },
      data: {
        label: makeNodeLabel(node, mode),
        subtitle: makeNodeSubtitle(node, mode),
        kind: node.kind,
        status,
        mode,
        emphasis,
        className: `${statusClass[status]} ${emphasisClass[emphasis]} wm-vs-node-kind-${node.kind} wm-vs-node-mode-${mode}`
      }
    };
  });

  const edges: Edge[] = model.edges.map((edge) => {
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      type: mode === "technical" ? "step" : "smoothstep",
      animated: false,
      className: edgeClass(edge),
      markerEnd: {
        type: MarkerType.ArrowClosed
      }
    };
  });

  return { nodes, edges };
}
