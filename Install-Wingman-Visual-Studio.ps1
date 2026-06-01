#requires -version 5.1
$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "==> Wingman Visual Studio native diagram installer" -ForegroundColor Cyan
Write-Host ""

$Root = Get-Location
$PackageJson = Join-Path $Root "package.json"

if (!(Test-Path $PackageJson)) {
    Write-Host "ERROR: package.json was not found. Run this script from the Wingman project root folder." -ForegroundColor Red
    exit 1
}

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupDir = Join-Path $Root "backups\visual-studio-$Stamp"
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

function Backup-File {
    param(
        [Parameter(Mandatory = $true)]
        [string] $Path
    )

    if (!(Test-Path $Path)) {
        return
    }

    $relative = Resolve-Path $Path | ForEach-Object {
        $_.Path.Substring($Root.Path.Length).TrimStart('\')
    }

    $backupPath = Join-Path $BackupDir $relative
    $backupFolder = Split-Path $backupPath -Parent
    New-Item -ItemType Directory -Force -Path $backupFolder | Out-Null
    Copy-Item -Path $Path -Destination $backupPath -Force
}

function Write-Utf8File {
    param(
        [Parameter(Mandatory = $true)]
        [string] $Path,

        [Parameter(Mandatory = $true)]
        [string] $Content
    )

    $folder = Split-Path $Path -Parent
    New-Item -ItemType Directory -Force -Path $folder | Out-Null
    Backup-File -Path $Path

    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
}

function Append-TextIfMissing {
    param(
        [Parameter(Mandatory = $true)]
        [string] $Path,

        [Parameter(Mandatory = $true)]
        [string] $Needle,

        [Parameter(Mandatory = $true)]
        [string] $AppendText
    )

    if (!(Test-Path $Path)) {
        return
    }

    $content = Get-Content -Path $Path -Raw

    if ($content.Contains($Needle)) {
        return
    }

    Backup-File -Path $Path
    $updated = $content.TrimEnd() + "`r`n`r`n" + $AppendText.Trim() + "`r`n"

    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $updated, $utf8NoBom)
}

function Prepend-TextIfMissing {
    param(
        [Parameter(Mandatory = $true)]
        [string] $Path,

        [Parameter(Mandatory = $true)]
        [string] $Needle,

        [Parameter(Mandatory = $true)]
        [string] $PrependText
    )

    if (!(Test-Path $Path)) {
        return
    }

    $content = Get-Content -Path $Path -Raw

    if ($content.Contains($Needle)) {
        return
    }

    Backup-File -Path $Path
    $updated = $PrependText.TrimEnd() + "`r`n" + $content

    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $updated, $utf8NoBom)
}

Write-Host "==> Installing native diagram dependencies" -ForegroundColor Cyan
npm install @xyflow/react html-to-image

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: npm install failed." -ForegroundColor Red
    exit 1
}

$TypesPath = Join-Path $Root "src\wingman2\lib\visualStudioTypes.ts"
$SamplesPath = Join-Path $Root "src\wingman2\lib\visualStudioSamples.ts"
$FactoryPath = Join-Path $Root "src\wingman2\lib\visualStudioDiagramFactory.ts"
$CanvasPath = Join-Path $Root "src\wingman2\components\VisualStudioCanvas.tsx"
$PagePath = Join-Path $Root "src\wingman2\pages\VisualStudioPage.tsx"

Write-Host "==> Writing Visual Studio data model" -ForegroundColor Cyan

Write-Utf8File -Path $TypesPath -Content @'
export type VisualDiagramKind =
  | "av-block"
  | "networkhd-topology"
  | "usb-conferencing"
  | "video-wall"
  | "proposal-overview"
  | "competitor-map";

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
'@

Write-Host "==> Writing Visual Studio sample diagrams" -ForegroundColor Cyan

Write-Utf8File -Path $SamplesPath -Content @'
import type { VisualDiagramModel } from "./visualStudioTypes";

