
import React, { useEffect, useMemo, useState } from "react";
import PageShell from "@/components/layout/PageShell";
import { useNavigate, useParams } from "react-router-dom";
import {
  getProjectsState,
  setActiveProject,
  subscribeProjects,
} from "@/state/projectsStore";

export default function ProjectOverviewPage() {
  const nav = useNavigate();
  const { id } = useParams();
  const [tick, setTick] = useState(0);

  useEffect(() => { return subscribeProjects(() => setTick(t => t + 1)); }, []);
  const s = useMemo(() => getProjectsState(), [tick]);
  const p = s.projects.find(x => x.id === id) ?? null;

  useEffect(() => {
    if (p) setActiveProject(p.id);
  }, [p?.id]);

  if (!p) {
    return (
    <PageShell>
      <div className="wm-page" style={{ display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 900, fontSize: 16 }}>Project not found</div>
        <button
          type="button"
          onClick={() => nav("/projects")}
          style={{
            height: 34,
            width: 180,
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.05)",
            color: "inherit",
            cursor: "pointer",
            fontWeight: 800,
            fontSize: 12,
          }}
        >
          Back to Projects
        </button>
      </div>
    </PageShell>
  );
  }

  return (
    <PageShell>
      <div className="wm-page" style={{ display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 900, fontSize: 16 }}>Project not found</div>
        <button
          type="button"
          onClick={() => nav("/projects")}
          style={{
            height: 34,
            width: 180,
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.05)",
            color: "inherit",
            cursor: "pointer",
            fontWeight: 800,
            fontSize: 12,
          }}
        >
          Back to Projects
        </button>
      </div>
    </PageShell>
  );
}




