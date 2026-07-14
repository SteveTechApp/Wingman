import { memo, useMemo, useRef } from "react";
import {
  Controls,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type NodeProps
} from "@xyflow/react";
import { useEffect } from "react";
import { toPng, toSvg } from "html-to-image";
import {
  Cable,
  Camera,
  CircleUserRound,
  Cloud,
  Cpu,
  Laptop,
  Monitor,
  RadioTower,
  Route,
  SlidersHorizontal,
  Speaker,
  SquareTerminal,
  TriangleAlert,
  Usb,
  type LucideIcon,
} from "lucide-react";
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

const nodeKindIcon: Record<string, LucideIcon> = {
  customer: CircleUserRound,
  source: Laptop,
  switching: Route,
  transport: RadioTower,
  network: Cloud,
  controller: SlidersHorizontal,
  display: Monitor,
  audio: Speaker,
  usb: Usb,
  camera: Camera,
  processor: Cpu,
  warning: TriangleAlert,
  output: SquareTerminal,
};

const kindLabel: Record<string, string> = {
  customer: "User / requirement",
  source: "Source device",
  switching: "Switching / routing",
  transport: "Signal transport",
  network: "Network infrastructure",
  controller: "Control",
  display: "Display / destination",
  audio: "Audio",
  usb: "USB / peripheral",
  camera: "Camera",
  processor: "Processing",
  warning: "Design check",
  output: "System output",
};

const statusLabel: Record<string, string> = {
  normal: "System device",
  recommended: "Specified direction",
  optional: "Optional path",
  missing: "To be confirmed",
  risk: "Design attention",
};

const WingmanVisualNode = memo(function WingmanVisualNode({ data }: NodeProps) {
  const nodeData = data as WingmanFlowNodeData;
  const className = typeof nodeData.className === "string" ? nodeData.className : "wm-vs-node-normal";
  const kind = String(nodeData.kind);
  const status = String(nodeData.status);
  const connectionLabels = Array.isArray(nodeData.connectionLabels)
    ? nodeData.connectionLabels.map(String)
    : [];
  const Icon = nodeKindIcon[kind] ?? Cable;

  return (
    <div className={`wm-vs-flow-node ${className}`}>
      <Handle type="target" id="target-left" position={Position.Left} className="wm-vs-node-handle" />
      <Handle type="source" id="source-left" position={Position.Left} className="wm-vs-node-handle" />
      <Handle type="target" id="target-right" position={Position.Right} className="wm-vs-node-handle" />
      <Handle type="source" id="source-right" position={Position.Right} className="wm-vs-node-handle" />
      <Handle type="target" id="target-top" position={Position.Top} className="wm-vs-node-handle" />
      <Handle type="source" id="source-top" position={Position.Top} className="wm-vs-node-handle" />
      <Handle type="target" id="target-bottom" position={Position.Bottom} className="wm-vs-node-handle" />
      <Handle type="source" id="source-bottom" position={Position.Bottom} className="wm-vs-node-handle" />
      {/* === WINGMAN PRODUCT PORT FANOUT HANDLES START === */}
      <Handle
        type="source"
        id="source-bottom-1"
        position={Position.Bottom}
        className="wm-vs-node-handle wm-vs-node-handle-fanout"
        style={{ left: "14%" }}
      />
      <Handle
        type="source"
        id="source-bottom-2"
        position={Position.Bottom}
        className="wm-vs-node-handle wm-vs-node-handle-fanout"
        style={{ left: "32%" }}
      />
      <Handle
        type="source"
        id="source-bottom-3"
        position={Position.Bottom}
        className="wm-vs-node-handle wm-vs-node-handle-fanout"
        style={{ left: "50%" }}
      />
      <Handle
        type="source"
        id="source-bottom-4"
        position={Position.Bottom}
        className="wm-vs-node-handle wm-vs-node-handle-fanout"
        style={{ left: "68%" }}
      />
      <Handle
        type="source"
        id="source-bottom-5"
        position={Position.Bottom}
        className="wm-vs-node-handle wm-vs-node-handle-fanout"
        style={{ left: "86%" }}
      />
      {/* === WINGMAN PRODUCT PORT FANOUT HANDLES END === */}

      <div className="wm-vs-node-header">
        <span className="wm-vs-node-symbol" aria-hidden="true">
          <Icon size={21} strokeWidth={1.8} />
        </span>
        <span className="wm-vs-node-reference">{String(nodeData.reference)}</span>
      </div>
      <div className="wm-vs-node-kicker">{kindLabel[kind] ?? kind}</div>
      <div className="wm-vs-node-title">{nodeData.label}</div>
      {nodeData.subtitle ? <div className="wm-vs-node-subtitle">{nodeData.subtitle}</div> : null}
      {nodeData.mode === "technical" && connectionLabels.length > 0 ? (
        <div className="wm-vs-node-connections" aria-label="Connections">
          {connectionLabels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
      ) : null}
      <div className="wm-vs-node-status">
        <span aria-hidden="true" />
        {statusLabel[status] ?? "System device"}
      </div>
    </div>
  );
});

const nodeTypes = {
  wingmanVisualNode: WingmanVisualNode
};

function VisualStudioCanvasInner({ model, mode }: VisualStudioCanvasProps) {
  const exportRef = useRef<HTMLDivElement | null>(null);
  const { fitView } = useReactFlow();
  const drawingNumber = `WM-${safeFileName(model.id).toUpperCase().slice(0, 18)}`;
  const issueDate = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());

  const flowModel = useMemo(() => {
    return buildReactFlowModel(model, mode);
  }, [model, mode]);

  useEffect(() => {
    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        void fitView({ padding: 0.12, minZoom: 0.45, maxZoom: 0.95, duration: 0 });
      });
    });

    return () => {
      cancelAnimationFrame(firstFrame);
      if (secondFrame) cancelAnimationFrame(secondFrame);
    };
  }, [fitView, flowModel.nodes.length, mode, model.id]);