export const visualStudioDiagrams: VisualDiagramModel[] = [
  {
    id: "sports-bar-networkhd",
    title: "Hospitality / Sports Bar AVoIP Direction",
    subtitle: "Flexible multi-screen distribution with visible control and quote checks.",
    kind: "networkhd-topology",
    customerSummary:
      "A flexible AV-over-IP system shape for venues that need different content on multiple screens and future expansion.",
    technicalSummary:
      "Sources are encoded into NetworkHD, routed over the AV network, controlled by NHD-CTL-PRO, and decoded at each display.",
    assumptions: [
      "Multiple displays need independent or grouped source selection.",
      "The venue may need future screen expansion.",
      "Network ownership and switch capability still need to be confirmed."
    ],
    missingInformation: [
      "Exact display count and locations.",
      "Network switch model and VLAN / IGMP support.",
      "Required control method for bar staff."
    ],
    quoteRisks: [
      "Do not quote NetworkHD without confirming the network switch design.",
      "Do not omit the NetworkHD controller.",
      "Confirm whether any screens need audio de-embedding or local amplification."
    ],
    nextActions: [
      "Confirm source count and display count.",
      "Ask who owns the network.",
      "Confirm whether staff need preset buttons, touch control, or third-party control."
    ],
    nodes: [
      { id: "sources", label: "Venue Sources", subtitle: "Sky / signage / media players", kind: "source", status: "normal", column: 0, row: 1 },
      { id: "encoders", label: "NetworkHD Encoders", subtitle: "One per source", kind: "transport", status: "recommended", column: 1, row: 1 },
      { id: "switch", label: "AV Network Switch", subtitle: "IGMP / multicast design required", kind: "network", status: "risk", column: 2, row: 1 },
      { id: "ctl", label: "NHD-CTL-PRO", subtitle: "Required NetworkHD controller", kind: "controller", status: "recommended", column: 2, row: 0 },
      { id: "decoders", label: "NetworkHD Decoders", subtitle: "One per display / output", kind: "transport", status: "recommended", column: 3, row: 1 },
      { id: "displays", label: "Venue Displays", subtitle: "Grouped or independent routing", kind: "display", status: "normal", column: 4, row: 1 },
      { id: "control", label: "Staff Control", subtitle: "Preset routing / touch / third-party", kind: "controller", status: "missing", column: 3, row: 0 }
    ],
    edges: [
      { id: "e1", source: "sources", target: "encoders", label: "HDMI" },
      { id: "e2", source: "encoders", target: "switch", label: "AV-over-IP" },
      { id: "e3", source: "switch", target: "decoders", label: "AV-over-IP" },
      { id: "e4", source: "decoders", target: "displays", label: "HDMI" },
      { id: "e5", source: "ctl", target: "switch", label: "Control" },
      { id: "e6", source: "control", target: "ctl", label: "User presets" }
    ]
  },
  {
    id: "meeting-room-usb",
    title: "Meeting Room USB / BYOD Ownership",
    subtitle: "Shows why conferencing rooms need USB ownership, not just video switching.",
    kind: "usb-conferencing",
    customerSummary:
      "A simplified meeting room view showing how the user connects, presents content, and accesses the room camera and audio devices.",
    technicalSummary:
      "The key design question is USB ownership: whether the laptop, room PC, or UC appliance owns the camera, microphone and speaker path.",
    assumptions: [
      "The room supports BYOD or BYOM working.",
      "A camera and microphone/speaker device are required.",
      "The display path and USB path both need to be designed."
    ],
    missingInformation: [
      "Laptop connection type: USB-C, HDMI plus USB, or wireless.",
      "Camera location and USB distance.",
      "Whether the room has a room PC or appliance."
    ],
    quoteRisks: [
      "Do not recommend an HDMI-only route if the customer expects USB camera and microphone access.",
      "Confirm USB version and distance before selecting extenders or switchers.",
      "Confirm whether the user expects single-cable USB-C."
    ],
    nextActions: [
      "Ask: who owns the meeting — user laptop, room PC, or UC appliance?",
      "Confirm camera and microphone model.",
      "Confirm cable distance between table, display and rack."
    ],
    nodes: [
      { id: "laptop", label: "User Laptop", subtitle: "BYOD / BYOM", kind: "source", status: "normal", column: 0, row: 1 },
      { id: "ucswitch", label: "UC / Presentation Switcher", subtitle: "Video plus USB management", kind: "switching", status: "recommended", column: 1, row: 1 },
      { id: "display", label: "Room Display", subtitle: "HDMI / USB-C video path", kind: "display", status: "normal", column: 2, row: 0 },
      { id: "camera", label: "USB Camera", subtitle: "Front of room or PTZ", kind: "camera", status: "missing", column: 2, row: 1 },
      { id: "audio", label: "Microphone / Speaker", subtitle: "USB audio or DSP path", kind: "audio", status: "missing", column: 2, row: 2 },
      { id: "risk", label: "Quote Check", subtitle: "USB distance and ownership required", kind: "warning", status: "risk", column: 3, row: 1 }
    ],
    edges: [
      { id: "e1", source: "laptop", target: "ucswitch", label: "USB-C / HDMI + USB" },
      { id: "e2", source: "ucswitch", target: "display", label: "Video" },
      { id: "e3", source: "camera", target: "ucswitch", label: "USB camera" },
      { id: "e4", source: "audio", target: "ucswitch", label: "USB audio" },
      { id: "e5", source: "ucswitch", target: "risk", label: "Validate" }
    ]
  },
  {
    id: "lcd-video-wall",
    title: "LCD Video Wall Decision Shape",
    subtitle: "Dedicated processor and AVoIP options shown side-by-side.",
    kind: "video-wall",
    customerSummary:
      "A visual decision map showing when a dedicated wall processor is a better fit and when AV-over-IP adds flexibility.",
    technicalSummary:
      "Video wall design must separate full canvas, preset layouts, per-display routing, signage and multiview behaviour.",
    assumptions: [
      "The requirement is an LCD video wall, not an LED wall processor input.",
      "The wall may require either full-canvas or mixed-layout behaviour.",
      "The control requirement is not yet confirmed."
    ],
    missingInformation: [
      "Wall layout: 2x2, 3x3, 1x3, 4x2 or other.",
      "Whether the customer needs full canvas, presets, per-display content or mixed layouts.",
      "Number of sources and whether they are local or remote."
    ],
    quoteRisks: [
      "Do not assume AV-over-IP is automatically the best answer.",
      "Confirm whether the displays support the desired wall behaviour.",
      "Confirm bezel compensation, scaling and control expectations."
    ],
    nextActions: [
      "Confirm wall size and behaviour.",
      "Confirm source count.",
      "Choose between SW-0204-VW, SW-0206-VW, matrix/SCL or NetworkHD architecture."
    ],
    nodes: [
      { id: "requirement", label: "Video Wall Requirement", subtitle: "Layout and behaviour first", kind: "customer", status: "normal", column: 0, row: 1 },
      { id: "simple", label: "Simple Preset Wall", subtitle: "Basic wall layouts", kind: "processor", status: "optional", column: 1, row: 0 },
      { id: "advanced", label: "Advanced Processor", subtitle: "SW-0206-VW direction", kind: "processor", status: "recommended", column: 1, row: 1 },
      { id: "avoip", label: "Flexible AVoIP Wall", subtitle: "NetworkHD where routing/scale demands it", kind: "network", status: "optional", column: 1, row: 2 },
      { id: "outputs", label: "Wall Displays", subtitle: "Each display input must be planned", kind: "display", status: "normal", column: 2, row: 1 },
      { id: "control", label: "Control Method", subtitle: "Presets / touch / third-party", kind: "controller", status: "missing", column: 3, row: 1 }
    ],
    edges: [
      { id: "e1", source: "requirement", target: "simple", label: "Preset/simple" },
      { id: "e2", source: "requirement", target: "advanced", label: "Advanced wall control" },
      { id: "e3", source: "requirement", target: "avoip", label: "Distributed/flexible" },
      { id: "e4", source: "simple", target: "outputs", label: "HDMI outputs" },
      { id: "e5", source: "advanced", target: "outputs", label: "Processed wall outputs" },
      { id: "e6", source: "avoip", target: "outputs", label: "Decoder per display" },
      { id: "e7", source: "outputs", target: "control", label: "User operation" }
    ]
  },
  {
    id: "proposal-overview",
    title: "Proposal System Overview",
    subtitle: "Customer-safe summary visual for a first-pass proposal.",
    kind: "proposal-overview",
    customerSummary:
      "A clean proposal graphic showing the customer requirement, recommended system shape, benefits and remaining checks.",
    technicalSummary:
      "This is not a final engineering schematic. It is a proposal overview that keeps assumptions and quote risks visible.",
    assumptions: [
      "The design is at proposal starter stage.",
      "Final product quantities depend on confirmed sources, displays, cable paths and control needs.",
      "Pre-sales review is still required for complex projects."
    ],
    missingInformation: [
      "Final cable distances.",
      "Control method.",
      "Network ownership and switch detail where AV-over-IP is used."
    ],
    quoteRisks: [
      "Do not use this visual as a final quote without validating product quantities.",
      "Confirm all required receivers, controllers, accessories and project dependencies.",
      "Confirm audio, USB and control paths."
    ],
    nextActions: [
      "Review missing information with the customer or integrator.",
      "Confirm product quantities.",
      "Generate proposal wording once the design risk is acceptable."
    ],
    nodes: [
      { id: "need", label: "Customer Need", subtitle: "Application and outcome", kind: "customer", status: "normal", column: 0, row: 1 },
      { id: "direction", label: "Recommended Direction", subtitle: "WyreStorm-first architecture", kind: "switching", status: "recommended", column: 1, row: 1 },
      { id: "system", label: "System Shape", subtitle: "Video / audio / USB / control", kind: "transport", status: "recommended", column: 2, row: 1 },
      { id: "benefits", label: "Customer Benefits", subtitle: "Clearer, safer solution story", kind: "output", status: "normal", column: 3, row: 0 },
      { id: "checks", label: "Quote Checks", subtitle: "Missing information remains visible", kind: "warning", status: "risk", column: 3, row: 2 }
    ],
    edges: [
      { id: "e1", source: "need", target: "direction", label: "Discovery" },
      { id: "e2", source: "direction", target: "system", label: "Product family" },
      { id: "e3", source: "system", target: "benefits", label: "Proposal value" },
      { id: "e4", source: "system", target: "checks", label: "Validation" }
    ]
  }
];

