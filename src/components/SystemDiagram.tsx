import * as React from "react";
import { useNavigate } from "react-router-dom";

type Props = {
  diagram?: unknown;
};

function countDiagramNodes(diagram: unknown): number {
  if (!diagram || typeof diagram !== "object") return 0;
  const nodes = (diagram as { nodes?: unknown }).nodes;
  return Array.isArray(nodes) ? nodes.length : 0;
}

function countDiagramEdges(diagram: unknown): number {
  if (!diagram || typeof diagram !== "object") return 0;
  const edges = (diagram as { edges?: unknown }).edges;
  return Array.isArray(edges) ? edges.length : 0;
}

export default function SystemDiagram(props: Props) {
  const navigate = useNavigate();
  const nodeCount = countDiagramNodes(props.diagram);
  const edgeCount = countDiagramEdges(props.diagram);

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
      <div className="font-medium">System Diagram</div>
      <div className="mt-1 opacity-80">
        Diagram output is available via Block Diagram and Design Review tools.
      </div>
      <div className="mt-2 opacity-80">
        Current summary: {nodeCount} node(s), {edgeCount} connection(s).
      </div>
      <div className="mt-3 flex gap-2">
        <button type="button" className="wm-btn" onClick={() => navigate("/app/tools/block-diagram")}>
          Open Block Diagram
        </button>
        <button type="button" className="wm-btn" onClick={() => navigate("/app/tools/design-review")}>
          Open Design Review
        </button>
      </div>
    </div>
  );
}

