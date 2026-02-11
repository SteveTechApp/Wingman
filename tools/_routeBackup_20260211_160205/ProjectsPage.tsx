
import React, { useEffect, useMemo, useState } from "react";
import PageShell from "@/components/layout/PageShell";
import { useNavigate } from "react-router-dom";
import {
  createProject,
  deleteProject,
  getProjectsState,
  renameProject,
  setActiveProject,
  subscribeProjects,
} from "@/state/projectsStore";

export default function ProjectsPage() {
  const nav = useNavigate();
  const [tick, setTick] = useState(0);
  const [name, setName] = useState("");

  useEffect(() => { return subscribeProjects(() => setTick(t => t + 1)); }, []);
  const s = useMemo(() => getProjectsState(), [tick]);

  return (
  <PageShell>
  <div className="wm-page" style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 18 }}>Projects</div>
          <div style={{ opacity: 0.75, fontSize: 12 }}>Create or select a project to enter the workspace.</div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New project name"
            style={{
              height: 34,
              padding: "0 10px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.05)",
              color: "inherit",
              outline: "none",
              width: 240,
            }}
          />
          <button
            type="button"
            onClick={() => {
              const p = createProject(name);
              setName("");
              nav("/projects/" + p.id);
            }}
            style={{
              height: 34,
              padding: "0 12px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(0,160,120,0.18)",
              color: "inherit",
              cursor: "pointer",
              fontWeight: 800,
              fontSize: 12,
            }}
          >
            Create
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {s.projects.length === 0 ? (
          <div style={{ opacity: 0.75, fontSize: 12, padding: 12, border: "1px dashed rgba(255,255,255,0.18)", borderRadius: 12 }}>
            No projects yet. Create one to start.
          </div>
        ) : (
          s.projects.map((p) => {
            const isActive = s.activeProjectId === p.id;
            return (
  <PageShell>
  <div className="wm-page"
                key={p.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 10,
                  padding: 12,
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: isActive ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
                }}
              >
                <div style={{ display: "grid", gap: 6 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 900, fontSize: 14 }}>{p.name}</div>
                    {isActive && <div style={{ fontSize: 11, opacity: 0.8 }}>(active)</div>}
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.7 }}>
                    Updated: {new Date(p.updatedAt).toLocaleString()}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveProject(p.id);
                        nav("/projects/" + p.id);
                      }}
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
                      Open
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveProject(p.id);
                        nav("/app/dashboard");
                      }}
                      style={{
                        height: 30,
                        padding: "0 10px",
                        borderRadius: 10,
                        border: "1px solid rgba(255,255,255,0.14)",
                        background: "rgba(110,140,255,0.14)",
                        color: "inherit",
                        cursor: "pointer",
                        fontWeight: 800,
                        fontSize: 12,
                      }}
                    >
                      Go Workspace
                    </button>
                  </div>
                </div>

                <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
                  <button
                    type="button"
                    onClick={() => {
                      const next = prompt("Rename project:", p.name);
                      if (next !== null) renameProject(p.id, next);
                    }}
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
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("Delete project?")) deleteProject(p.id);
                    }}
                    style={{
                      height: 30,
                      padding: "0 10px",
                      borderRadius: 10,
                      border: "1px solid rgba(255,255,255,0.14)",
                      background: "rgba(255,80,90,0.12)",
                      color: "inherit",
                      cursor: "pointer",
                      fontWeight: 800,
                      fontSize: 12,
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
  </PageShell>
);
          })
        )}
      </div>
    </div>
  </PageShell>
);
}