export function getVisualDiagramById(id: string): VisualDiagramModel {
  const match = visualStudioDiagrams.find((diagram) => diagram.id === id);

  if (match) {
    return match;
  }

  return visualStudioDiagrams[0];
}
'@

Write-Host "==> Writing React Flow diagram factory" -ForegroundColor Cyan

Write-Utf8File -Path $FactoryPath -Content @'
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
        x: node.column * 270,
        y: node.row * 150
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
'@

Write-Host "==> Writing native diagram canvas component" -ForegroundColor Cyan

Write-Utf8File -Path $CanvasPath -Content @'
import { memo, useMemo, useRef } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  type NodeProps
} from "@xyflow/react";
import { toPng, toSvg } from "html-to-image";
import { buildReactFlowModel, type WingmanFlowNodeData } from "../lib/visualStudioDiagramFactory";
import type { VisualDiagramMode, VisualDiagramModel } from "../lib/visualStudioTypes";

interface VisualStudioCanvasProps {
  model: VisualDiagramModel;
  mode: VisualDiagramMode;
}

function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

function safeFileName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

const WingmanVisualNode = memo(function WingmanVisualNode({ data }: NodeProps) {
  const nodeData = data as WingmanFlowNodeData;
  const className = typeof nodeData.className === "string" ? nodeData.className : "wm-vs-node-normal";

  return (
    <div className={`wm-vs-flow-node ${className}`}>
      <div className="wm-vs-node-kicker">{String(nodeData.kind).toUpperCase()}</div>
      <div className="wm-vs-node-title">{nodeData.label}</div>
      {nodeData.subtitle ? <div className="wm-vs-node-subtitle">{nodeData.subtitle}</div> : null}
    </div>
  );
});

