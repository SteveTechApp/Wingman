import * as React from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { WM_ROUTES } from "@/core/wingman/routeMap";
import {
  addProjectAttachment,
  addProjectComment,
  createProjectShare,
  getActiveProject,
  getProjectById,
  markProjectCommercialReady,
  setActiveProjectId,
  subscribeProjects,
} from "@/features/projects/projectStore";
import { getProjectResumeAction } from "@/features/projects/projectProductivity";
import "./project-overview-page.css";

type TabId = "comment" | "share" | "attachment" | "handoff";
type Tone = "good" | "warn";

const ACTION_TABS: Array<{ id: TabId; label: string; copy: string }> = [
  {
    id: "comment",
    label: "Comments",
    copy: "Capture internal or customer-safe notes without leaving the project hub.",
  },
  {
    id: "share",
    label: "Share Pack",
    copy: "Prepare the customer-facing summary separately so working notes stay clean.",
  },
  {
    id: "attachment",
    label: "Attachments",
    copy: "Register diagrams, briefs, and source files instead of losing them in email.",
  },
  {
    id: "handoff",
    label: "Commercial Handoff",
    copy: "Record the completion note and close the project into commercial-ready status.",
  },
];

function toText(value?: string | null, fallback = "Not set") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function formatDateTime(value?: string | null) {
  if (!value) return "Not captured";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function formatAudience(value: "internal" | "customer") {
  return value === "customer" ? "Customer" : "Internal";
}

function stageLabel(value?: string | null) {
  return toText(value, "Discovery").replace(/-/g, " ");
}

function tidy(value: string) {
  const next = value.trim();
  return next || undefined;
}

function metricText(value?: string | null, fallback = "Not set") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

export default function ProjectOverviewPage() {
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const { workspaceRole } = useAuth();

  const project = React.useSyncExternalStore(
    subscribeProjects,
    () => {
      const projectId = id || searchParams.get("projectId") || undefined;
      if (projectId) return getProjectById(projectId) ?? null;
      return getActiveProject() ?? null;
    },
    () => getActiveProject() ?? null,
  );

  const [tab, setTab] = React.useState<TabId>("comment");
  const [busy, setBusy] = React.useState<TabId | null>(null);
  const [status, setStatus] = React.useState<{ tone: Tone; text: string } | null>(null);

  const [commentAudience, setCommentAudience] =
    React.useState<"internal" | "customer">("internal");
  const [commentBody, setCommentBody] = React.useState("");

  const [shareAudience, setShareAudience] =
    React.useState<"internal" | "customer">("customer");
  const [shareTitle, setShareTitle] = React.useState("");
  const [shareHeadline, setShareHeadline] = React.useState("");
  const [shareMessage, setShareMessage] = React.useState("");

  const [attachmentName, setAttachmentName] = React.useState("");
  const [attachmentKind, setAttachmentKind] =
    React.useState<"document" | "diagram" | "brief" | "other">("document");
  const [attachmentSource, setAttachmentSource] = React.useState("");
  const [attachmentSummary, setAttachmentSummary] = React.useState("");

  const [handoffNote, setHandoffNote] = React.useState("");

  React.useEffect(() => {
    if (project?.id) setActiveProjectId(project.id);
  }, [project?.id]);

  React.useEffect(() => {
    if (!project) return;

    setBusy(null);
    setStatus(null);

    setCommentAudience("internal");
    setCommentBody("");

    setShareAudience("customer");
    setShareTitle(`${project.name} Share Pack`);
    setShareHeadline(
      [project.customer, project.roomName || project.site].filter(Boolean).join(" / ") ||
        project.name,
    );
    setShareMessage("");

    setAttachmentName("");
    setAttachmentKind("document");
    setAttachmentSource("");
    setAttachmentSummary("");

    setHandoffNote(
      `Commercial handoff confirmed for ${
        project.customer || project.name
      }. Proposal output, working notes, and supporting files are ready for the next team.`,
    );
  }, [project?.id]);

  const reportError = React.useCallback((error: unknown, fallback: string) => {
    setStatus({
      tone: "warn",
      text: error instanceof Error ? error.message : fallback,
    });
  }, []);

  const handleComment = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!project || !commentBody.trim()) return;

      setBusy("comment");
      setStatus(null);

      try {
        await addProjectComment(project.id, {
          body: commentBody.trim(),
          audience: commentAudience,
        });
        setCommentBody("");
        setStatus({
          tone: "good",
          text: `${formatAudience(commentAudience)} comment added.`,
        });
      } catch (error) {
        reportError(error, "Unable to add the comment.");
      } finally {
        setBusy(null);
      }
    },
    [commentAudience, commentBody, project, reportError],
  );

  const handleShare = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!project || !shareTitle.trim()) return;

      setBusy("share");
      setStatus(null);

      try {
        await createProjectShare(project.id, {
          title: shareTitle.trim(),
          audience: shareAudience,
          summaryHeadline: tidy(shareHeadline),
          message: tidy(shareMessage),
        });
        setShareMessage("");
        setStatus({
          tone: "good",
          text: `${formatAudience(shareAudience)} share pack prepared.`,
        });
      } catch (error) {
        reportError(error, "Unable to prepare the share pack.");
      } finally {
        setBusy(null);
      }
    },
    [project, reportError, shareAudience, shareHeadline, shareMessage, shareTitle],
  );

  const handleAttachment = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!project || !attachmentName.trim() || !attachmentSource.trim()) return;

      setBusy("attachment");
      setStatus(null);

      try {
        await addProjectAttachment(project.id, {
          name: attachmentName.trim(),
          kind: attachmentKind,
          source: attachmentSource.trim(),
          summary: tidy(attachmentSummary),
        });
        setAttachmentName("");
        setAttachmentSource("");
        setAttachmentSummary("");
        setStatus({
          tone: "good",
          text: `${attachmentKind} attachment registered.`,
        });
      } catch (error) {
        reportError(error, "Unable to register the attachment.");
      } finally {
        setBusy(null);
      }
    },
    [
      attachmentKind,
      attachmentName,
      attachmentSource,
      attachmentSummary,
      project,
      reportError,
    ],
  );

  const handleHandoff = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!project || !handoffNote.trim()) return;

      setBusy("handoff");
      setStatus(null);

      try {
        await markProjectCommercialReady(project.id, handoffNote.trim());
        setStatus({
          tone: "good",
          text: "Project marked commercial ready.",
        });
      } catch (error) {
        reportError(error, "Unable to complete the commercial handoff.");
      } finally {
        setBusy(null);
      }
    },
    [handoffNote, project, reportError],
  );

  if (!project) {
    return (
      <div className="wm-page-shell wm-project-overview-page">
        <section className="wm-page-header wm-page-header--split">
          <div>
            <div className="wm-page-kicker">Projects</div>
            <h1 className="wm-page-title">Project not found</h1>
            <p className="wm-page-subtitle">
              The requested project could not be loaded from the current workspace.
            </p>
          </div>

          <div className="wm-page-actions">
            <Link to={WM_ROUTES.projects} className="wm-btn-primary">
              Back to Projects
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const resume = getProjectResumeAction(project);
  const tags = [
    ...(project.discovery?.recommendedFamilies ?? []),
    ...(project.template?.recommendedFamilies ?? []),
    ...(project.compare?.recommendedFamilies ?? []),
  ].filter((item, index, all) => all.indexOf(item) === index);

  const notes =
    project.notes?.trim() ||
    project.proposal?.notes?.trim() ||
    project.compare?.summary?.trim() ||
    project.videowall?.summary?.trim() ||
    "No notes have been captured yet.";

  const comments = [...(project.comments ?? [])]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 4);

  const shares = [...(project.shares ?? [])]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 4);

  const attachments = [...(project.attachments ?? [])]
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
    .slice(0, 4);

  const audit = [...(project.auditTrail ?? [])]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);

  const statusClass = status
    ? `wm-project-status is-${status.tone}`
    : "wm-project-status";

  const isCommercialReady =
    String(project.status ?? "").trim().toLowerCase() === "commercial ready";

  const sourceMetric = metricText(project.discovery?.sourceCount, "0");
  const displayMetric = metricText(project.discovery?.displayCount, "0");
  const distanceMetric = project.discovery?.cableDistanceM
    ? `${project.discovery.cableDistanceM}m`
    : "Not set";
  const nextMoveMetric = resume.shortLabel;

  return (
    <div className="wm-page-shell wm-project-overview-page">
      <section className="wm-page-header wm-page-header--split">
        <div className="wm-page-stack">
          <div className="wm-page-kicker">
            {stageLabel(project.stage)} / {toText(project.status, "Draft")}
          </div>

          <h1 className="wm-page-title">{project.name}</h1>

          <p className="wm-page-subtitle">
            {toText(project.customer)} / {toText(project.site)}. Keep the brief readable,
            complete the next operational action, then jump straight back into the
            right workspace.
          </p>
        </div>

        <div className="wm-page-actions">
          <Link to={WM_ROUTES.projects} className="wm-btn-secondary">
            Projects
          </Link>
          <Link to={WM_ROUTES.discovery} className="wm-btn-secondary">
            Discovery
          </Link>
          <Link to={resume.to} className="wm-btn-primary">
            {resume.label}
          </Link>
        </div>
      </section>

      <section className="wm-stat-row">
        <div className="wm-stat-card">
          <span className="wm-stat-label">Inputs</span>
          <span className="wm-stat-value">{sourceMetric}</span>
        </div>
        <div className="wm-stat-card">
          <span className="wm-stat-label">Outputs</span>
          <span className="wm-stat-value">{displayMetric}</span>
        </div>
        <div className="wm-stat-card">
          <span className="wm-stat-label">Distance</span>
          <span className="wm-stat-value">{distanceMetric}</span>
        </div>
        <div className="wm-stat-card">
          <span className="wm-stat-label">Next move</span>
          <span className="wm-stat-value">{nextMoveMetric}</span>
        </div>
      </section>

      <section className="wm-page-grid wm-page-grid--3">
        <section className="wm-card">
          <div className="wm-section-header">
            <div>
              <h2 className="wm-section-title">Room and account summary</h2>
              <p className="wm-section-copy">
                Keep the project anchored to the customer, site and room.
              </p>
            </div>
          </div>

          <dl className="wm-project-definition-list">
            <div className="wm-project-definition-row">
              <dt>Customer</dt>
              <dd>{toText(project.customer)}</dd>
            </div>
            <div className="wm-project-definition-row">
              <dt>Site</dt>
              <dd>{toText(project.site)}</dd>
            </div>
            <div className="wm-project-definition-row">
              <dt>Room</dt>
              <dd>{toText(project.roomName)}</dd>
            </div>
            <div className="wm-project-definition-row">
              <dt>Workspace role</dt>
              <dd>{toText(workspaceRole, "Unknown")}</dd>
            </div>
          </dl>
        </section>

        <section className="wm-card">
          <div className="wm-section-header">
            <div>
              <h2 className="wm-section-title">Continue the room workflow</h2>
              <p className="wm-section-copy">
                Use the strongest resume path instead of searching across the toolset.
              </p>
            </div>
          </div>

          <div className="wm-project-next-card">
            <span className="wm-project-next-kicker">Recommended route</span>
            <strong>{resume.shortLabel}</strong>
            <p>{resume.label} and keep the current project context attached.</p>
          </div>

          {tags.length > 0 ? (
            <div className="wm-page-inline-list">
              {tags.map((tag) => (
                <span key={tag} className="wm-workspace-tag">
                  {tag}
                </span>
              ))}
            </div>
          ) : null}

          <dl className="wm-project-definition-list">
            <div className="wm-project-definition-row">
              <dt>Discovery direction</dt>
              <dd>{toText(project.discovery?.workflowTrack || project.discovery?.applicationType)}</dd>
            </div>
            <div className="wm-project-definition-row">
              <dt>Customer outcome</dt>
              <dd>
                {toText(
                  project.discovery?.customerOutcome ||
                    project.template?.summary ||
                    project.compare?.summary,
                )}
              </dd>
            </div>
            <div className="wm-project-definition-row">
              <dt>Feature focus</dt>
              <dd>
                {toText(
                  project.discovery?.featureRequirements ||
                    project.videowall?.processorRecommendation,
                )}
              </dd>
            </div>
          </dl>
        </section>

        <section className="wm-card">
          <div className="wm-section-header">
            <div>
              <h2 className="wm-section-title">Project health</h2>
              <p className="wm-section-copy">
                Quick checks for room, output and supporting context.
              </p>
            </div>
          </div>

          <dl className="wm-project-definition-list">
            <div className="wm-project-definition-row">
              <dt>Stage</dt>
              <dd>{stageLabel(project.stage)}</dd>
            </div>
            <div className="wm-project-definition-row">
              <dt>Status</dt>
              <dd>{toText(project.status, "Draft")}</dd>
            </div>
            <div className="wm-project-definition-row">
              <dt>Next tool</dt>
              <dd>{resume.shortLabel}</dd>
            </div>
            <div className="wm-project-definition-row">
              <dt>Last updated</dt>
              <dd>{formatDateTime(project.updatedAt)}</dd>
            </div>
          </dl>

          <div className="wm-project-asset-grid">
            <div className="wm-project-asset-card">
              <span>Products</span>
              <strong>{project.catalog?.skus?.length ?? 0}</strong>
            </div>
            <div className="wm-project-asset-card">
              <span>BOM items</span>
              <strong>{project.catalog?.bomItems?.length ?? 0}</strong>
            </div>
            <div className="wm-project-asset-card">
              <span>Comments</span>
              <strong>{project.comments?.length ?? 0}</strong>
            </div>
            <div className="wm-project-asset-card">
              <span>Shares</span>
              <strong>{project.shares?.length ?? 0}</strong>
            </div>
            <div className="wm-project-asset-card">
              <span>Attachments</span>
              <strong>{project.attachments?.length ?? 0}</strong>
            </div>
            <div className="wm-project-asset-card">
              <span>Video wall</span>
              <strong>{project.videowall ? "Configured" : "Not used"}</strong>
            </div>
          </div>
        </section>
      </section>

      <section className="wm-page-grid wm-page-grid--2">
        <section className="wm-card wm-project-main-card">
          <div className="wm-section-header">
            <div>
              <h2 className="wm-section-title">Project actions</h2>
              <p className="wm-section-copy">
                Complete the next operational task here, then keep the supporting
                history in the side rail.
              </p>
            </div>
          </div>

          <div className="wm-workspace-tab-row" role="tablist" aria-label="Project action sections">
            {ACTION_TABS.map((item) => (
              <button
                key={item.id}
                id={`project-overview-tab-${item.id}`}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                aria-controls={`project-overview-panel-${item.id}`}
                className={`wm-workspace-tab${tab === item.id ? " wm-workspace-tab--active" : ""}`}
                onClick={() => setTab(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="wm-empty-state">{ACTION_TABS.find((item) => item.id === tab)?.copy}</div>

          {tab === "comment" ? (
            <form
              id="project-overview-panel-comment"
              role="tabpanel"
              aria-labelledby="project-overview-tab-comment"
              className="wm-project-form"
              onSubmit={(event) => {
                void handleComment(event);
              }}
            >
              <div className="wm-project-form-grid">
                <label className="wm-project-field">
                  <span>Audience</span>
                  <select
                    className="wm-form-input"
                    value={commentAudience}
                    onChange={(event) =>
                      setCommentAudience(event.currentTarget.value as "internal" | "customer")
                    }
                  >
                    <option value="internal">Internal</option>
                    <option value="customer">Customer-safe</option>
                  </select>
                </label>

                <label className="wm-project-field wm-project-field--span">
                  <span>Comment</span>
                  <textarea
                    className="wm-form-input"
                    rows={6}
                    value={commentBody}
                    onChange={(event) => setCommentBody(event.currentTarget.value)}
                    placeholder="Capture the decision, risk, or update that should stay with this project."
                  />
                </label>
              </div>

              <div className="wm-action-row">
                <button
                  type="submit"
                  className="wm-btn-primary"
                  disabled={busy === "comment" || !commentBody.trim()}
                >
                  {busy === "comment" ? "Saving comment..." : "Add Comment"}
                </button>
              </div>
            </form>
          ) : null}

          {tab === "share" ? (
            <form
              id="project-overview-panel-share"
              role="tabpanel"
              aria-labelledby="project-overview-tab-share"
              className="wm-project-form"
              onSubmit={(event) => {
                void handleShare(event);
              }}
            >
              <div className="wm-project-form-grid">
                <label className="wm-project-field">
                  <span>Audience</span>
                  <select
                    className="wm-form-input"
                    value={shareAudience}
                    onChange={(event) =>
                      setShareAudience(event.currentTarget.value as "internal" | "customer")
                    }
                  >
                    <option value="customer">Customer</option>
                    <option value="internal">Internal</option>
                  </select>
                </label>

                <label className="wm-project-field">
                  <span>Pack title</span>
                  <input
                    className="wm-form-input"
                    value={shareTitle}
                    onChange={(event) => setShareTitle(event.currentTarget.value)}
                    placeholder="Project share pack title"
                  />
                </label>

                <label className="wm-project-field wm-project-field--span">
                  <span>Summary headline</span>
                  <input
                    className="wm-form-input"
                    value={shareHeadline}
                    onChange={(event) => setShareHeadline(event.currentTarget.value)}
                    placeholder="Headline used at the top of the shared pack"
                  />
                </label>

                <label className="wm-project-field wm-project-field--span">
                  <span>Message</span>
                  <textarea
                    className="wm-form-input"
                    rows={6}
                    value={shareMessage}
                    onChange={(event) => setShareMessage(event.currentTarget.value)}
                    placeholder="Give the recipient the exact context they need without exposing working notes."
                  />
                </label>
              </div>

              <div className="wm-action-row">
                <button
                  type="submit"
                  className="wm-btn-primary"
                  disabled={busy === "share" || !shareTitle.trim()}
                >
                  {busy === "share" ? "Preparing..." : "Prepare Share Pack"}
                </button>
              </div>
            </form>
          ) : null}

          {tab === "attachment" ? (
            <form
              id="project-overview-panel-attachment"
              role="tabpanel"
              aria-labelledby="project-overview-tab-attachment"
              className="wm-project-form"
              onSubmit={(event) => {
                void handleAttachment(event);
              }}
            >
              <div className="wm-project-form-grid">
                <label className="wm-project-field">
                  <span>Attachment name</span>
                  <input
                    className="wm-form-input"
                    value={attachmentName}
                    onChange={(event) => setAttachmentName(event.currentTarget.value)}
                    placeholder="Network diagram, room brief, proposal PDF..."
                  />
                </label>

                <label className="wm-project-field">
                  <span>Type</span>
                  <select
                    className="wm-form-input"
                    value={attachmentKind}
                    onChange={(event) =>
                      setAttachmentKind(
                        event.currentTarget.value as "document" | "diagram" | "brief" | "other",
                      )
                    }
                  >
                    <option value="document">Document</option>
                    <option value="diagram">Diagram</option>
                    <option value="brief">Brief</option>
                    <option value="other">Other</option>
                  </select>
                </label>

                <label className="wm-project-field wm-project-field--span">
                  <span>Source link or file path</span>
                  <input
                    className="wm-form-input"
                    value={attachmentSource}
                    onChange={(event) => setAttachmentSource(event.currentTarget.value)}
                    placeholder="https://... or C:\path\to\file"
                  />
                </label>

                <label className="wm-project-field wm-project-field--span">
                  <span>Summary</span>
                  <textarea
                    className="wm-form-input"
                    rows={5}
                    value={attachmentSummary}
                    onChange={(event) => setAttachmentSummary(event.currentTarget.value)}
                    placeholder="Explain what the file contains and why it matters."
                  />
                </label>
              </div>

              <div className="wm-action-row">
                <button
                  type="submit"
                  className="wm-btn-primary"
                  disabled={
                    busy === "attachment" ||
                    !attachmentName.trim() ||
                    !attachmentSource.trim()
                  }
                >
                  {busy === "attachment" ? "Registering..." : "Register Attachment"}
                </button>
              </div>
            </form>
          ) : null}

          {tab === "handoff" ? (
            <form
              id="project-overview-panel-handoff"
              role="tabpanel"
              aria-labelledby="project-overview-tab-handoff"
              className="wm-project-form"
              onSubmit={(event) => {
                void handleHandoff(event);
              }}
            >
              <div className="wm-project-commercial-state">
                <span>Commercial gate</span>
                <strong>
                  {isCommercialReady
                    ? "Already marked commercial ready"
                    : "Awaiting final handoff"}
                </strong>
              </div>

              <label className="wm-project-field">
                <span>Completion note</span>
                <textarea
                  className="wm-form-input"
                  rows={7}
                  value={handoffNote}
                  onChange={(event) => setHandoffNote(event.currentTarget.value)}
                  placeholder="Summarize what is confirmed and what the next team should pick up from here."
                />
              </label>

              <div className="wm-action-row">
                <button
                  type="submit"
                  className="wm-btn-primary"
                  disabled={busy === "handoff" || !handoffNote.trim()}
                >
                  {busy === "handoff" ? "Confirming..." : "Mark Commercial Ready"}
                </button>
              </div>
            </form>
          ) : null}

          {status ? (
            <div className={statusClass} role="status" aria-live="polite">
              {status.text}
            </div>
          ) : null}
        </section>

        <aside className="wm-card wm-project-activity-card">
          <div className="wm-section-header">
            <div>
              <h2 className="wm-section-title">Recent activity</h2>
              <p className="wm-section-copy">
                Supporting detail sits here so the main action area stays focused.
              </p>
            </div>
          </div>

          <section className="wm-project-activity-section">
            <div className="wm-project-activity-head">
              <h3>Comments</h3>
              <span>{project.comments?.length ?? 0}</span>
            </div>

            {comments.length > 0 ? (
              <div className="wm-project-activity-list">
                {comments.map((item) => (
                  <article key={item.id} className="wm-project-activity-item">
                    <span className="wm-project-activity-eyebrow">
                      {formatAudience(item.audience)}
                    </span>
                    <strong className="wm-project-activity-title">{item.authorName}</strong>
                    <div className="wm-project-activity-copy">{item.body}</div>
                    <span className="wm-project-activity-meta">
                      {formatDateTime(item.createdAt)}
                    </span>
                  </article>
                ))}
              </div>
            ) : (
              <div className="wm-empty-state">No comments have been captured yet.</div>
            )}
          </section>

          <section className="wm-project-activity-section">
            <div className="wm-project-activity-head">
              <h3>Share packs</h3>
              <span>{project.shares?.length ?? 0}</span>
            </div>

            {shares.length > 0 ? (
              <div className="wm-project-activity-list">
                {shares.map((item) => (
                  <article key={item.id} className="wm-project-activity-item">
                    <span className="wm-project-activity-eyebrow">
                      {formatAudience(item.audience)}
                    </span>
                    <strong className="wm-project-activity-title">{item.title}</strong>
                    <div className="wm-project-activity-copy">
                      {item.summaryHeadline || item.message || "No summary headline captured."}
                    </div>
                    <span className="wm-project-activity-meta">
                      {formatDateTime(item.createdAt)}
                      {item.status ? ` / ${item.status}` : ""}
                    </span>
                  </article>
                ))}
              </div>
            ) : (
              <div className="wm-empty-state">No share packs have been prepared yet.</div>
            )}
          </section>

          <section className="wm-project-activity-section">
            <div className="wm-project-activity-head">
              <h3>Attachments</h3>
              <span>{project.attachments?.length ?? 0}</span>
            </div>

            {attachments.length > 0 ? (
              <div className="wm-project-activity-list">
                {attachments.map((item) => (
                  <article key={item.id} className="wm-project-activity-item">
                    <span className="wm-project-activity-eyebrow">{item.kind}</span>
                    <strong className="wm-project-activity-title">{item.name}</strong>
                    <div className="wm-project-activity-copy">
                      {item.summary || item.source}
                    </div>
                    <span className="wm-project-activity-meta">
                      {formatDateTime(item.uploadedAt)}
                    </span>
                  </article>
                ))}
              </div>
            ) : (
              <div className="wm-empty-state">No attachments have been registered yet.</div>
            )}
          </section>

          <section className="wm-project-activity-section">
            <div className="wm-project-activity-head">
              <h3>Audit trail</h3>
              <span>{project.auditTrail?.length ?? 0}</span>
            </div>

            {audit.length > 0 ? (
              <div className="wm-project-activity-list">
                {audit.map((item) => (
                  <article key={item.id} className="wm-project-activity-item">
                    <span className="wm-project-activity-eyebrow">{item.action}</span>
                    <strong className="wm-project-activity-title">{item.detail}</strong>
                    <span className="wm-project-activity-meta">
                      {item.actorName} / {formatDateTime(item.createdAt)}
                    </span>
                  </article>
                ))}
              </div>
            ) : (
              <div className="wm-empty-state">No audit events have been recorded yet.</div>
            )}
          </section>
        </aside>
      </section>

      <section className="wm-section">
        <div className="wm-section-header">
          <div>
            <h2 className="wm-section-title">Working notes</h2>
            <p className="wm-section-copy">
              Captured rationale and imported commercial context stay readable here.
            </p>
          </div>
        </div>

        <div className="wm-project-notes-body">{notes}</div>
      </section>
    </div>
  );
}