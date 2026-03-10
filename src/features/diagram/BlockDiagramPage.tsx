import * as React from "react";
import { useNavigate } from "react-router-dom";
import { buildDesignBundle } from "@/features/systemDesign/cableScheduleEngine";
import { buildDiagramLayout } from "@/features/diagram/diagramSvg";
import { readDesignSeeds } from "@/features/systemDesign/designSeed";
import { writeDesignBundle } from "@/features/systemDesign/designBundleStore";

const styles = `
.wm-diagram{ padding:12px 16px 16px; }
.wm-diagram__stack{ display:grid; gap:12px; }
.wm-diagram__hero{
  display:grid; grid-template-columns:minmax(0,1fr) auto; gap:12px; align-items:start;
  padding:14px 16px; border-radius:18px; border:1px solid rgba(110,145,190,0.16);
  background:
    radial-gradient(circle at top right, rgba(25,83,173,0.16), transparent 36%),
    radial-gradient(circle at left center, rgba(34,199,184,0.10), transparent 30%),
    linear-gradient(180deg, rgba(13,22,37,0.96), rgba(7,13,24,0.96));
}
.wm-diagram__eyebrow{ margin:0 0 4px; color:#66eadb; font-size:.78rem; font-weight:700; letter-spacing:.05em; text-transform:uppercase; }
.wm-diagram__title{ margin:0; font-size:1.7rem; line-height:1.02; font-weight:700; letter-spacing:-.02em; }
.wm-diagram__subtitle{ margin:6px 0 0; color:rgba(232,241,255,0.74); font-size:.92rem; line-height:1.32; max-width:80ch; }
.wm-diagram__card{ padding:16px 18px; border-radius:18px; border:1px solid rgba(110,145,190,0.16); background:linear-gradient(180deg, rgba(13,22,37,0.94), rgba(7,13,24,0.94)); }
.wm-diagram__svgWrap{ overflow:auto; margin-top:12px; }
.wm-diagram__legend{ display:flex; gap:8px; flex-wrap:wrap; margin-top:12px; }
.wm-diagram__chip{ display:inline-flex; align-items:center; min-height:28px; padding:0 10px; border-radius:999px; border:1px solid rgba(110,145,190,0.16); background:rgba(255,255,255,0.05); font-size:.78rem; font-weight:700; }
@media (max-width:900px){ .wm-diagram__hero{ grid-template-columns:1fr; } }
`;

type NodePos = { id: string; x: number; y: number; label: string; kind: string };


function roleColor(kind: string) {
  switch (kind) {
    case "source": return "rgba(96,165,250,0.28)";
    case "switcher": return "rgba(34,197,94,0.24)";
    case "processor": return "rgba(251,191,36,0.24)";
    case "network": return "rgba(168,85,247,0.24)";
    case "display": return "rgba(244,114,182,0.24)";
    case "audio": return "rgba(45,212,191,0.24)";
    case "control": return "rgba(148,163,184,0.24)";
    default: return "rgba(255,255,255,0.12)";
  }
}

export default function BlockDiagramPage() {
  const nav = useNavigate();
  const seeds = React.useMemo(() => readDesignSeeds(), []);
  const bundle = React.useMemo(() => buildDesignBundle(seeds.discovery, seeds.template, seeds.videoWall), [seeds]);

  const positions = React.useMemo<NodePos[]>(() => {
    return buildDiagramLayout(bundle.nodes) as NodePos[];
  }, [bundle.nodes]);

  const posMap = React.useMemo(() => Object.fromEntries(positions.map((p) => [p.id, p])), [positions]);
  React.useEffect(() => {
    writeDesignBundle(bundle);
  }, [bundle]);

  const width = 1040;
  const height = Math.max(420, (Math.max(1, ...positions.map((p) => p.y)) + 120));

  return (
    <div className="wm-diagram">
      <style>{styles}</style>

      <div className="wm-diagram__stack">
        <section className="wm-diagram__hero">
          <div>
            <div className="wm-diagram__eyebrow">Block Diagram</div>
            <h1 className="wm-diagram__title">System interconnectivity view</h1>
            <div className="wm-diagram__subtitle">
              A structured visual built from the same device and cable graph used by the cable schedule. This is the right foundation for later SVG / PNG export.
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="wm-btn" style={{ height: 40, padding: "0 16px" }} onClick={() => nav("/app/tools/cable-schedule")}>
              Cable Schedule
            </button>
            <button type="button" className="wm-btn" style={{ height: 40, padding: "0 16px" }} onClick={() => nav("/app/tools/proposal-builder")}>
              Proposal
            </button>
          </div>
        </section>

        <section className="wm-diagram__card">
          <div style={{ fontWeight: 900, fontSize: 16 }}>Diagram preview</div>
          <div className="wm-diagram__legend">
            <span className="wm-diagram__chip">Sources</span>
            <span className="wm-diagram__chip">Core / Network / Processor</span>
            <span className="wm-diagram__chip">USB / Audio / Control</span>
            <span className="wm-diagram__chip">Displays</span>
          </div>

          <div className="wm-diagram__svgWrap">
            <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
              {bundle.edges.map((edge) => {
                const a = posMap[edge.source];
                const b = posMap[edge.target];
                if (!a || !b) return null;
                const x1 = a.x + 90;
                const y1 = a.y + 26;
                const x2 = b.x;
                const y2 = b.y + 26;
                return (
                  <g key={edge.id}>
                    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.38)" strokeWidth="2" />
                    <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 6} fill="rgba(255,255,255,0.72)" fontSize="11" textAnchor="middle">
                      {edge.signalType}
                    </text>
                  </g>
                );
              })}

              {positions.map((node) => (
                <g key={node.id}>
                  <rect
                    x={node.x}
                    y={node.y}
                    rx="12"
                    ry="12"
                    width="180"
                    height="52"
                    fill={roleColor(node.kind)}
                    stroke="rgba(255,255,255,0.16)"
                  />
                  <text x={node.x + 90} y={node.y + 23} textAnchor="middle" fill="rgba(255,255,255,0.94)" fontSize="13" fontWeight="700">
                    {node.label}
                  </text>
                  <text x={node.x + 90} y={node.y + 39} textAnchor="middle" fill="rgba(255,255,255,0.62)" fontSize="11">
                    {node.kind}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </section>
      </div>
    </div>
  );
}