const exportPng = async () => {
    if (!exportRef.current) {
      return;
    }

    await fitView({ padding: 0.12, minZoom: 0.45, maxZoom: 0.95, duration: 0 });
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    const dataUrl = await toPng(exportRef.current, {
      cacheBust: true,
      pixelRatio: 2.5,
      backgroundColor: "#f6f7fb"
    });

    downloadDataUrl(dataUrl, `${safeFileName(model.title)}-${mode}.png`);
  };

  const exportSvg = async () => {
    if (!exportRef.current) {
      return;
    }

    await fitView({ padding: 0.12, minZoom: 0.45, maxZoom: 0.95, duration: 0 });
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    const dataUrl = await toSvg(exportRef.current, {
      cacheBust: true,
      backgroundColor: "#f6f7fb"
    });

    downloadDataUrl(dataUrl, `${safeFileName(model.title)}-${mode}.svg`);
  };

  return (
    <section className={`wm-vs-canvas-shell wm-vs-canvas-shell-${mode}`}>
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

      <div className={`wm-vs-canvas wm-vs-canvas-${mode}`} ref={exportRef} data-diagram-id={model.id}>
        <div className="wm-vs-canvas-stage">
          <div className="wm-vs-sheet-header" aria-hidden="true">
            <div className="wm-vs-sheet-brand">
              <span>W</span>
              <div>
                <strong>WYRESTORM</strong>
                <small>WINGMAN SYSTEM SCHEMATIC</small>
              </div>
            </div>
            <div className="wm-vs-sheet-title">
              <strong>{model.title}</strong>
              <span>{model.subtitle}</span>
            </div>
            <div className="wm-vs-sheet-number">
              <span>Drawing</span>
              <strong>{drawingNumber}</strong>
            </div>
          </div>

          <div className="wm-vs-signal-legend" aria-hidden="true">
            <span><i data-signal="video" />Video</span>
            <span><i data-signal="usb" />USB</span>
            <span><i data-signal="network" />Network</span>
            <span><i data-signal="audio" />Audio</span>
            <span><i data-signal="control" />Control</span>
          </div>

          <ReactFlow
            key={`${model.id}-${mode}`}
            nodes={flowModel.nodes}
            edges={flowModel.edges}
            defaultEdgeOptions={{ zIndex: 6 }}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.12, minZoom: 0.45, maxZoom: 0.95 }}
            minZoom={0.4}
            maxZoom={1.2}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable
            panOnScroll
          >
<Controls showInteractive={false} />
          </ReactFlow>
        </div>

        <div className="wm-vs-schematic-footer" aria-hidden="true">
          <div className="wm-vs-titleblock-brand">
            <span>Prepared by</span>
            <strong>WyreStorm Wingman</strong>
          </div>
          <div>
            <span>Client</span>
            <strong>To be confirmed</strong>
          </div>
          <div>
            <span>Project</span>
            <strong>{model.title}</strong>
          </div>
          <div>
            <span>Drawing number</span>
            <strong>{drawingNumber}</strong>
          </div>
          <div>
            <span>Issue</span>
            <strong>Rev A · {issueDate}</strong>
          </div>
          <div>
            <span>Status</span>
            <strong>{mode === "technical" ? "Technical · Review before quote" : "Customer concept · Draft"}</strong>
          </div>
        </div>
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
