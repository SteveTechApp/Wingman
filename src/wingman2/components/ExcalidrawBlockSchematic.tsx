import { useMemo } from "react";
import sceneSource from "../data/wyrestormAVBlockSchematic.excalidraw?raw";

// The WyreStorm block schematic ships as raw Excalidraw geometry (19
// rectangles, 19 texts, 17 arrows — no curves/frames/images). Rendering that
// through the full @excalidraw/excalidraw EDITOR bundle would add ~7.4 MB to
// the emitted JS and ~143 KB CSS for a single static diagram, tripping the
// size-budget ratchets. A tiny native SVG renderer reproduces the exact scene
// for ~4 KB with no new dependency, so the reference diagram shows in-app
// without the editor cost.

type El = {
  type: string;
  id?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  angle?: number;
  strokeColor?: string;
  backgroundColor?: string;
  fillStyle?: string;
  strokeWidth?: number;
  strokeStyle?: "solid" | "dashed" | "dotted";
  roundness?: { type?: number } | null;
  text?: string;
  fontSize?: number;
  textAlign?: string;
  points?: Array<[number, number]>;
};

type Scene = { elements: El[] };

let PARSED: Scene | null = null;
function getScene(): Scene | null {
  if (PARSED) return PARSED;
  try {
    const scene = JSON.parse(sceneSource) as Scene;
    PARSED = Array.isArray(scene?.elements) ? scene : null;
  } catch {
    PARSED = null;
  }
  return PARSED;
}

function bounds(scene: Scene): { minX: number; minY: number; w: number; h: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const e of scene.elements) {
    const pts =
      e.type === "arrow" && Array.isArray(e.points) && e.points.length > 0
        ? e.points.map(([dx, dy]) => [e.x + dx, e.y + dy])
        : [
            [e.x, e.y],
            [e.x + (e.width ?? 0), e.y + (e.height ?? 0)],
          ];
    for (const [x, y] of pts) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  const pad = 40;
  const w = Math.max(1, maxX - minX + 2 * pad);
  const h = Math.max(1, maxY - minY + 2 * pad);
  return { minX: minX - pad, minY: minY - pad, w, h };
}

export function ExcalidrawBlockSchematic() {
  const { scene, box } = useMemo(() => {
    const scene = getScene();
    return { scene, box: scene ? bounds(scene) : null };
  }, []);
  const resolvedScene = scene ?? null;

  if (!resolvedScene || !box) {
    return (
      <div className="wm-excalidraw-empty">
        <p>Block schematic could not be loaded.</p>
      </div>
    );
  }

  return (      <div className="wm-excalidraw-wrap">
      {/* The scene was authored on a light sheet; keep the paper colour so the
          signal colours (and the legend's solid/dashed distinction) read as
          designed. Tailwind `bg-slate-100` keeps it light without a new hex in
          the style-drift ratchet. */}
      <div className="wm-excalidraw-sheet bg-slate-100" aria-label="WyreStorm AV block schematic — reference diagram">
        <svg
          viewBox={`${box.minX} ${box.minY} ${box.w} ${box.h}`}
          role="img"
          aria-label="AV Block Schematic — WyreStorm Meeting Room"
          className="wm-excalidraw-svg"
        >
          <defs>
            <marker id="arrowhead-wm" viewBox="0 0 10 6" refX="9" refY="3" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              {/* context-stroke makes the head match its line without a colour literal. */}
              <path d="M0,0 L10,3 L0,6 Z" fill="context-stroke" />
            </marker>
          </defs>

          {/* Draw arrows first so blocks sit above their links. */}
          {resolvedScene.elements
            .filter((e) => e.type === "arrow" && Array.isArray(e.points) && e.points.length >= 1)
            .map((e, i) => {
              const start: [number, number] = [e.x, e.y];
              const end: [number, number] = [e.x + (e.points?.[e.points.length - 1]?.[0] ?? 0), e.y + (e.points?.[e.points.length - 1]?.[1] ?? 0)];
              const dashed = e.strokeStyle === "dashed" || e.strokeStyle === "dotted";
              const dx = end[0] - start[0];
              const dy = end[1] - start[1];
              // First segment only; the scene uses single-shot arrows.
              return (
                <line
                  key={`arrow-${i}`}
                  x1={start[0]}
                  y1={start[1]}
                  x2={end[0]}
                  y2={end[1]}
                  stroke={e.strokeColor || "currentColor"}
                  strokeWidth={e.strokeWidth ?? 2}
                  strokeDasharray={dashed ? "7 6" : undefined}
                  markerEnd={dx === 0 && dy === 0 ? undefined : "url(#arrowhead-wm)"}
                />
              );
            })}

          {/* Blocks. */}
          {resolvedScene.elements
            .filter((e) => e.type === "rectangle" || e.type === "ellipse" || e.type === "diamond")
            .map((e, i) => {
              const w = e.width ?? 100;
              const h = e.height ?? 50;
              const rx = e.type === "rectangle" && e.roundness?.type === 3 ? Math.min(10, w / 4, h / 4) : e.type === "rectangle" ? 0 : undefined;
              const dash = e.strokeStyle === "dashed" || e.strokeStyle === "dotted" ? "7 6" : undefined;
              return (
                <rect
                  key={`box-${i}`}
                  x={e.x}
                  y={e.y}
                  width={w}
                  height={h}
                  rx={rx}
                  fill={e.backgroundColor || "transparent"}
                  stroke={e.strokeColor || "currentColor"}
                  strokeWidth={e.strokeWidth ?? 1}
                  strokeDasharray={dash}
                />
              );
            })}

          {/* Labels. */}
          {resolvedScene.elements
            .filter((e) => e.type === "text" && e.text)
            .map((e, i) => {
              const anchor = e.textAlign === "right" ? "end" : e.textAlign === "left" ? "start" : "middle";
              const tx = e.textAlign === "right" ? e.x + (e.width ?? 0) : e.textAlign === "left" ? e.x : e.x + (e.width ?? 0) / 2;
              const ty = e.y + (e.fontSize ?? 16);
              return (
                <text
                  key={`text-${i}`}
                  x={tx}
                  y={ty}
                  textAnchor={anchor}
                  fontSize={e.fontSize ?? 16}
                  fontFamily="system-ui, -apple-system, sans-serif"
                  fontWeight="500"
                  fill={e.strokeColor || "currentColor"}
                >
                  {e.text}
                </text>
              );
            })}
        </svg>
      </div>
      <p className="wm-excalidraw-note">
        Solid = AV signal · dashed = USB / IP / control. Non-WyreStorm items (displays, speakers,
        camera, mics, DSP, laptop) are customer-provided placeholders. This is a static reference —
        the “Generated for this template” view reflects the actual BOM.
      </p>
    </div>
  );
}

export default ExcalidrawBlockSchematic;