const nodeTypes = {
  wingmanVisualNode: WingmanVisualNode
};

function VisualStudioCanvasInner({ model, mode }: VisualStudioCanvasProps) {
  const exportRef = useRef<HTMLDivElement | null>(null);

  const flowModel = useMemo(() => {
    return buildReactFlowModel(model, mode);
  }, [model, mode]);

  const exportPng = async () => {
    if (!exportRef.current) {
      return;
    }

    const dataUrl = await toPng(exportRef.current, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: "#f6f7fb"
    });

    downloadDataUrl(dataUrl, `${safeFileName(model.title)}-${mode}.png`);
  };

  const exportSvg = async () => {
    if (!exportRef.current) {
      return;
    }

    const dataUrl = await toSvg(exportRef.current, {
      cacheBust: true,
      backgroundColor: "#f6f7fb"
    });

    downloadDataUrl(dataUrl, `${safeFileName(model.title)}-${mode}.svg`);
  };

  return (
    <section className="wm-vs-canvas-shell">
      <div className="wm-vs-canvas-toolbar">
        <div>
          <p className="wm-vs-eyebrow">Native diagram canvas</p>
          <h2>{model.title}</h2>
        </div>
        <div className="wm-vs-toolbar-actions">
          <button type="button" className="wm-vs-button wm-vs-button-secondary" onClick={exportSvg}>
            Export SVG
          </button>
          <button type="button" className="wm-vs-button wm-vs-button-primary" onClick={exportPng}>
            Export PNG
          </button>
        </div>
      </div>

      <div className="wm-vs-canvas" ref={exportRef}>
        <ReactFlow
          nodes={flowModel.nodes}
          edges={flowModel.edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.18 }}
          minZoom={0.35}
          maxZoom={1.6}
          nodesDraggable
          nodesConnectable={false}
          elementsSelectable
        >
          <Background gap={24} size={1} />
          <MiniMap pannable zoomable />
          <Controls />
        </ReactFlow>
      </div>
    </section>
  );
}

