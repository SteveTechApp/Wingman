import { MarkerType, type Edge, type Node } from "@xyflow/react";
import type {
  VisualDiagramEdge,
  VisualDiagramMode,
  VisualDiagramModel,
  VisualDiagramNode,
  VisualNodeStatus
} from "./visualStudioTypes";

export interface WingmanFlowNodeData extends Record<string, unknown> {
  label: string;
  subtitle?: string;
  kind: string;
  status: VisualNodeStatus;
  mode: VisualDiagramMode;
}

const statusClass: Record<VisualNodeStatus, string> = {
  normal: "wm-vs-node-normal",
  recommended: "wm-vs-node-recommended",
  optional: "wm-vs-node-optional",
  missing: "wm-vs-node-missing",
  risk: "wm-vs-node-risk"
};

const VISUAL_STUDIO_COLUMN_GAP = 210;
const VISUAL_STUDIO_ROW_GAP = 132;

const kindLabel: Record<string, string> = {
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

function makeNodeLabel(node: VisualDiagramNode, mode: VisualDiagramMode): string {
  if (mode === "customer") {
    return node.label;
  }

  const kind = kindLabel[node.kind] ?? "Device";
  return `${node.label} · ${kind}`;
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
        className: statusClass[status]
      }
    };
  });

  const edges: Edge[] = model.edges.map((edge) => {
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      type: "smoothstep",
      animated: edge.status === "risk" || edge.status === "missing",
      className: edgeClass(edge),
      markerEnd: {
        type: MarkerType.ArrowClosed
      }
    };
  });

  return { nodes, edges };
}
