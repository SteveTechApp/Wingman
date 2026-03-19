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

type OverviewTab = "summary" | "technical" | "customer" | "collaboration" | "deployment";

type SummaryRow = {
  label: string;
  value: string;
};

const OVERVIEW_TABS: Array<{ id: OverviewTab; label: string }> = [
  { id: "summary", label: "Summary" },
  { id: "technical", label: "Technical" },
  { id: "customer", label: "Customer" },
  { id: "collaboration", label: "Collaboration" },
  { id: "deployment", label: "Deployment" },
];

function formatDate(iso: string | undefined): string {
  if (!iso) return "-";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleString();
}

function renderSummaryRows(rows: SummaryRow[]) {
  return (
    <div className="wm-summary-list">
      {rows.map((row) => (
        <div key={row.label} className="wm-summary-row">
          <span>{row.label}</span>
          <strong>{row.value || "-"}</strong>
        </div>
      ))}
    </div>
  );
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
    () => getActiveProject() ?? null,
  );

  React.useEffect(() => {
    if (project?.id) {
      setActiveProjectId(project.id);
    }
  }, [project?.id]);

  const [activeTab, setActiveTab] = React.useState<OverviewTab>("summary");
  const [commentBody, setCommentBody] = React.useState("");
  const [commentAudience, setCommentAudience] = React.useState<"internal" | "customer">("internal");
  const [shareMessage, setShareMessage] = React.useState("");
  const [savingComment, setSavingComment] = React.useState(false);
  const [sharing, setSharing] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);

  const customerSummary = React.useMemo(
    () => (project ? project.customerSummary ?? buildCustomerSafeSummary(project) : null),
    [project],
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
              The requested project could not be loaded. Return to Projects and pick an active record.
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

  const nextRecommendedAction = project.discovery?.recommendedNextTool
    ? `Continue in ${project.discovery.recommendedNextTool}`
    : project.proposal?.title
      ? "Review proposal output"
      : "Continue Guided Project";

  const summaryRows: SummaryRow[] = [
    { label: "Customer", value: project.customer || "-" },
    { label: "Site", value: project.site || "-" },
    { label: "Room", value: project.roomName || "-" },
    { label: "Stage", value: project.stage || "Discovery" },
    { label: "Status", value: project.status || "Draft" },
    { label: "Updated", value: formatDate(project.updatedAt) },
  ];

  const technicalRowsLeft: SummaryRow[] = [
    { label: "Application", value: project.discovery?.applicationType || "-" },
    { label: "Display count", value: project.discovery?.displayCount || "-" },
    { label: "Source count", value: project.discovery?.sourceCount || "-" },
    { label: "Distance", value: project.discovery?.cableDistanceM || "-" },
    { label: "Reach band", value: project.discovery?.transportDistanceBand || "-" },
    { label: "Signal formats", value: project.discovery?.signalFormats || "-" },
    { label: "HDR", value: project.discovery?.signalHdr || "-" },
    { label: "USB workflow", value: project.discovery?.usbNeeds || "-" },
    { label: "USB bandwidth", value: project.discovery?.usbStandards || "-" },
  ];

  const technicalRowsRight: SummaryRow[] = [
    { label: "Source placement", value: project.discovery?.sourcePlacement || "-" },
    { label: "Source ingress", value: project.discovery?.sourceConnectionPath || "-" },
    { label: "Source transport", value: project.discovery?.sourceConnectionType || "-" },
    { label: "Source cable", value: project.discovery?.sourceCableType || "-" },
    { label: "Display delivery", value: project.discovery?.displayConnectionPath || "-" },
    { label: "Display transport", value: project.discovery?.displayConnectionType || "-" },
    { label: "Display cable", value: project.discovery?.displayCableType || "-" },
    { label: "Installed route", value: project.discovery?.installationPath || "-" },
    { label: "Network", value: project.discovery?.networkEnvironment || "-" },
  ];

  const commercialRows: SummaryRow[] = [
    { label: "Template", value: project.template?.application || "-" },
    { label: "Competitor SKU", value: project.compare?.competitorSku || "-" },
    { label: "Proposal title", value: project.proposal?.title || "-" },
    { label: "Rule version", value: project.recommendationGovernance?.ruleSetVersion || "-" },
    { label: "Catalog version", value: project.recommendationGovernance?.catalogVersion || "-" },
    { label: "Primary fit", value: project.recommendationGovernance?.primaryRecommendation || "-" },
  ];

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
        <div className="wm-page-hero-row wm-project-overview-page__hero">
          <div className="wm-grid wm-project-overview-page__hero-copy">
            <div className="wm-kicker">
              {project.stage || "Discovery"} | {project.status || "Draft"}
            </div>
            <div className="wm-title-xl">{project.name}</div>
            <div className="wm-body-sm">
              {project.customer || "Customer not set"} | {project.site || "Site not set"}
            </div>
            <div className="wm-project-overview-page__hero-next">
              Next recommended move: {nextRecommendedAction}
            </div>
          </div>

          <div className="wm-actions-row">
            <Link className="wm-btn" to="/app/projects">Projects</Link>
            <Link className="wm-btn" to="/app/tools/discovery">Guided Project</Link>
            <Link className="wm-btn" to="/app/tools/catalog">Products</Link>
            <Link className="wm-btn wm-btn-primary" to="/app/tools/proposal">Proposal</Link>
          </div>
        </div>
      </section>

      <section className="wm-section wm-project-overview-page__tabs-shell">
        <div className="wm-project-overview-page__tabs" role="tablist" aria-label="Project overview sections">
          {OVERVIEW_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`wm-project-overview-page__tab${activeTab === tab.id ? " is-active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {activeTab === "summary" ? (
        <div className="wm-project-overview-page__tab-body">
          <section className="wm-section wm-section--tone-cyan">
            <div className="wm-section__head">
              <div className="wm-section__titles">
                <h2>Project summary</h2>
                <p>The first-read view of the opportunity, current fit, and what needs attention next.</p>
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
                <div className="wm-section-title">Primary fit</div>
                <div className="wm-title-lg">{project.recommendationGovernance?.primaryRecommendation || "-"}</div>
              </article>
              <article className="wm-work-card">
                <div className="wm-section-title">Updated</div>
                <div className="wm-title-lg wm-project-overview-page__date">{formatDate(project.updatedAt)}</div>
              </article>
            </div>
          </section>

          <div className="wm-split-columns">
            <section className="wm-section wm-section--compact wm-section--tone-indigo">
              <div className="wm-section__head">
                <div className="wm-section__titles">
                  <h2>Core details</h2>
                  <p>The commercial basics and current record state.</p>
                </div>
              </div>
              {renderSummaryRows(summaryRows)}
            </section>

            <section className="wm-section wm-section--compact wm-section--tone-cyan">
              <div className="wm-section__head">
                <div className="wm-section__titles">
                  <h2>Current recommendation</h2>
                  <p>The current Wingman reading before moving deeper into technical detail.</p>
                </div>
              </div>

              <div className="wm-project-overview-page__focus-stack">
                <div className="wm-project-overview-page__focus-pill">
                  {project.recommendationGovernance?.primaryRecommendation || "No governed recommendation yet"}
                </div>
                <div className="wm-body-sm">
                  {project.discovery?.recommendedFamilies
                    ? `Recommended families: ${project.discovery.recommendedFamilies}`
                    : "Save Guided Project to capture the latest recommendation families."}
                </div>
                <ul className="wm-gp__list">
                  {(customerSummary?.openRisks ?? []).length > 0 ? (
                    customerSummary?.openRisks.map((item) => <li key={item}>{item}</li>)
                  ) : (
                    <li>No major open risks are currently exposed in the customer-safe summary.</li>
                  )}
                </ul>
              </div>
            </section>
          </div>

          <section className="wm-section wm-section--compact wm-section--tone-amber">
            <div className="wm-section__head">
              <div className="wm-section__titles">
                <h2>Context notes</h2>
                <p>Qualification and install notes captured against the project.</p>
              </div>
            </div>
            <div className="wm-body wm-project-overview-page__notes">
              {project.notes?.trim() || "No notes captured yet."}
            </div>
          </section>
        </div>
      ) : null}

      {activeTab === "technical" ? (
        <div className="wm-project-overview-page__tab-body">
          <div className="wm-split-columns">
            <section className="wm-section wm-section--compact wm-section--tone-cyan">
              <div className="wm-section__head">
                <div className="wm-section__titles">
                  <h2>Signal envelope</h2>
                  <p>Room, display, signal, and USB details from Guided Project.</p>
                </div>
              </div>
              {renderSummaryRows(technicalRowsLeft)}
            </section>

            <section className="wm-section wm-section--compact wm-section--tone-indigo">
              <div className="wm-section__head">
                <div className="wm-section__titles">
                  <h2>Physical path</h2>
                  <p>How sources, transport, and display delivery are currently understood.</p>
                </div>
              </div>
              {renderSummaryRows(technicalRowsRight)}
            </section>
          </div>

          <div className="wm-split-columns">
            <section className="wm-section wm-section--compact wm-section--tone-amber">
              <div className="wm-section__head">
                <div className="wm-section__titles">
                  <h2>Commercial mapping</h2>
                  <p>Downstream linking from architecture, comparison, and proposal tooling.</p>
                </div>
              </div>
              {renderSummaryRows(commercialRows)}
            </section>

            <section className="wm-section wm-section--compact wm-section--tone-cyan">
              <div className="wm-section__head">
                <div className="wm-section__titles">
                  <h2>Why Wingman recommended this</h2>
                  <p>Governed reasoning and explainability commitments for the current fit.</p>
                </div>
              </div>

              <div className="wm-project-overview-page__focus-stack">
                <ul className="wm-gp__list">
                  {(project.recommendationGovernance?.reasoning ?? []).length > 0 ? (
                    project.recommendationGovernance?.reasoning.map((item) => <li key={item}>{item}</li>)
                  ) : (
                    <li>Save Guided Project to capture the latest governed recommendation snapshot.</li>
                  )}
                </ul>
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
        </div>
      ) : null}

      {activeTab === "customer" ? (
        <div className="wm-project-overview-page__tab-body">
          <div className="wm-split-columns">
            <section className="wm-section wm-section--compact">
              <div className="wm-section__head">
                <div className="wm-section__titles">
                  <h2>Customer-ready summary</h2>
                  <p>Use this as the safe handoff summary for customer-facing conversations and share packs.</p>
                </div>
              </div>

              <div className="wm-summary-list">
                <div className="wm-summary-row">
                  <span>Headline</span>
                  <strong>{customerSummary?.headline || "-"}</strong>
                </div>
              </div>
              <div className="wm-body wm-project-overview-page__notes" style={{ marginTop: 12 }}>
                {customerSummary?.overview || "No customer-safe overview available yet."}
              </div>
            </section>

            <section className="wm-section wm-section--compact">
              <div className="wm-section__head">
                <div className="wm-section__titles">
                  <h2>Highlights and open risks</h2>
                  <p>Customer-safe points that can move the conversation forward without exposing internal detail.</p>
                </div>
              </div>

              <div className="wm-project-overview-page__focus-stack">
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
              </div>
            </section>
          </div>

          <section className="wm-section wm-section--compact wm-section--tone-amber">
            <div className="wm-section__head">
              <div className="wm-section__titles">
                <h2>Customer share pack</h2>
                <p>Prepare a customer-safe outbound summary when the workspace role permits it.</p>
              </div>
            </div>

            {permissions.canPrepareShares ? (
              <div className="wm-project-overview-page__focus-stack">
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
              </div>
            ) : (
              <div className="wm-body-sm">
                Customer-safe summaries stay visible here, but only sales and admin roles can generate share packs.
              </div>
            )}
          </section>
        </div>
      ) : null}

      {activeTab === "collaboration" ? (
        <div className="wm-project-overview-page__tab-body">
          <div className="wm-split-columns">
            <section className="wm-section wm-section--compact wm-section--tone-emerald">
              <div className="wm-section__head">
                <div className="wm-section__titles">
                  <h2>Add comment</h2>
                  <p>Keep internal engineering notes and customer-facing commentary attached to the project record.</p>
                </div>
              </div>

              <div className="wm-project-overview-page__focus-stack">
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
            </section>

            <section className="wm-section wm-section--compact wm-section--tone-indigo">
              <div className="wm-section__head">
                <div className="wm-section__titles">
                  <h2>Comment history</h2>
                  <p>Recent collaboration notes attached to the workspace project.</p>
                </div>
              </div>

              <div className="wm-project-overview-page__comment-list">
                {(project.comments ?? []).length > 0 ? (
                  project.comments?.map((comment) => (
                    <article key={comment.id} className="wm-panel">
                      <div className="wm-section-title">
                        {comment.audience === "customer" ? "Customer-safe note" : "Internal note"}
                      </div>
                      <div className="wm-body" style={{ marginTop: 6 }}>{comment.body}</div>
                      <div className="wm-body-sm" style={{ marginTop: 6, opacity: 0.72 }}>
                        {comment.authorName} / {formatDate(comment.createdAt)}
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="wm-body">No collaboration notes captured yet.</div>
                )}
              </div>
            </section>
          </div>
        </div>
      ) : null}

      {activeTab === "deployment" ? (
        <div className="wm-project-overview-page__tab-body">
          <div className="wm-split-columns">
            <section className="wm-section wm-section--compact wm-section--tone-amber">
              <div className="wm-section__head">
                <div className="wm-section__titles">
                  <h2>Attachments and share packs</h2>
                  <p>Document records and customer-facing outbound packs associated with this opportunity.</p>
                </div>
              </div>

              <div className="wm-project-overview-page__focus-stack">
                <div>
                  <div className="wm-section-title">Attachments</div>
                  <ul className="wm-gp__list">
                    {(project.attachments ?? []).length > 0 ? (
                      project.attachments?.map((attachment) => (
                        <li key={attachment.id}>
                          {attachment.name} / {attachment.kind} / {attachment.source}
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
                          {share.accessCode ? ` / Code ${share.accessCode}` : ""}
                        </li>
                      ))
                    ) : (
                      <li>No customer share packs prepared yet.</li>
                    )}
                  </ul>
                </div>
              </div>
            </section>

            <section className="wm-section wm-section--compact wm-section--tone-indigo">
              <div className="wm-section__head">
                <div className="wm-section__titles">
                  <h2>Audit trail</h2>
                  <p>Deployment record, governance activity, and collaboration events captured over time.</p>
                </div>
              </div>

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
            </section>
          </div>
        </div>
      ) : null}
    </div>
  );
}
