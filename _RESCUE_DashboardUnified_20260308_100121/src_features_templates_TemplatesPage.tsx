import * as React from "react";
import { useNavigate } from "react-router-dom";
import { TEMPLATE_SEEDS, writeTemplateSeed } from "./templateCatalog";
import type { TemplateSeed } from "@/features/systemDesign/designTypes";
import { saveTemplateSeedToProject } from "@/features/systemDesign/designProjectBridge";

const styles = `
.wm-templates{
  padding: 12px 16px 16px;
}
.wm-templates__stack{ display:grid; gap:12px; }
.wm-templates__hero{
  display:grid; grid-template-columns:minmax(0,1fr) auto; gap:12px; align-items:start;
  padding:14px 16px; border-radius:18px;
  border:1px solid rgba(110,145,190,0.16);
  background:
    radial-gradient(circle at top right, rgba(25,83,173,0.16), transparent 36%),
    radial-gradient(circle at left center, rgba(34,199,184,0.10), transparent 30%),
    linear-gradient(180deg, rgba(13,22,37,0.96), rgba(7,13,24,0.96));
}
.wm-templates__eyebrow{
  margin:0 0 4px; color:#66eadb; font-size:.78rem; font-weight:700; letter-spacing:.05em; text-transform:uppercase;
}
.wm-templates__title{ margin:0; font-size:1.7rem; line-height:1.02; font-weight:700; letter-spacing:-.02em; }
.wm-templates__subtitle{ margin:6px 0 0; color:rgba(232,241,255,0.74); font-size:.92rem; line-height:1.32; max-width:76ch; }
.wm-templates__grid{ display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:12px; }
.wm-templates__card{
  padding:16px; border-radius:18px; border:1px solid rgba(110,145,190,0.16);
  background: linear-gradient(180deg, rgba(13,22,37,0.94), rgba(7,13,24,0.94));
}
.wm-templates__chip{
  display:inline-flex; min-height:28px; align-items:center; padding:0 10px; border-radius:999px;
  border:1px solid rgba(110,145,190,0.16); background:rgba(255,255,255,0.05); font-size:.78rem; font-weight:700;
}
.wm-templates__chips{ display:flex; flex-wrap:wrap; gap:8px; margin-top:10px; }
.wm-templates__actions{ display:flex; gap:8px; flex-wrap:wrap; margin-top:14px; }
@media (max-width:900px){
  .wm-templates__hero{ grid-template-columns:1fr; }
}
`;

export default function TemplatesPage() {
  const nav = useNavigate();
  const [selected, setSelected] = React.useState<string>("");

  function applyTemplate(seed: TemplateSeed) {
    writeTemplateSeed(seed);
    saveTemplateSeedToProject(seed);
    setSelected(seed.id);
  }

  return (
    <div className="wm-templates">
      <style>{styles}</style>

      <div className="wm-templates__stack">
        <section className="wm-templates__hero">
          <div>
            <div className="wm-templates__eyebrow">Templates</div>
            <h1 className="wm-templates__title">Project starting points</h1>
            <div className="wm-templates__subtitle">
              Choose a room archetype to seed assumptions, starter devices, and a likely WyreStorm solution direction.
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="wm-btn" style={{ height: 40, padding: "0 16px" }} onClick={() => nav("/app/tools")}>
              Tool Hub
            </button>
            <button type="button" className="wm-btn wm-btn-primary" style={{ height: 40, padding: "0 16px" }} onClick={() => nav("/app/tools/discovery")}>
              Discovery
            </button>
          </div>
        </section>

        <section className="wm-templates__grid">
          {TEMPLATE_SEEDS.map((seed) => (
            <section key={seed.id} className="wm-templates__card">
              <div style={{ fontWeight: 900, fontSize: 18 }}>{seed.name}</div>
              <div style={{ marginTop: 6, color: "rgba(255,255,255,0.8)", fontSize: 14, lineHeight: 1.45 }}>
                {seed.vertical} / {seed.roomType}
              </div>

              <div className="wm-templates__chips">
                {seed.defaultFamilies.map((family) => (
                  <span key={family} className="wm-templates__chip">{family}</span>
                ))}
              </div>

              <div style={{ marginTop: 12, fontSize: 13, color: "rgba(255,255,255,0.86)", lineHeight: 1.5 }}>
                {seed.assumptions.map((x) => `â€¢ ${x}`).join("\n")}
              </div>

              <div className="wm-templates__actions">
                <button
                  type="button"
                  className="wm-btn wm-btn-primary"
                  style={{ height: 38, padding: "0 14px" }}
                  onClick={() => applyTemplate(seed)}
                >
                  {selected === seed.id ? "Applied" : "Apply template"}
                </button>

                <button
                  type="button"
                  className="wm-btn"
                  style={{ height: 38, padding: "0 14px" }}
                  onClick={() => {
                    applyTemplate(seed);
                    nav("/app/tools/discovery");
                  }}
                >
                  Apply + open Discovery
                </button>
              </div>
            </section>
          ))}
        </section>
      </div>
    </div>
  );
}