export default function VisualStudioCanvas(props: VisualStudioCanvasProps) {
  return (
    <ReactFlowProvider>
      <VisualStudioCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
'@

Write-Host "==> Writing Visual Studio page" -ForegroundColor Cyan

Write-Utf8File -Path $PagePath -Content @'
import { useMemo, useState } from "react";
import VisualStudioCanvas from "../components/VisualStudioCanvas";
import { getVisualDiagramById, visualStudioDiagrams } from "../lib/visualStudioSamples";
import type { VisualDiagramMode } from "../lib/visualStudioTypes";

export default function VisualStudioPage() {
  const [selectedDiagramId, setSelectedDiagramId] = useState(visualStudioDiagrams[0].id);
  const [mode, setMode] = useState<VisualDiagramMode>("technical");

  const selectedDiagram = useMemo(() => {
    return getVisualDiagramById(selectedDiagramId);
  }, [selectedDiagramId]);

  return (
    <main className="wm-vs-page">
      <header className="wm-vs-header">
        <div>
          <p className="wm-vs-eyebrow">Wingman Visual Studio</p>
          <h1>Native AV schematic and concept graphics</h1>
          <p>
            Generate customer-safe visuals and technical system shapes directly inside Wingman.
            This first pass uses Wingman-ready AV scenarios and is designed to connect later to
            Discovery, Finder, Product Pitch and Proposal data.
          </p>
        </div>

        <div className="wm-vs-header-card">
          <span>Current output</span>
          <strong>{mode === "technical" ? "Technical schematic" : "Customer concept graphic"}</strong>
          <small>PNG and SVG export ready</small>
        </div>
      </header>

      <section className="wm-vs-layout">
        <aside className="wm-vs-left-rail">
          <div className="wm-vs-panel">
            <p className="wm-vs-eyebrow">Diagram type</p>
            <div className="wm-vs-diagram-list">
              {visualStudioDiagrams.map((diagram) => (
                <button
                  key={diagram.id}
                  type="button"
                  className={`wm-vs-choice ${selectedDiagramId === diagram.id ? "is-active" : ""}`}
                  onClick={() => setSelectedDiagramId(diagram.id)}
                >
                  <span>{diagram.title}</span>
                  <small>{diagram.subtitle}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="wm-vs-panel">
            <p className="wm-vs-eyebrow">View mode</p>
            <div className="wm-vs-mode-grid">
              <button
                type="button"
                className={`wm-vs-mode ${mode === "technical" ? "is-active" : ""}`}
                onClick={() => setMode("technical")}
              >
                <span>Technical</span>
                <small>Shows devices, paths and quote checks.</small>
              </button>
              <button
                type="button"
                className={`wm-vs-mode ${mode === "customer" ? "is-active" : ""}`}
                onClick={() => setMode("customer")}
              >
                <span>Customer</span>
                <small>Simplifies the graphic for discussion.</small>
              </button>
            </div>
          </div>
        </aside>

        <VisualStudioCanvas model={selectedDiagram} mode={mode} />

        <aside className="wm-vs-right-rail">
          <div className="wm-vs-panel wm-vs-summary-panel">
            <p className="wm-vs-eyebrow">What this shows</p>
            <h2>{selectedDiagram.title}</h2>
            <p>{mode === "technical" ? selectedDiagram.technicalSummary : selectedDiagram.customerSummary}</p>
          </div>

          <div className="wm-vs-panel">
            <p className="wm-vs-eyebrow">Assumptions</p>
            <ul className="wm-vs-list">
              {selectedDiagram.assumptions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="wm-vs-panel wm-vs-warning-panel">
            <p className="wm-vs-eyebrow">Missing information</p>
            <ul className="wm-vs-list">
              {selectedDiagram.missingInformation.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="wm-vs-panel wm-vs-risk-panel">
            <p className="wm-vs-eyebrow">Quote risks</p>
            <ul className="wm-vs-list">
              {selectedDiagram.quoteRisks.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="wm-vs-panel">
            <p className="wm-vs-eyebrow">Next action</p>
            <ul className="wm-vs-list">
              {selectedDiagram.nextActions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </aside>
      </section>
    </main>
  );
}
'@

Write-Host "==> Updating shared Wingman CSS" -ForegroundColor Cyan

$CssCandidates = @(
    "src\wingman2\styles\wingman.css",
    "src\wingman2\styles\wingman2.css",
    "src\index.css",
    "src\main.css",
    "src\App.css"
)

$CssPath = $null

foreach ($candidate in $CssCandidates) {
    $full = Join-Path $Root $candidate

    if (Test-Path $full) {
        $CssPath = $full
        break
    }
}

if ($null -eq $CssPath) {
    $CssPath = Join-Path $Root "src\wingman2\styles\wingman.css"
    New-Item -ItemType Directory -Force -Path (Split-Path $CssPath -Parent) | Out-Null
    Set-Content -Path $CssPath -Value "" -Encoding UTF8
    Write-Host "Created fallback CSS file at src\wingman2\styles\wingman.css. Check that your app imports it." -ForegroundColor Yellow
}

Prepend-TextIfMissing -Path $CssPath -Needle '@import "@xyflow/react/dist/style.css";' -PrependText '@import "@xyflow/react/dist/style.css";'

Append-TextIfMissing -Path $CssPath -Needle "/* WINGMAN VISUAL STUDIO START */" -AppendText @'
/* WINGMAN VISUAL STUDIO START */

.wm-vs-page {
  min-height: 100vh;
  padding: 24px;
  background:
    radial-gradient(circle at top left, rgba(0, 133, 116, 0.08), transparent 34%),
    linear-gradient(180deg, #f6f7fb 0%, #eef1f6 100%);
  color: #17202a;
}

.wm-vs-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: 20px;
  align-items: stretch;
  margin-bottom: 20px;
}

.wm-vs-header h1 {
  margin: 0;
  font-size: clamp(1.8rem, 3vw, 3rem);
  line-height: 1;
  letter-spacing: -0.04em;
}

.wm-vs-header p {
  max-width: 860px;
  margin: 12px 0 0;
  color: #5c6673;
  font-size: 0.98rem;
  line-height: 1.55;
}

.wm-vs-header-card,
.wm-vs-panel,
.wm-vs-canvas-shell {
  border: 1px solid rgba(22, 32, 42, 0.1);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 18px 55px rgba(19, 33, 52, 0.08);
}

.wm-vs-header-card {
  padding: 20px;
  display: grid;
  align-content: center;
  gap: 6px;
}

.wm-vs-header-card span,
.wm-vs-header-card small {
  color: #687384;
  font-size: 0.82rem;
}

.wm-vs-header-card strong {
  font-size: 1.18rem;
}

.wm-vs-eyebrow {
  margin: 0 0 8px;
  color: #007a68;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.11em;
  text-transform: uppercase;
}

.wm-vs-layout {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr) 340px;
  gap: 18px;
  align-items: start;
}

.wm-vs-left-rail,
.wm-vs-right-rail {
  display: grid;
  gap: 14px;
}

.wm-vs-panel {
  padding: 16px;
}

.wm-vs-panel h2 {
  margin: 0 0 8px;
  font-size: 1rem;
}

.wm-vs-panel p {
  margin: 0;
  color: #5c6673;
  line-height: 1.5;
}

.wm-vs-diagram-list,
.wm-vs-mode-grid {
  display: grid;
  gap: 10px;
}

.wm-vs-choice,
.wm-vs-mode {
  width: 100%;
  border: 1px solid rgba(22, 32, 42, 0.1);
  border-radius: 16px;
  background: #ffffff;
  color: #17202a;
  padding: 13px;
  text-align: left;
  cursor: pointer;
  transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
}

.wm-vs-choice span,
.wm-vs-mode span {
  display: block;
  font-weight: 650;
  line-height: 1.2;
}

.wm-vs-choice small,
.wm-vs-mode small {
  display: block;
  margin-top: 5px;
  color: #687384;
  line-height: 1.35;
}

.wm-vs-choice:hover,
.wm-vs-mode:hover {
  transform: translateY(-1px);
  border-color: rgba(0, 122, 104, 0.35);
  box-shadow: 0 14px 30px rgba(19, 33, 52, 0.08);
}

.wm-vs-choice.is-active,
.wm-vs-mode.is-active {
  border-color: rgba(0, 122, 104, 0.68);
  box-shadow: inset 0 0 0 1px rgba(0, 122, 104, 0.36), 0 14px 30px rgba(0, 122, 104, 0.11);
}

.wm-vs-canvas-shell {
  overflow: hidden;
}

.wm-vs-canvas-toolbar {
  min-height: 78px;
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
  border-bottom: 1px solid rgba(22, 32, 42, 0.08);
}

.wm-vs-canvas-toolbar h2 {
  margin: 0;
  font-size: 1.05rem;
}

.wm-vs-toolbar-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.wm-vs-button {
  border: 0;
  border-radius: 999px;
  padding: 10px 14px;
  font-weight: 600;
  cursor: pointer;
}

.wm-vs-button-primary {
  background: #008574;
  color: #ffffff;
}

.wm-vs-button-secondary {
  background: #eef4f3;
  color: #006d5f;
}

.wm-vs-canvas {
  width: 100%;
  height: 660px;
  background:
    linear-gradient(90deg, rgba(22, 32, 42, 0.035) 1px, transparent 1px),
    linear-gradient(180deg, rgba(22, 32, 42, 0.035) 1px, transparent 1px),
    #f6f7fb;
  background-size: 40px 40px;
}

.wm-vs-flow-node {
  min-width: 190px;
  max-width: 230px;
  border-radius: 20px;
  border: 1px solid rgba(22, 32, 42, 0.14);
  background: #ffffff;
  box-shadow: 0 14px 40px rgba(19, 33, 52, 0.14);
  padding: 14px;
  color: #17202a;
}

.wm-vs-node-kicker {
  margin-bottom: 8px;
  color: #687384;
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.12em;
}

.wm-vs-node-title {
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.2;
}

.wm-vs-node-subtitle {
  margin-top: 7px;
  color: #5c6673;
  font-size: 0.78rem;
  line-height: 1.35;
}

.wm-vs-node-recommended {
  border-color: rgba(0, 133, 116, 0.55);
  box-shadow: 0 16px 44px rgba(0, 133, 116, 0.17);
}

.wm-vs-node-optional {
  border-style: dashed;
}

.wm-vs-node-missing {
  border-color: rgba(218, 141, 0, 0.65);
  background: #fff8eb;
}

.wm-vs-node-risk {
  border-color: rgba(204, 63, 63, 0.6);
  background: #fff2f2;
}

.wm-vs-list {
  margin: 0;
  padding-left: 18px;
  color: #4e5966;
  line-height: 1.45;
  font-size: 0.9rem;
}

.wm-vs-list li + li {
  margin-top: 8px;
}

.wm-vs-warning-panel {
  border-color: rgba(218, 141, 0, 0.28);
}

.wm-vs-risk-panel {
  border-color: rgba(204, 63, 63, 0.24);
}

.react-flow__edge.wm-vs-edge-risk path,
.react-flow__edge.wm-vs-edge-missing path {
  stroke-width: 2.5;
}

.react-flow__edge-text {
  font-size: 11px;
}

@media (max-width: 1280px) {
  .wm-vs-layout {
    grid-template-columns: 280px minmax(0, 1fr);
  }

  .wm-vs-right-rail {
    grid-column: 1 / -1;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 920px) {
  .wm-vs-page {
    padding: 16px;
  }

  .wm-vs-header,
  .wm-vs-layout,
  .wm-vs-right-rail {
    grid-template-columns: 1fr;
  }

  .wm-vs-canvas-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .wm-vs-canvas {
    height: 560px;
  }
}

/* WINGMAN VISUAL STUDIO END */
'@

Write-Host "==> Attempting to wire Visual Studio route" -ForegroundColor Cyan

$RouteCandidates = @(
    "src\wingman2\app\AppRoutes.tsx",
    "src\wingman2\AppRoutes.tsx",
    "src\AppRoutes.tsx",
    "src\App.tsx",
    "src\wingman2\app\routes.tsx",
    "src\wingman2\routes.tsx"
)

$RoutePath = $null

foreach ($candidate in $RouteCandidates) {
    $full = Join-Path $Root $candidate

    if (Test-Path $full) {
        $content = Get-Content -Path $full -Raw

        if ($content.Contains("<Routes") -or $content.Contains("createBrowserRouter") -or $content.Contains("createRoutesFromElements")) {
            $RoutePath = $full
            break
        }
    }
}

if ($null -ne $RoutePath) {
    Backup-File -Path $RoutePath
    $routeContent = Get-Content -Path $RoutePath -Raw

    $relativeImport = "../pages/VisualStudioPage"

    if ($RoutePath.EndsWith("src\App.tsx") -or $RoutePath.EndsWith("src\AppRoutes.tsx")) {
        $relativeImport = "./wingman2/pages/VisualStudioPage"
    }

    if ($RoutePath.EndsWith("src\wingman2\AppRoutes.tsx") -or $RoutePath.EndsWith("src\wingman2\routes.tsx")) {
        $relativeImport = "./pages/VisualStudioPage"
    }

    if (!$routeContent.Contains("VisualStudioPage")) {
        $routeContent = "import VisualStudioPage from `"$relativeImport`";`r`n" + $routeContent
    }

    if ($routeContent.Contains("</Routes>") -and !$routeContent.Contains("/wingman/visual-studio")) {
        $routeLine = "        <Route path=`"/wingman/visual-studio`" element={<VisualStudioPage />} />`r`n        <Route path=`"visual-studio`" element={<VisualStudioPage />} />`r`n"
        $routeContent = $routeContent.Replace("</Routes>", $routeLine + "      </Routes>")
    }

    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($RoutePath, $routeContent, $utf8NoBom)
    Write-Host "Route patch attempted in: $RoutePath" -ForegroundColor Green
}

if ($null -eq $RoutePath) {
    Write-Host "WARNING: Could not find a React Router route file automatically." -ForegroundColor Yellow
    Write-Host "The Visual Studio page was created at src\wingman2\pages\VisualStudioPage.tsx." -ForegroundColor Yellow
    Write-Host "Manual route needed: /wingman/visual-studio -> VisualStudioPage." -ForegroundColor Yellow
}

Write-Host "==> Optional route catalog patch" -ForegroundColor Cyan

$RouteCatalogPath = Join-Path $Root "src\wingman2\app\routeCatalog.ts"

if (Test-Path $RouteCatalogPath) {
    Backup-File -Path $RouteCatalogPath
    $catalog = Get-Content -Path $RouteCatalogPath -Raw

    if (!$catalog.Contains("visualStudio")) {
        if ($catalog.Contains("export type WingmanRouteKey")) {
            $catalog = [regex]::Replace(
                $catalog,
                '(export\s+type\s+WingmanRouteKey\s*=\s*)([^;]+)(;)',
                {
                    param($m)
                    $prefix = $m.Groups[1].Value
                    $body = $m.Groups[2].Value.Trim()
                    $suffix = $m.Groups[3].Value

                    if ($body.Contains('"visualStudio"')) {
                        return $m.Value
                    }

                    return "$prefix$body | `"visualStudio`"$suffix"
                },
                1
            )
        }

        $inserted = $false

        if ($catalog.Contains("routeCatalogByKey") -and $catalog.Contains("};")) {
            $routeEntry = @'

  visualStudio: {
    key: "visualStudio",
    label: "Visual Studio",
    path: "/wingman/visual-studio",
    description: "Generate native AV schematics and customer-safe system graphics."
  },
'@

            $lastClose = $catalog.LastIndexOf("};")

            if ($lastClose -gt 0) {
                $catalog = $catalog.Insert($lastClose, $routeEntry)
                $inserted = $true
            }
        }

        $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
        [System.IO.File]::WriteAllText($RouteCatalogPath, $catalog, $utf8NoBom)

        if ($inserted) {
            Write-Host "Route catalog patch attempted in: $RouteCatalogPath" -ForegroundColor Green
        }

        if (!$inserted) {
            Write-Host "Route catalog was found, but could not be patched confidently. This is not fatal." -ForegroundColor Yellow
        }
    }
}

Write-Host "==> Running validation" -ForegroundColor Cyan

npm run typecheck

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Typecheck failed. Your backups are here:" -ForegroundColor Yellow
    Write-Host $BackupDir -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Most likely cause: your route file or route catalog shape differs from the installer assumption." -ForegroundColor Yellow
    Write-Host "The new Visual Studio files were still created successfully." -ForegroundColor Yellow
    exit 1
}

npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Build failed. Your backups are here:" -ForegroundColor Yellow
    Write-Host $BackupDir -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "==> Wingman Visual Studio installation completed successfully" -ForegroundColor Green
Write-Host ""
Write-Host "Open the app and try:" -ForegroundColor Cyan
Write-Host "http://127.0.0.1:3000/wingman/visual-studio"
Write-Host ""
Write-Host "Backups saved to:" -ForegroundColor Cyan
Write-Host $BackupDir
Write-Host ""