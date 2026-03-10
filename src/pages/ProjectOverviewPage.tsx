import * as React from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
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
      <div className="wm-page wm-project-overview-page">
        <section className="wm-hero">
          <div className="wm-grid">
            <div className="wm-title-xl">Project not found</div>
            <div className="wm-body">
              The requested project could not be loaded. Return to the projects workspace and pick an active record.
            </div>
            <div className="wm-actions-row">
              <button
                type="button"
                className="wm-btn wm-btn-primary"
                onClick={() => nav("/app/projects")}
              >
                Back to Projects
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="wm-page wm-project-overview-page">
      <section className="wm-hero">
        <div className="wm-page-hero-row">
          <div className="wm-grid wm-project-overview-page__hero-copy">
            <div className="wm-kicker">{project.stage || "Discovery"} | {project.status || "Draft"}</div>
            <div className="wm-title-xl">{project.name}</div>
            <div className="wm-body-sm">
              {project.customer || "Sample customer"} | {project.site || "Site not set"}
            </div>
          </div>

          <div className="wm-actions-row">
            <Link className="wm-btn" to="/app/projects">Projects</Link>
            <Link className="wm-btn" to="/app/tools/discovery">Discovery</Link>
            <Link className="wm-btn" to="/app/tools/catalog">Catalog</Link>
            <Link className="wm-btn wm-btn-primary" to="/app/tools/proposal">Proposal</Link>
          </div>
        </div>
      </section>

      <section className="wm-section">
        <div className="wm-section__head">
          <div className="wm-section__titles">
            <h2>Project health snapshot</h2>
            <p>Track progress and timestamps while moving between Discovery, products, and proposal output.</p>
          </div>
        </div>

        <div className="wm-grid-cards wm-project-overview-page__kpis">
          <article className="wm-work-card">
            <div className="wm-section-title">Stage</div>
            <div className="wm-title-lg">{project.stage || "Discovery"}</div>
          </article>
          <article className="wm-work-card">
            <div className="wm-section-title">Status</div>
            <div className="wm-title-lg">{project.status || "Draft"}</div>
          </article>
          <article className="wm-work-card">
            <div className="wm-section-title">Updated</div>
            <div className="wm-title-lg wm-project-overview-page__date">{formatDate(project.updatedAt)}</div>
          </article>
          <article className="wm-work-card">
            <div className="wm-section-title">Created</div>
            <div className="wm-title-lg wm-project-overview-page__date">{formatDate(project.createdAt)}</div>
          </article>
        </div>
      </section>

      <div className="wm-split-columns">
        <section className="wm-section wm-section--compact">
          <div className="wm-section__head">
            <div className="wm-section__titles">
              <h2>Core details</h2>
              <p>Commercial context and project identifiers captured in the workspace.</p>
            </div>
          </div>

          <div className="wm-summary-list">
            <div className="wm-summary-row"><span>Customer</span><strong>{project.customer || "-"}</strong></div>
            <div className="wm-summary-row"><span>Site</span><strong>{project.site || "-"}</strong></div>
            <div className="wm-summary-row"><span>Room</span><strong>{project.roomName || "-"}</strong></div>
            <div className="wm-summary-row"><span>Active route key</span><strong>{project.id}</strong></div>
          </div>
        </section>

        <section className="wm-section wm-section--compact">
          <div className="wm-section__head">
            <div className="wm-section__titles">
              <h2>Discovery snapshot</h2>
              <p>Latest recorded requirements from the Discovery workflow.</p>
            </div>
          </div>

          <div className="wm-summary-list">
            <div className="wm-summary-row"><span>Application</span><strong>{project.discovery?.applicationType || "-"}</strong></div>
            <div className="wm-summary-row"><span>Display count</span><strong>{project.discovery?.displayCount || "-"}</strong></div>
            <div className="wm-summary-row"><span>Source count</span><strong>{project.discovery?.sourceCount || "-"}</strong></div>
            <div className="wm-summary-row"><span>Distance</span><strong>{project.discovery?.cableDistanceM || "-"}</strong></div>
          </div>
        </section>
      </div>

      <div className="wm-split-columns">
        <section className="wm-section wm-section--compact">
          <div className="wm-section__head">
            <div className="wm-section__titles">
              <h2>Context notes</h2>
              <p>Install constraints and commercial context captured during qualification.</p>
            </div>
          </div>

          <div className="wm-body wm-project-overview-page__notes">
            {project.notes?.trim() || "No notes captured yet."}
          </div>
        </section>

        <section className="wm-section wm-section--compact">
          <div className="wm-section__head">
            <div className="wm-section__titles">
              <h2>Commercial mapping</h2>
              <p>Downstream template, comparison, and proposal linkage for the project.</p>
            </div>
          </div>

          <div className="wm-summary-list">
            <div className="wm-summary-row"><span>Template</span><strong>{project.template?.application || "-"}</strong></div>
            <div className="wm-summary-row"><span>Competitor SKU</span><strong>{project.compare?.competitorSku || "-"}</strong></div>
            <div className="wm-summary-row">
              <span>Video wall</span>
              <strong>
                {project.videowall
                  ? project.videowall.technology === "LED"
                    ? `LED output ${project.videowall.outputCols ?? project.videowall.cols}x${project.videowall.outputRows ?? project.videowall.rows}, physical ${project.videowall.cabinetCols ?? "?"}x${project.videowall.cabinetRows ?? "?"}`
                    : `${project.videowall.cols}x${project.videowall.rows} LCD`
                  : "-"}
              </strong>
            </div>
            <div className="wm-summary-row"><span>Proposal title</span><strong>{project.proposal?.title || "-"}</strong></div>
          </div>
        </section>
      </div>
    </div>
  );
}
