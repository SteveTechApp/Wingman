
import React, { useEffect, useState } from "react";
import PageShell from "@/components/layout/PageShell";
import { useNavigate } from "react-router-dom";
import { getActiveProject, subscribeProjects } from "@/state/app/projectsStore";

export default function WorkspaceHomePage() {
  const nav = useNavigate();
  const [tick, setTick] = useState(0);

  useEffect(() => { return subscribeProjects(() => setTick(t => t + 1)); }, []);
  const p = getActiveProject();

  return (
    <PageShell>
      <div className="wm-page" style={{ display: "grid", gap: 12 }}>
      <div>
        <div style={{ fontWeight: 900, fontSize: 18 }}>Workspace</div>
        <div style={{ opacity: 0.75, fontSize: 12 }}>
          Active project drives tools, BOM, and outputs.
        </div>
      </div>

      <div style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.03)" }}>
        <div style={{ fontSize: 11, opacity: 0.7 }}>ACTIVE PROJECT</div>
        <div style={{ fontWeight: 900, fontSize: 14, marginTop: 6 }}>{p?.name ?? "None"}</div>
        <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>{p?.id ?? ""}</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
        <div style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.03)" }}>
          <div style={{ fontWeight: 850, fontSize: 13 }}>Start Point</div>
          <div style={{ opacity: 0.75, fontSize: 12, marginTop: 6 }}>
            Next: wire Template Browser and Wizard to write into project state.
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => nav("/app")}
              style={{
                height: 30,
                padding: "0 10px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.05)",
                color: "inherit",
                cursor: "pointer",
                fontWeight: 800,
                fontSize: 12,
              }}
            >
              Dashboard
            </button>
            <button
              type="button"
              onClick={() => nav("/app/projects")}
              style={{
                height: 30,
                padding: "0 10px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.05)",
                color: "inherit",
                cursor: "pointer",
                fontWeight: 800,
                fontSize: 12,
              }}
            >
              Projects
            </button>
          </div>
        </div>

        <div style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.03)" }}>
          <div style={{ fontWeight: 850, fontSize: 13 }}>Outputs</div>
          <div style={{ opacity: 0.75, fontSize: 12, marginTop: 6 }}>
            Next: BOM (Bronze/Silver/Gold), signal flow summary, proposal export.
          </div>
        </div>
      </div>
    </div>
    </PageShell>
  );
}




