import type { Node } from "@xyflow/react";
import type { WingmanFlowNodeData } from "./visualStudioDiagramFactory";
import type { VisualNodeEmphasis } from "./visualStudioTypes";

export type SchematicPageSize = "A4" | "A3";

export interface SchematicPrintLayout {
  page: SchematicPageSize;
  pageWidthMm: number;
  pageHeightMm: number;
  contentWidthMm: number;
  contentHeightMm: number;
  /** Always <= 1. Multiply onto the canvas transform so the full bounding
   * box fits the chosen page even for projects too large for A3. */
  scale: number;
}

// 96 CSS px per inch, 25.4mm per inch.
const PX_PER_MM = 96 / 25.4;
const PAGE_MARGIN_MM = 10;
const A4_LANDSCAPE_MM = { width: 297, height: 210 };
const A3_LANDSCAPE_MM = { width: 420, height: 297 };

// Matches the max-height budgets set on .wm-vs-flow-node / the
// emphasis-specific overrides in wingman-style-stack.css.
const NODE_HEIGHT_BY_EMPHASIS: Record<VisualNodeEmphasis, number> = {
  primary: 132,
  support: 122,
  compact: 108,
};

const DEFAULT_NODE_WIDTH_PX = 246;

function nodeWidthPx(node: Node<WingmanFlowNodeData>): number {
  const styleWidth = node.style?.width;

  if (typeof styleWidth === "number") {
    return styleWidth;
  }

  if (typeof styleWidth === "string") {
    const parsed = Number.parseFloat(styleWidth);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return DEFAULT_NODE_WIDTH_PX;
}

function nodeHeightPx(node: Node<WingmanFlowNodeData>): number {
  const emphasis = node.data?.emphasis as VisualNodeEmphasis | undefined;
  return NODE_HEIGHT_BY_EMPHASIS[emphasis ?? "support"] ?? NODE_HEIGHT_BY_EMPHASIS.support;
}

export function computeDiagramBoundingBoxPx(nodes: Node<WingmanFlowNodeData>[]): { width: number; height: number } {
  let maxX = 0;
  let maxY = 0;

  for (const node of nodes) {
    const right = node.position.x + nodeWidthPx(node);
    const bottom = node.position.y + nodeHeightPx(node);

    if (right > maxX) maxX = right;
    if (bottom > maxY) maxY = bottom;
  }

  return { width: maxX, height: maxY };
}

/**
 * Chooses A4 landscape when the diagram comfortably fits, A3 landscape for
 * larger projects, and always returns a scale factor that guarantees the
 * full bounding box fits the chosen page - so nothing is clipped regardless
 * of device count, even for projects too large for A3 to hold at 1:1.
 */
export function chooseSchematicPrintLayout(nodes: Node<WingmanFlowNodeData>[]): SchematicPrintLayout {
  const bbox = computeDiagramBoundingBoxPx(nodes);
  const contentWidthMm = bbox.width / PX_PER_MM;
  const contentHeightMm = bbox.height / PX_PER_MM;

  const a4Usable = {
    width: A4_LANDSCAPE_MM.width - PAGE_MARGIN_MM * 2,
    height: A4_LANDSCAPE_MM.height - PAGE_MARGIN_MM * 2,
  };
  const a3Usable = {
    width: A3_LANDSCAPE_MM.width - PAGE_MARGIN_MM * 2,
    height: A3_LANDSCAPE_MM.height - PAGE_MARGIN_MM * 2,
  };

  const fitsA4 = contentWidthMm <= a4Usable.width && contentHeightMm <= a4Usable.height;
  const page: SchematicPageSize = fitsA4 ? "A4" : "A3";
  const usable = fitsA4 ? a4Usable : a3Usable;
  const pageMm = fitsA4 ? A4_LANDSCAPE_MM : A3_LANDSCAPE_MM;

  const scale = Math.min(
    1,
    usable.width / Math.max(contentWidthMm, 1),
    usable.height / Math.max(contentHeightMm, 1),
  );

  return {
    page,
    pageWidthMm: pageMm.width,
    pageHeightMm: pageMm.height,
    contentWidthMm,
    contentHeightMm,
    scale,
  };
}
