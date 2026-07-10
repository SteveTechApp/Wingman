import { memo, useMemo, useRef } from "react";
import {
  Background,
  Controls,
  Handle,
  MiniMap,
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
import TechnicalConnectivitySchematic from "./TechnicalConnectivitySchematic";
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

function ProductConnectivityDiagram({
  model,
  mode,
}: VisualStudioCanvasProps) {
  const product =
    model.nodes.find((node) => node.id === "wyrestorm-product") ??
    model.nodes.find((node) => node.emphasis === "primary");

  const sources = model.nodes.filter((node) =>
    [
      "generic-video-sources",
      "generic-usb-host",
      "generic-source-tbc",
    ].includes(node.id),
  );

  const destinations = model.nodes.filter((node) =>
    [
      "generic-video-destinations",
      "generic-usb-device",
      "generic-destination-tbc",
    ].includes(node.id),
  );

  const services = model.nodes.filter((node) =>
    [
      "generic-audio-system",
      "generic-network",
      "generic-control-system",
    ].includes(node.id),
  );

  const edgeFor = (nodeId: string) =>
    model.edges.find(
      (edge) => edge.source === nodeId || edge.target === nodeId,
    );

  const renderEquipment = (
    node: (typeof model.nodes)[number],
    role: "source" | "product" | "destination" | "service",
  ) => {
    const edge = edgeFor(node.id);

    return (
      <article
        key={node.id}
        className={`wm-vs-connectivity-device wm-vs-connectivity-device-${role} wm-vs-connectivity-kind-${node.kind}`}
      >
        <div className="wm-vs-connectivity-device-header">
          <span>
            {role === "product"
              ? "WyreStorm product"
              : role === "source"
                ? "Generic source equipment"
                : role === "destination"
                  ? "Generic destination equipment"
                  : "Generic supporting equipment"}
          </span>

          <strong>
            {role === "product"
              ? "WYRESTORM"
              : "THIRD-PARTY"}
          </strong>
        </div>

        <h3>{node.label}</h3>

        {node.subtitle ? <p>{node.subtitle}</p> : null}

        {mode === "technical" && edge?.label ? (
          <div className="wm-vs-connectivity-port-label">
            {edge.label}
          </div>
        ) : null}

        <div className="wm-vs-connectivity-status">
          <span aria-hidden="true" />
          {node.status === "missing"
            ? "Connection to be confirmed"
            : node.status === "recommended"
              ? "Selected WyreStorm product"
              : "Generic external equipment"}
        </div>
      </article>
    );
  };

  if (!product) {
    return (
      <div className="wm-vs-connectivity-empty">
        <strong>Connectivity diagram unavailable</strong>
        <p>
          The selected product does not yet contain enough governed
          connectivity information to build this drawing.
        </p>
      </div>
    );
  }

  return (
    <div className="wm-vs-connectivity-diagram">
      <div className="wm-vs-connectivity-column wm-vs-connectivity-sources">
        <div className="wm-vs-connectivity-column-title">
          <span>01</span>
          <div>
            <strong>Source equipment</strong>
            <small>Generic third-party devices</small>
          </div>
        </div>

        <div className="wm-vs-connectivity-stack">
          {sources.map((node) => renderEquipment(node, "source"))}
        </div>
      </div>

      <div className="wm-vs-connectivity-main-path" aria-hidden="true">
        <span />
        <b>Signal into WyreStorm</b>
        <i />
      </div>

      <div className="wm-vs-connectivity-column wm-vs-connectivity-product">
        <div className="wm-vs-connectivity-column-title">
          <span>02</span>
          <div>
            <strong>Signal processing and routing</strong>
            <small>Governed WyreStorm product</small>
          </div>
        </div>

        {renderEquipment(product, "product")}
      </div>

      <div className="wm-vs-connectivity-main-path wm-vs-connectivity-main-path-output" aria-hidden="true">
        <span />
        <b>Signal from WyreStorm</b>
        <i />
      </div>

      <div className="wm-vs-connectivity-column wm-vs-connectivity-destinations">
        <div className="wm-vs-connectivity-column-title">
          <span>03</span>
          <div>
            <strong>Destination equipment</strong>
            <small>Generic third-party devices</small>
          </div>
        </div>

        <div className="wm-vs-connectivity-stack">
          {destinations.map((node) =>
            renderEquipment(node, "destination"),
          )}
        </div>
      </div>

      {services.length > 0 ? (
        <section className="wm-vs-connectivity-services">
          <div className="wm-vs-connectivity-service-branch" aria-hidden="true">
            <span />
            <strong>Supporting connections</strong>
          </div>

          <div className="wm-vs-connectivity-service-grid">
            {services.map((node) => renderEquipment(node, "service"))}
          </div>
        </section>
      ) : null}

      <div className="wm-vs-connectivity-note">
        Generic boxes represent equipment outside WyreStorm supply.
        Exact third-party manufacturers and models are project-specific.
      </div>
    </div>
  );
}
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
        void fitView({ padding: 0.08, minZoom: 0.55, maxZoom: 1.12, duration: 0 });
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

    await fitView({ padding: 0.08, minZoom: 0.55, maxZoom: 1.12, duration: 0 });
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

    await fitView({ padding: 0.08, minZoom: 0.55, maxZoom: 1.12, duration: 0 });
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
        <div
            className={`wm-vs-canvas-stage ${
              model.kind === "product-connection"
                ? "wm-vs-canvas-stage-product-connection"
                : ""
            }`}
          >
            {model.kind === "product-connection" ? (
              mode === "technical" ? (
                <TechnicalConnectivitySchematic model={model} />
              ) : (
                <ProductConnectivityDiagram model={model} mode={mode} />
              )
            ) : null}
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
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.08, maxZoom: 1.12, minZoom: 0.55 }}
            minZoom={0.45}
            maxZoom={1.8}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable
            panOnScroll
          >
            <Background gap={24} size={1} />
            <MiniMap pannable zoomable />
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
