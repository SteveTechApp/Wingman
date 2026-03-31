import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { WM_ROUTES } from "@/core/wingman/routeMap";
import { loadActiveProjectSnapshot } from "@/app/logic/wingmanProjectState";
import { buildTieredBom } from "@/app/logic/wingmanBomBuilder";
import WingmanToolFrame from "@/components/layout/WingmanToolFrame";

type WallType = "LCD Video Wall" | "LED Wall";
type DriveMode = "Single canvas" | "Multiview canvas" | "Addressed panels";

export default function VideoWallPlannerRebuild() {
  const navigate = useNavigate();
  const snapshot = useMemo(() => loadActiveProjectSnapshot(), []);

  const [wallType, setWallType] = useState<WallType>("LCD Video Wall");
  const [rows, setRows] = useState(2);
  const [cols, setCols] = useState(2);
  const [sources, setSources] = useState(1);
  const [driveMode, setDriveMode] = useState<DriveMode>("Single canvas");
  const [tier, setTier] = useState<"Bronze" | "Silver" | "Gold">("Silver");

  useEffect(() => {
    if (!snapshot) return;

    const d = snapshot.project.discovery;

    if (d.videoWall) {
      const displays = d.displays || 4;
      const r = Math.max(1, Math.round(Math.sqrt(displays)));
      const c = Math.ceil(displays / r);

      setRows(r);
      setCols(c);
      setSources(d.sources || 1);

      if (d.advancedMultiview) {
        setDriveMode("Multiview canvas");
      }
    }
  }, [snapshot]);

  const displays = rows * cols;

  const architecture = useMemo(() => {
    if (wallType === "LED Wall") return "LED Processor System";

    if (driveMode === "Single canvas" && displays <= 6 && sources <= 2) {
      return "Video Wall Processor";
    }

    return "AV over IP Video Wall";
  }, [wallType, driveMode, displays, sources]);

  const bom = useMemo(() => {
    return buildTieredBom(architecture, tier, {
      sources,
      displays,
    });
  }, [architecture, tier, sources, displays]);

  return (
    <WingmanToolFrame
      title="Video Wall Planner"
      subtitle="Define wall behaviour before selecting products"
      steps={[
        { title: "Define wall", copy: "Size, layout, sources" },
        { title: "Select behaviour", copy: "Canvas vs multiview" },
        { title: "Confirm solution", copy: "Processor vs AVoIP" },
      ]}
    >

      {/* LEFT PANEL */}
      <aside className="wm-surface-card" style={{ padding: 16, display: "grid", gap: 12 }}>

        <div className="wm-section-title">Wall Setup</div>

        <div className="wm-surface-card--soft" style={{ padding: 12 }}>
          <div>Wall Type</div>
          <div className="wm-toolbar-row">
            {["LCD Video Wall","LED Wall"].map(t => (
              <button
                key={t}
                className={`wm-chip ${wallType === t ? "wm-chip--active" : ""}`}
                onClick={() => setWallType(t as WallType)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="wm-surface-card--soft" style={{ padding: 12 }}>
          <div>Wall Size</div>
          <div className="wm-grid-2">
            <input type="number" value={rows} onChange={e => setRows(Number(e.target.value))} />
            <input type="number" value={cols} onChange={e => setCols(Number(e.target.value))} />
          </div>
        </div>

        <div className="wm-surface-card--soft" style={{ padding: 12 }}>
          <div>Sources</div>
          <input type="number" value={sources} onChange={e => setSources(Number(e.target.value))} />
        </div>

        <div className="wm-surface-card--soft" style={{ padding: 12 }}>
          <div>Drive Mode</div>
          <div className="wm-toolbar-row">
            {["Single canvas","Multiview canvas","Addressed panels"].map(m => (
              <button
                key={m}
                className={`wm-chip ${driveMode === m ? "wm-chip--active" : ""}`}
                onClick={() => setDriveMode(m as DriveMode)}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="wm-surface-card--soft" style={{ padding: 12 }}>
          <div>Solution Tier</div>
          <div className="wm-toolbar-row">
            {["Bronze","Silver","Gold"].map(t => (
              <button
                key={t}
                className={`wm-chip ${tier === t ? "wm-chip--active" : ""}`}
                onClick={() => setTier(t as any)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

      </aside>

      {/* RIGHT PANEL */}
      <section className="wm-surface-card" style={{ padding: 16, display: "grid", gap: 12 }}>

        <div className="wm-section-title">Solution Output</div>

        <div className="wm-product-card">
          <div className="wm-product-card__sku">Architecture</div>
          <div className="wm-product-card__title">{architecture}</div>
          <div className="wm-product-card__copy">
            {wallType === "LED Wall"
              ? "LED walls require processor-led architecture."
              : architecture === "Video Wall Processor"
                ? "Simplest and most cost-effective for fixed layouts."
                : "AVoIP provides scalability, flexibility and multiview capability."}
          </div>
        </div>

        <div className="wm-product-card">
          <div className="wm-product-card__sku">System Size</div>
          <div className="wm-product-card__title">{rows} x {cols}</div>
          <div className="wm-product-card__copy">{displays} displays / {sources} sources</div>
        </div>

        <div className="wm-product-card">
          <div className="wm-product-card__sku">BOM ({tier})</div>

          {bom.length > 0 ? (
            bom.map((item, i) => (
              <div key={i} className="wm-bom-row">
                <strong>{item.sku}</strong> - Qty {item.qty}
              </div>
            ))
          ) : (
            <div>No BOM generated</div>
          )}
        </div>

        <div className="wm-toolbar-row">
          <button className="wm-btn-secondary" onClick={() => navigate(WM_ROUTES.catalog)}>
            Open Catalogue
          </button>

          <button className="wm-btn-primary" onClick={() => navigate(WM_ROUTES.proposal)}>
            Build Proposal
          </button>
        </div>

      </section>

    </WingmanToolFrame>
  );
}