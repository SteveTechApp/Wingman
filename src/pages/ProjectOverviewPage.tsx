import * as React from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import PageShell from "@/app/layout/PageShell";
import {
  getActiveProject,
  getProjectById,
  setActiveProjectId,
  subscribeProjects,
} from "@/features/projects/projectStore";

function formatDate(iso: string | undefined): string {
  if (!iso) return "-";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleString();
}

export default function ProjectOverviewPage() {
  const nav = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();

  const project = React.useSyncExternalStore(
    subscribeProjects,
    () => {
      const paramId = id || searchParams.get("projectId") || undefined;
      if (paramId) return getProjectById(paramId) ?? null;
      return getActiveProject() ?? null;
    },
    () => getActiveProject() ?? null
  );

  React.useEffect(() => {
    if (project?.id) {
      setActiveProjectId(project.id);
    }
  }, [project?.id]);

  if (!project) {
    return (
      <PageShell>
        <div className="wm-page" style={{ display: "grid", gap: 10 }}>
          <div style={{ fontWeight: 900, fontSize: 16 }}>Project not found</div>
          <button
            type="button"
            onClick={() => nav("/app/projects")}
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
        <section className="wm-hero">
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center" }}>
            <div>
              <div className="wm-title-xl">{project.name}</div>
              <div className="wm-body-sm" style={{ marginTop: 2 }}>
                {project.customer || "Sample customer"} | {project.site || "Site not set"}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Link className="wm-btn" to="/app/projects">Projects</Link>
              <Link className="wm-btn" to="/app/tools/discovery">Discovery</Link>
              <Link className="wm-btn" to="/app/tools/catalog">Catalog</Link>
              <Link className="wm-btn wm-btn-primary" to="/app/tools/proposal">Proposal</Link>
            </div>
          </div>
        </section>

        <section className="wm-grid-cards" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <div className="wm-card" style={{ padding: 12 }}>
            <div className="wm-section-title">Stage</div>
            <div className="wm-title-lg">{project.stage || "Discovery"}</div>
          </div>
          <div className="wm-card" style={{ padding: 12 }}>
            <div className="wm-section-title">Status</div>
            <div className="wm-title-lg">{project.status || "Draft"}</div>
          </div>
          <div className="wm-card" style={{ padding: 12 }}>
            <div className="wm-section-title">Updated</div>
            <div className="wm-title-lg" style={{ fontSize: 14 }}>{formatDate(project.updatedAt)}</div>
          </div>
          <div className="wm-card" style={{ padding: 12 }}>
            <div className="wm-section-title">Created</div>
            <div className="wm-title-lg" style={{ fontSize: 14 }}>{formatDate(project.createdAt)}</div>
          </div>
        </section>

        <section className="wm-page-grid-2">
          <div className="wm-card" style={{ padding: 12 }}>
            <div className="wm-section-title">Core details</div>
            <div className="wm-summary-list" style={{ marginTop: 8 }}>
              <div className="wm-summary-row"><span>Customer</span><strong>{project.customer || "-"}</strong></div>
              <div className="wm-summary-row"><span>Site</span><strong>{project.site || "-"}</strong></div>
              <div className="wm-summary-row"><span>Room</span><strong>{project.roomName || "-"}</strong></div>
              <div className="wm-summary-row"><span>Active route key</span><strong>{project.id}</strong></div>
            </div>
          </div>

          <div className="wm-card" style={{ padding: 12 }}>
            <div className="wm-section-title">Discovery snapshot</div>
            <div className="wm-summary-list" style={{ marginTop: 8 }}>
              <div className="wm-summary-row"><span>Application</span><strong>{project.discovery?.applicationType || "-"}</strong></div>
              <div className="wm-summary-row"><span>Display count</span><strong>{project.discovery?.displayCount || "-"}</strong></div>
              <div className="wm-summary-row"><span>Source count</span><strong>{project.discovery?.sourceCount || "-"}</strong></div>
              <div className="wm-summary-row"><span>Distance</span><strong>{project.discovery?.cableDistanceM || "-"}</strong></div>
            </div>
          </div>
        </section>

        <section className="wm-page-grid-2">
          <div className="wm-card" style={{ padding: 12 }}>
            <div className="wm-section-title">Context notes</div>
            <div className="wm-body" style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>
              {project.notes?.trim() || "No notes captured yet."}
            </div>
          </div>

          <div className="wm-card" style={{ padding: 12 }}>
            <div className="wm-section-title">Commercial mapping</div>
            <div className="wm-summary-list" style={{ marginTop: 8 }}>
              <div className="wm-summary-row"><span>Template</span><strong>{project.template?.application || "-"}</strong></div>
              <div className="wm-summary-row"><span>Competitor SKU</span><strong>{project.compare?.competitorSku || "-"}</strong></div>
              <div className="wm-summary-row"><span>Video wall</span><strong>{project.videowall ? `${project.videowall.rows}x${project.videowall.cols} ${project.videowall.technology}` : "-"}</strong></div>
              <div className="wm-summary-row"><span>Proposal title</span><strong>{project.proposal?.title || "-"}</strong></div>
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
