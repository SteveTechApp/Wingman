import type { WallRequirements } from "../lib/videowallOptions";

export function VideowallPreview({ requirements: r }: { requirements: WallRequirements }) {
  const lcd = r.application.startsWith("lcd");
  const columns = Math.max(1, Math.min(16, Math.floor(r.columns) || 1));
  const rows = Math.max(1, Math.min(16, Math.floor(r.rows) || 1));
  const count = r.layout === "independent" ? columns * rows : Math.max(1, Math.min(16, Math.floor(r.windows) || 1));
  const cells = r.layout === "independent" ? columns : Math.ceil(Math.sqrt(count));
  return <figure className="vw-builder-preview">
    <svg className="vw-builder-preview__canvas" viewBox={`0 0 1600 ${lcd ? 1600 * rows * (r.orientation === "portrait" ? 16 : 9) / (columns * (r.orientation === "portrait" ? 9 : 16)) : 900}`} role="img" aria-label="Conceptual source layout and display panel boundaries">
      {(() => {
        const height = lcd ? 1600 * rows * (r.orientation === "portrait" ? 16 : 9) / (columns * (r.orientation === "portrait" ? 9 : 16)) : 900;
        const sourceRows = Math.ceil(count / cells);
        return <>
          {Array.from({ length: count }, (_, i) => <g key={i}>
            <rect x={(i % cells) * 1600 / cells} y={Math.floor(i / cells) * height / sourceRows} width={1600 / cells} height={height / sourceRows} fill={`hsl(${174 + i * 27} 48% 25%)`} />
            <text x={(i % cells + .5) * 1600 / cells} y={(Math.floor(i / cells) + .5) * height / sourceRows} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={Math.min(40, 700 / cells)}>Source {(i % Math.max(1, r.sources)) + 1}</text>
          </g>)}
          {lcd && Array.from({ length: columns * rows }, (_, i) => <rect key={i} x={(i % columns) * 1600 / columns} y={Math.floor(i / columns) * height / rows} width={1600 / columns} height={height / rows} fill="none" stroke="white" strokeWidth="3" />)}
        </>;
      })()}
    </svg>
    <figcaption>{lcd ? `${columns} × ${rows} LCD array · ${r.application === "lcd-loop" ? "one shared canvas, panel-owned tiling" : "separate feed per panel"}` : r.application === "led" ? "Composed feed before LED mapping" : "One projector · switchable content layout"}. Concept preview only; device presets and aspect-ratio fitting must be confirmed.{r.layout === "custom" ? " Custom windows are shown as a count preview, not an exact placement." : ""}</figcaption>
  </figure>;
}
