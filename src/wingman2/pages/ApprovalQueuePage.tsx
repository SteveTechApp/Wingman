import { useState } from "react";
import {
  CheckCircle,
  Clock,
  FileText,
  XCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import { PageHero } from "../components/PageHero";
import {
  usePendingApprovals,
  useApproveProposal,
  useRejectProposal,
  type PendingProposal,
} from "../data/approvalStore";
import { useProjectStore } from "../data/projectStore";

/* ------------------------------------------------------------------ */
/*  Approval status badge                                              */
/* ------------------------------------------------------------------ */

export function ApprovalStatusBadge({
  status,
}: {
  status: string | undefined;
}) {
  const map: Record<string, { icon: typeof Clock; label: string; cls: string }> = {
    draft: { icon: FileText, label: "Draft", cls: "wm-approval-badge--draft" },
    pending: { icon: Clock, label: "Awaiting review", cls: "wm-approval-badge--pending" },
    approved: { icon: CheckCircle, label: "Approved", cls: "wm-approval-badge--approved" },
    rejected: { icon: XCircle, label: "Changes requested", cls: "wm-approval-badge--rejected" },
  };
  const info = map[status || "draft"] || map.draft;
  const Icon = info.icon;

  return (
    <span className={`wm-approval-badge ${info.cls}`}>
      <Icon size={13} />
      {info.label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Comment modal                                                      */
/* ------------------------------------------------------------------ */

function CommentModal({
  title,
  onSubmit,
  onClose,
}: {
  title: string;
  onSubmit: (comment: string) => void;
  onClose: () => void;
}) {
  const [comment, setComment] = useState("");

  return (
    <div className="wm-modal-backdrop" role="button" aria-label="Close comment dialog" tabIndex={-1} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} onKeyDown={(e) => { if (e.key === "Escape" || e.key === "Enter" || e.key === " ") onClose(); }}>
      <div
        className="wm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="comment-modal-title"
      >
        <h3 id="comment-modal-title">{title}</h3>
        <textarea
          className="wm-modal-textarea"
          rows={4}
          placeholder="Add comments for the proposer (required for rejection, optional for approval)..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <div className="wm-modal-actions">
          <button
            type="button"
            className="wm-button is-secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="wm-button is-primary"
            onClick={() => onSubmit(comment)}
            disabled={title.includes("Reject") && !comment.trim()}
          >
            {title.includes("Reject") ? "Reject with comments" : "Approve"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Proposal card                                                      */
/* ------------------------------------------------------------------ */

function ProposalCard({
  item,
  onApprove,
  onReject,
}: {
  item: PendingProposal;
  onApprove: (projectId: string) => void;
  onReject: (projectId: string) => void;
}) {
  const daysAgo = Math.floor(
    (Date.now() - new Date(item.submittedAt).getTime()) / 86_400_000,
  );

  return (
    <div className="wm-approval-card">
      <div className="wm-approval-card-header">
        <div>
          <Link
            to={`${routeCatalogByKey.projects.path}/${item.projectId}`}
            className="wm-approval-card-title"
          >
            <FileText size={16} />
            {item.proposal.title || item.projectName}
          </Link>
          <span className="wm-approval-card-meta">
            {item.projectName} · submitted by {item.submittedBy} ·{" "}
            {daysAgo === 0 ? "today" : `${daysAgo}d ago`}
          </span>
        </div>
        <ApprovalStatusBadge status="pending" />
      </div>

      {item.proposal.summary && (
        <p className="wm-approval-card-summary">{item.proposal.summary}</p>
      )}

      <div className="wm-approval-card-details">
        {item.proposal.products.length > 0 && (
          <span className="wm-approval-card-tag">
            {item.proposal.products.length} product{item.proposal.products.length !== 1 ? "s" : ""}
          </span>
        )}
        {item.proposal.readinessScore !== undefined && (
          <span
            className={`wm-approval-card-tag ${item.proposal.readinessScore >= 100 ? "wm-approval-card-tag--green" : ""}`}
          >
            {item.proposal.readinessScore}% ready
          </span>
        )}
        {item.proposal.assumptions.length > 0 && (
          <span className="wm-approval-card-tag">
            {item.proposal.assumptions.length} assumption{item.proposal.assumptions.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div className="wm-approval-card-actions">
        <button
          type="button"
          className="wm-button is-primary"
          onClick={() => onApprove(item.projectId)}
        >
          <CheckCircle size={14} /> Approve
        </button>
        <button
          type="button"
          className="wm-button is-danger"
          onClick={() => onReject(item.projectId)}
        >
          <XCircle size={14} /> Request changes
        </button>
        <Link
          to={`${routeCatalogByKey.projects.path}/${item.projectId}`}
          className="wm-button is-secondary"
        >
          View project
        </Link>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Approval history                                                   */
/* ------------------------------------------------------------------ */

function ApprovalHistory() {
  const { projects } = useProjectStore();

  const recentDecisions = projects
    .filter(
      (p) =>
        p.proposal?.approvalStatus === "approved" ||
        p.proposal?.approvalStatus === "rejected",
    )
    .map((p) => ({
      projectId: p.id,
      projectName: p.name,
      title: p.proposal!.title,
      status: p.proposal!.approvalStatus!,
      by: p.proposal!.approvedBy || "unknown",
      at: p.proposal!.approvedAt || "",
      comments: p.proposal!.approvalComments,
    }))
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 10);

  if (recentDecisions.length === 0) return null;

  return (
    <section className="wm-approval-history">
      <h2>Recent decisions</h2>
      <div className="wm-approval-history-list">
        {recentDecisions.map((d) => (
          <div
            key={d.projectId}
            className={`wm-approval-history-item wm-approval-history-item--${d.status}`}
          >
            <div className="wm-approval-history-header">
              <ApprovalStatusBadge status={d.status} />
              <span className="wm-approval-history-title">{d.title}</span>
              <span className="wm-approval-history-meta">
                {d.by} · {new Date(d.at).toLocaleDateString()}
              </span>
            </div>
            {d.comments && (
              <p className="wm-approval-history-comments">"{d.comments}"</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export function ApprovalQueuePage() {
  const pending = usePendingApprovals();
  const approveProposal = useApproveProposal();
  const rejectProposal = useRejectProposal();
  const [modal, setModal] = useState<{
    type: "approve" | "reject";
    projectId: string;
  } | null>(null);

  function handleApprove(projectId: string) {
    setModal({ type: "approve", projectId });
  }

  function handleReject(projectId: string) {
    setModal({ type: "reject", projectId });
  }

  function submitDecision(comments: string) {
    if (!modal) return;
    // TODO: replace "Manager" with actual user identity when auth is wired
    const reviewer = "Manager";
    if (modal.type === "approve") {
      approveProposal(modal.projectId, reviewer, comments);
    } else {
      rejectProposal(modal.projectId, reviewer, comments);
    }
    setModal(null);
  }

  return (
    <main
      className="wm-page wm-polish-shell"
      data-wingman-page="approval-queue"
      aria-label="Proposal approval queue"
    >
      <PageHero
        eyebrow="Approval"
        title="Proposal approval queue"
        purpose="Review and approve proposals before they go to customers."
        nextMove="Select a pending proposal to review its details, then approve or request changes."
        actions={[
          {
            label: "Back to dashboard",
            to: routeCatalogByKey.dashboard.path,
          },
        ]}
      />

      {pending.length === 0 ? (
        <div className="wm-approval-empty">
          <CheckCircle size={40} className="wm-approval-empty-icon" />
          <h2>All clear</h2>
          <p>No proposals are awaiting review right now.</p>
          <Link to={routeCatalogByKey.projects.path} className="wm-button is-secondary">
            View all projects
          </Link>
        </div>
      ) : (
        <section className="wm-approval-list" aria-label="Pending proposals">
          <div className="wm-approval-list-header">
            <h2>{pending.length} proposal{pending.length !== 1 ? "s" : ""} awaiting review</h2>
          </div>
          {pending.map((item) => (
            <ProposalCard
              key={item.projectId}
              item={item}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
        </section>
      )}

      <ApprovalHistory />

      {modal && (
        <CommentModal
          title={
            modal.type === "approve"
              ? "Approve proposal"
              : "Request changes"
          }
          onSubmit={submitDecision}
          onClose={() => setModal(null)}
        />
      )}
    </main>
  );
}

export default ApprovalQueuePage;
