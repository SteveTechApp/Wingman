import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  createProject,
  deleteProject,
  loadProjects,
  subscribeProjects,
  type StoredProject,
} from "@/features/projects/projectStore";

function matchesQuery(project: StoredProject, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const haystack = [
    project.name,
    project.customer,
    project.site,
    project.roomName,
    project.stage,
    project.status,
    project.notes,
    project.id,
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(q);
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString();
}

export default function ProjectsPage() {
  const nav = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [projects, setProjects] = React.useState<StoredProject[]>(() => loadProjects());
  const query = searchParams.get("q") ?? "";
  const selectedId = searchParams.get("projectId") ?? "";

  React.useEffect(() => {
    const refresh = () => setProjects(loadProjects());
    const unsubscribe = subscribeProjects(refresh);
    refresh();
    return unsubscribe;
  }, []);

  const filtered = React.useMemo(
    () => projects.filter((project) => matchesQuery(project, query)),
    [projects, query]
  );

  const selected = React.useMemo(
    () => filtered.find((project) => project.id === selectedId) ?? filtered[0] ?? null,
    [filtered, selectedId]
  );

  React.useEffect(() => {
    if (!selected && filtered.length === 0) return;
    if (selected && selected.id === selectedId) return;

    const next = new URLSearchParams(searchParams);
    if (selected) {
      next.set("projectId", selected.id);
    } else {
      next.delete("projectId");
    }
    setSearchParams(next, { replace: true });
  }, [filtered, searchParams, selected, selectedId, setSearchParams]);

  const setQuery = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value.trim()) {
      next.set("q", value);
    } else {
      next.delete("q");
    }
    setSearchParams(next, { replace: true });
  };

  const openProject = (projectId: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("projectId", projectId);
    setSearchParams(next, { replace: true });
  };

  const createBlankProject = () => {
    const created = createProject({
      name: `New Project ${projects.length + 1}`,
      customer: "Sample customer",
      stage: "Discovery",
      status: "Draft",
      notes: "New blank project created from the Projects page.",
    });
    const next = new URLSearchParams(searchParams);
    next.set("projectId", created.id);
    setSearchParams(next, { replace: true });
  };

  const removeSelectedProject = (project: StoredProject) => {
    const ok = window.confirm(`Delete project "${project.name}"?`);
    if (!ok) return;

    deleteProject(project.id);

    const next = new URLSearchParams(searchParams);
    if (next.get("projectId") === project.id) {
      next.delete("projectId");
    }
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="wm-dashboard">
      <section className="wm-dashboard__hero" style={{ alignItems: "center" }}>
        <div>
          <div className="wm-dashboard__eyebrow">Projects</div>
          <h1 className="wm-dashboard__title" style={{ fontSize: "clamp(1.8rem, 2.8vw, 2.5rem)" }}>
            Active project workspace
          </h1>
          <p className="wm-dashboard__subtitle">
            Manage active project context, search live project data, and jump straight into the next step.
          </p>
        </div>

        <div className="wm-dashboard__heroactions">
          <button type="button" className="wm-btn wm-btn--ghost" onClick={() => nav("/app/dashboard")}>
            Dashboard
          </button>
          <button type="button" className="wm-btn wm-btn--ghost" onClick={() => nav("/app/tools")}>
            Tool Hub
          </button>
          <button type="button" className="wm-btn wm-btn--primary" onClick={createBlankProject}>
            Start New Project
          </button>
        </div>
      </section>

      <section className="wm-card">
        <div className="wm-card__title">Project search</div>
        <div className="wm-card__subtitle">Search by customer, site, room, status, stage, notes or project name.</div>

        <div style={{ marginTop: 14 }}>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="e.g: Search by customer, site, room, status, tier, sku"
            style={{
              width: "100%",
              height: 42,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.95)",
              padding: "0 14px",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>
      </section>

      {filtered.length === 0 ? (
        <section className="wm-card">
          <div className="wm-card__title">No projects found</div>
          <div className="wm-card__subtitle">
            Your dashboard recent projects and this page now use the same shared project store. Create a new project to begin.
          </div>

          <div className="wm-inline-actions">
            <button type="button" className="wm-btn wm-btn--primary" onClick={createBlankProject}>
              Create first project
            </button>
          </div>
        </section>
      ) : (
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(360px, 0.95fr) minmax(0, 1.25fr)",
            gap: 16,
          }}
        >
          <div className="wm-card">
            <div className="wm-card__title">Project list</div>
            <div className="wm-card__subtitle">These projects are live and shared with the Dashboard recent projects panel.</div>

            <div className="wm-project-list">
              {filtered.map((project) => {
                const isSelected = selected?.id === project.id;
                return (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => openProject(project.id)}
                    className="wm-project-row"
                    style={{
                      width: "100%",
                      textAlign: "left",
                      background: isSelected
                        ? "linear-gradient(90deg, rgba(18,182,166,0.16), rgba(255,255,255,0.04))"
                        : undefined,
                      borderColor: isSelected ? "rgba(18,182,166,0.28)" : undefined,
                      cursor: "pointer",
                    }}
                  >
                    <div className="wm-project-row__main">
                      <div className="wm-project-row__name">{project.name}</div>
                      <div className="wm-project-row__customer">{project.customer}</div>
                    </div>
                    <div className="wm-project-row__stage">{project.stage}</div>
                    <div className="wm-project-row__updated">{new Date(project.updatedAt).toLocaleDateString()}</div>
                    <div className="wm-project-row__actions">
                      <span className="wm-chip" style={{ fontSize: 11 }}>{project.status}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="wm-card">
            {selected ? (
              <>
                <div className="wm-card__title">{selected.name}</div>
                <div className="wm-card__subtitle">Selected live project context from the shared project workspace.</div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 12, marginTop: 16 }}>
                  <div className="wm-nextstep__project">
                    <div className="wm-nextstep__label">Customer</div>
                    <h3 style={{ marginBottom: 4 }}>{selected.customer || "Not set"}</h3>
                    <p>Site: {selected.site || "Not set"}</p>
                    <p>Room: {selected.roomName || "Not set"}</p>
                  </div>

                  <div className="wm-nextstep__project">
                    <div className="wm-nextstep__label">Project state</div>
                    <h3 style={{ marginBottom: 4 }}>{selected.stage}</h3>
                    <p>Status: {selected.status}</p>
                    <p>Updated: {formatDateTime(selected.updatedAt)}</p>
                  </div>
                </div>

                <div style={{ marginTop: 16 }} className="wm-card">
                  <div className="wm-card__title" style={{ fontSize: 18 }}>Notes</div>
                  <div className="wm-card__subtitle" style={{ marginTop: 10 }}>
                    {selected.notes || "No notes added yet."}
                  </div>
                </div>

                <div className="wm-inline-actions">
                  <button type="button" className="wm-btn wm-btn--ghost" onClick={() => nav("/app/dashboard")}>
                    Back to Dashboard
                  </button>
                  <button type="button" className="wm-btn wm-btn--ghost" onClick={() => nav("/app/tools/discovery")}>
                    Open Discovery
                  </button>
                  <button
                    type="button"
                    className="wm-btn wm-btn--primary"
                    onClick={() => removeSelectedProject(selected)}
                  >
                    Delete Project
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="wm-card__title">No project selected</div>
                <div className="wm-card__subtitle">Choose a project from the list to load its live context.</div>
              </>
            )}
          </div>
        </section>
      )}
    </div>
  );
}