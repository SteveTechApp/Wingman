import * as React from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  addProjectComment,
  createProjectShare,
  getActiveProject,
  getProjectById,
  setActiveProjectId,
  subscribeProjects,
} from "@/features/projects/projectStore";
import { buildCustomerSafeSummary } from "@/features/projects/customerSummary";
import { useAuth } from "@/context";

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
  const { permissions, workspaceRole } = useAuth();

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

  const [commentBody, setCommentBody] = React.useState("");
  const [commentAudience, setCommentAudience] = React.useState<"internal" | "customer">("internal");
  const [shareMessage, setShareMessage] = React.useState("");
  const [savingComment, setSavingComment] = React.useState(false);
  const [sharing, setSharing] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const customerSummary = React.useMemo(
    () => (project ? project.customerSummary ?? buildCustomerSafeSummary(project) : null),
    [project]
  );

  React.useEffect(() => {
    if (!permissions.canCreateInternalComments && commentAudience === "internal") {
      setCommentAudience("customer");
    }
  }, [commentAudience, permissions.canCreateInternalComments]);

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

  const currentProject = project;

  async function submitComment() {
    if (!commentBody.trim()) return;
    setSavingComment(true);
    setActionError(null);
    try {
      await addProjectComment(currentProject.id, {
        body: commentBody,
        audience: commentAudience,
      });
      setCommentBody("");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to save this comment.");
    } finally {
      setSavingComment(false);
    }
  }

  async function prepareShare() {
    if (!customerSummary) return;
    setSharing(true);
    setActionError(null);
    try {
      await createProjectShare(currentProject.id, {
        title: `${customerSummary.headline} share pack`,
        message: shareMessage || customerSummary.overview,
        audience: "customer",
        summaryHeadline: customerSummary.headline,
      });
      setShareMessage("");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to prepare this share pack.");
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className="wm-page wm-project-overview-page">
      <section className="wm-hero">
        <div className="wm-page-hero-row">
          <div className="wm-grid wm-project-overview-page__hero-copy">
            <div className="wm-kicker">{project.stage || "Discovery"} | {project.status || "Draft"}</div>
            <div className="wm-title-xl">{project.name}</div>
            <div className="wm-body-sm">
              {project.customer || "Customer not set"} | {project.site || "Site not set"}
            </div>
          </div>

          <div className="wm-actions-row">
            <Link className="wm-btn" to="/app/projects">Projects</Link>
            <Link className="wm-btn" to="/app/tools/discovery">Guided Project</Link>
            <Link className="wm-btn" to="/app/tools/catalog">Catalog</Link>
            <Link className="wm-btn wm-btn-primary" to="/app/tools/proposal">Proposal</Link>
            <Link className="wm-btn" to={`/app/projects/${encodeURIComponent(project.id)}/completion`}>
              Completion Workflow
            </Link>
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
              <h2>Guided Project snapshot</h2>
              <p>Latest recorded room, source, and transport context from Guided Project.</p>
            </div>
          </div>

          <div className="wm-summary-list">
            <div className="wm-summary-row"><span>Application</span><strong>{project.discovery?.applicationType || "-"}</strong></div>
            <div className="wm-summary-row"><span>Display count</span><strong>{project.discovery?.displayCount || "-"}</strong></div>
            <div className="wm-summary-row"><span>Source count</span><strong>{project.discovery?.sourceCount || "-"}</strong></div>
            <div className="wm-summary-row"><span>Distance</span><strong>{project.discovery?.cableDistanceM || "-"}</strong></div>
            <div className="wm-summary-row"><span>Reach band</span><strong>{project.discovery?.transportDistanceBand || "-"}</strong></div>
            <div className="wm-summary-row"><span>Signal formats</span><strong>{project.discovery?.signalFormats || "-"}</strong></div>
            <div className="wm-summary-row"><span>HDR</span><strong>{project.discovery?.signalHdr || "-"}</strong></div>
            <div className="wm-summary-row"><span>Source placement</span><strong>{project.discovery?.sourcePlacement || "-"}</strong></div>
            <div className="wm-summary-row"><span>Source ingress</span><strong>{project.discovery?.sourceConnectionPath || "-"}</strong></div>
            <div className="wm-summary-row"><span>Source transport</span><strong>{project.discovery?.sourceConnectionType || "-"}</strong></div>
            <div className="wm-summary-row"><span>Source cable</span><strong>{project.discovery?.sourceCableType || "-"}</strong></div>
            <div className="wm-summary-row"><span>Display delivery</span><strong>{project.discovery?.displayConnectionPath || "-"}</strong></div>
            <div className="wm-summary-row"><span>Display transport</span><strong>{project.discovery?.displayConnectionType || "-"}</strong></div>
            <div className="wm-summary-row"><span>Display cable</span><strong>{project.discovery?.displayCableType || "-"}</strong></div>
            <div className="wm-summary-row"><span>Installed route</span><strong>{project.discovery?.installationPath || "-"}</strong></div>
            <div className="wm-summary-row"><span>Network environment</span><strong>{project.discovery?.networkEnvironment || "-"}</strong></div>
            <div className="wm-summary-row"><span>USB workflow</span><strong>{project.discovery?.usbNeeds || "-"}</strong></div>
            <div className="wm-summary-row"><span>USB bandwidth</span><strong>{project.discovery?.usbStandards || "-"}</strong></div>
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

      <div className="wm-split-columns">
        <section className="wm-section wm-section--compact">
          <div className="wm-section__head">
            <div className="wm-section__titles">
              <h2>Customer-ready summary</h2>
              <p>Use this as the safe handoff summary for customer-facing conversations and share packs.</p>
            </div>
          </div>

          <div className="wm-summary-list">
            <div className="wm-summary-row"><span>Headline</span><strong>{customerSummary?.headline || "-"}</strong></div>
          </div>
          <div className="wm-body wm-project-overview-page__notes" style={{ marginTop: 12 }}>
            {customerSummary?.overview || "No customer-safe overview available yet."}
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            <div>
              <div className="wm-section-title">Highlights</div>
              <ul className="wm-gp__list">
                {(customerSummary?.bullets ?? []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div>
              <div className="wm-section-title">Open risks</div>
              <ul className="wm-gp__list">
                {(customerSummary?.openRisks ?? []).length > 0 ? (
                  customerSummary?.openRisks.map((item) => <li key={item}>{item}</li>)
                ) : (
                  <li>No major open risks are currently exposed in the customer-safe summary.</li>
                )}
              </ul>
            </div>

            {permissions.canPrepareShares ? (
              <>
                <textarea
                  className="wm-ui__textarea wm-ui__textarea--sm"
                  aria-label="Customer share message"
                  value={shareMessage}
                  onChange={(event) => setShareMessage(event.target.value)}
                  placeholder="Optional message to include with the customer share pack"
                />

                <div className="wm-actions-row">
                  <button type="button" className="wm-btn wm-btn-primary" onClick={prepareShare} disabled={sharing}>
                    {sharing ? "Preparing share..." : "Prepare Customer Share"}
                  </button>
                </div>
              </>
            ) : (
              <div className="wm-body-sm">
                Customer-safe summaries stay visible here, but only sales and admin roles can generate share packs.
              </div>
            )}
          </div>
        </section>

        <section className="wm-section wm-section--compact">
          <div className="wm-section__head">
            <div className="wm-section__titles">
              <h2>Recommendation governance</h2>
              <p>Track which approved rule set and catalog baseline informed the latest Guided Project recommendation.</p>
            </div>
          </div>

          <div className="wm-summary-list">
            <div className="wm-summary-row"><span>Rule version</span><strong>{project.recommendationGovernance?.ruleSetVersion || "-"}</strong></div>
            <div className="wm-summary-row"><span>Catalog version</span><strong>{project.recommendationGovernance?.catalogVersion || "-"}</strong></div>
            <div className="wm-summary-row"><span>Approved by</span><strong>{project.recommendationGovernance?.approvedBy || "-"}</strong></div>
            <div className="wm-summary-row"><span>Primary fit</span><strong>{project.recommendationGovernance?.primaryRecommendation || "-"}</strong></div>
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
            <div>
              <div className="wm-section-title">Why Wingman recommended this</div>
              <ul className="wm-gp__list">
                {(project.recommendationGovernance?.reasoning ?? []).length > 0 ? (
                  project.recommendationGovernance?.reasoning.map((item) => <li key={item}>{item}</li>)
                ) : (
                  <li>Save Guided Project to capture the latest governed recommendation snapshot.</li>
                )}
              </ul>
            </div>
            <div>
              <div className="wm-section-title">Explainability commitments</div>
              <ul className="wm-gp__list">
                {(project.recommendationGovernance?.explainability ?? []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </div>

      <div className="wm-split-columns">
        <section className="wm-section wm-section--compact">
          <div className="wm-section__head">
            <div className="wm-section__titles">
              <h2>Collaboration</h2>
              <p>Keep internal engineering notes and customer-facing commentary attached to the workspace record.</p>
            </div>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            <label className="wm-ui__field">
              <span className="wm-ui__label">Comment audience</span>
              <select
                className="wm-ui__select"
                aria-label="Comment audience"
                value={commentAudience}
                onChange={(event) => setCommentAudience(event.target.value === "customer" ? "customer" : "internal")}
                disabled={!permissions.canCreateInternalComments}
              >
                {permissions.canCreateInternalComments ? <option value="internal">Internal</option> : null}
                {permissions.canCreateCustomerComments ? <option value="customer">Customer-safe</option> : null}
              </select>
            </label>

            <textarea
              className="wm-ui__textarea wm-ui__textarea--sm"
              aria-label="Project comment"
              value={commentBody}
              onChange={(event) => setCommentBody(event.target.value)}
              placeholder="Add a note, question, approval, or customer-safe comment"
            />

            <div className="wm-actions-row">
              <button
                type="button"
                className="wm-btn wm-btn-primary"
                onClick={submitComment}
                disabled={
                  savingComment ||
                  !commentBody.trim() ||
                  (commentAudience === "internal" && !permissions.canCreateInternalComments) ||
                  (commentAudience === "customer" && !permissions.canCreateCustomerComments)
                }
              >
                {savingComment ? "Saving note..." : "Add Comment"}
              </button>
            </div>
            {workspaceRole === "customer" ? (
              <div className="wm-body-sm">
                Customer workspace members can add customer-safe notes, but internal engineering notes stay hidden.
              </div>
            ) : null}
            {actionError ? <div className="wm-body-sm" style={{ color: "#ff9da5" }}>{actionError}</div> : null}
          </div>

          <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
            {(project.comments ?? []).length > 0 ? (
              project.comments?.map((comment) => (
                <article key={comment.id} className="wm-panel">
                  <div className="wm-section-title">{comment.audience === "customer" ? "Customer-safe note" : "Internal note"}</div>
                  <div className="wm-body" style={{ marginTop: 6 }}>{comment.body}</div>
                  <div className="wm-body-sm" style={{ marginTop: 6, opacity: 0.72 }}>
                    {comment.authorName} · {formatDate(comment.createdAt)}
                  </div>
                </article>
              ))
            ) : (
              <div className="wm-body">No collaboration notes captured yet.</div>
            )}
          </div>
        </section>

        <section className="wm-section wm-section--compact">
          <div className="wm-section__head">
            <div className="wm-section__titles">
              <h2>Deployment record</h2>
              <p>Attachment metadata, share packs, and audit history captured against this workspace project.</p>
            </div>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <div className="wm-section-title">Attachments</div>
              <ul className="wm-gp__list">
                {(project.attachments ?? []).length > 0 ? (
                  project.attachments?.map((attachment) => (
                    <li key={attachment.id}>
                      {attachment.name} · {attachment.kind} · {attachment.source}
                    </li>
                  ))
                ) : (
                  <li>No document or diagram records attached yet.</li>
                )}
              </ul>
            </div>

            <div>
              <div className="wm-section-title">Share packs</div>
              <ul className="wm-gp__list">
                {(project.shares ?? []).length > 0 ? (
                  project.shares?.map((share) => (
                    <li key={share.id}>
                      {share.title}
                      {share.accessCode ? ` · Code ${share.accessCode}` : ""}
                    </li>
                  ))
                ) : (
                  <li>No customer share packs prepared yet.</li>
                )}
              </ul>
            </div>

            <div>
              <div className="wm-section-title">Audit trail</div>
              <ul className="wm-gp__list">
                {(project.auditTrail ?? []).length > 0 ? (
                  project.auditTrail?.map((entry) => (
                    <li key={entry.id}>
                      {entry.action}: {entry.detail} ({formatDate(entry.createdAt)})
                    </li>
                  ))
                ) : (
                  <li>No audit activity recorded yet.</li>
                )}
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
