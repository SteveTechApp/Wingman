export type VisualDiagramKind =
  | "av-block"
  | "networkhd-topology"
  | "usb-conferencing"
  | "video-wall"
  | "proposal-overview"
  | "competitor-map"
  | "room-wiring"
  | "product-connection";

export type VisualDiagramMode = "technical" | "customer";

export type VisualNodeKind =
  | "customer"
  | "source"
  | "switching"
  | "transport"
  | "network"
  | "controller"
  | "display"
  | "audio"
  | "usb"
  | "camera"
  | "processor"
  | "warning"
  | "output";

export type VisualNodeStatus = "normal" | "recommended" | "optional" | "missing" | "risk";

export interface VisualDiagramNode {
  id: string;
  label: string;
  subtitle?: string;
  kind: VisualNodeKind;
  status?: VisualNodeStatus;
  column: number;
  row: number;
}

export interface VisualDiagramEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  status?: VisualNodeStatus;
}

export interface VisualDiagramModel {
  id: string;
  title: string;
  subtitle: string;
  kind: VisualDiagramKind;
  customerSummary: string;
  technicalSummary: string;
  nodes: VisualDiagramNode[];
  edges: VisualDiagramEdge[];
  assumptions: string[];
  missingInformation: string[];
  quoteRisks: string[];
  nextActions: string[];
}
