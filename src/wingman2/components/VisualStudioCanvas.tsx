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
          <ReactFlow
            nodes={flowModel.nodes}
            edges={flowModel.edges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.11, maxZoom: 1.02, minZoom: 0.72 }}
            minZoom={0.52}
            maxZoom={1.9}
            nodesDraggable
            nodesConnectable={false}
            elementsSelectable
          >
            <Background gap={28} size={1} />
            <MiniMap pannable zoomable />
            <Controls />
          </ReactFlow>
        </div>

        <div className="wm-vs-schematic-footer" aria-hidden="true">
          <div>
            <span>Client</span>
            <strong>Wingman</strong>
          </div>
          <div>
            <span>Project</span>
            <strong>{model.title}</strong>
          </div>
          <div>
            <span>View</span>
            <strong>{mode === "technical" ? "Technical schematic" : "Customer concept"}</strong>
          </div>
          <div>
            <span>Diagram</span>
            <strong>{model.subtitle}</strong>
          </div>
          <div>
            <span>Status</span>
            <strong>Review before quote</strong>
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
