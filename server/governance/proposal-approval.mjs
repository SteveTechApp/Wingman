export class ProposalApprovalError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.name = "ProposalApprovalError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

function tidy(value) {
  return String(value ?? "").trim();
}

/** Apply an authenticated approval decision to one canonical project revision. */
export function decideProposalApproval(input, actor, project, now = new Date().toISOString()) {
  const projectId = tidy(input?.projectId);
  const expectedRevisionHash = tidy(input?.expectedRevisionHash);
  const decision = tidy(input?.decision).toLowerCase();
  const comment = tidy(input?.comment);
  const actorId = tidy(actor?.id);
  const actorName = tidy(actor?.name) || tidy(actor?.email);

  if (!projectId || !expectedRevisionHash || !["approve", "reject"].includes(decision)) {
    throw new ProposalApprovalError(422, "validation", "Project, revision hash, and an approve or reject decision are required.");
  }
  if (!actorId || !actorName) {
    throw new ProposalApprovalError(401, "authentication", "An authenticated reviewer is required.");
  }
  if (!project || tidy(project.id) !== projectId || !project.proposal) {
    throw new ProposalApprovalError(404, "not_found", "Project proposal not found.");
  }
  if (decision === "reject" && !comment) {
    throw new ProposalApprovalError(422, "comment_required", "A comment is required when requesting changes.");
  }

  const canonicalRevisionHash = tidy(project.proposal.designRevision?.contentHash);
  if (!canonicalRevisionHash || canonicalRevisionHash !== expectedRevisionHash) {
    throw new ProposalApprovalError(409, "stale_revision", "The proposal changed after this review began. Reload it and review the current revision.");
  }
  if (tidy(project.proposal.submittedRevisionHash) !== canonicalRevisionHash) {
    throw new ProposalApprovalError(409, "not_submitted", "This revision is not the revision currently submitted for approval.");
  }

  const targetStatus = decision === "approve" ? "approved" : "rejected";
  const alreadyApplied = project.proposal.approvalStatus === targetStatus
    && tidy(project.proposal.approvedRevisionHash) === (decision === "approve" ? canonicalRevisionHash : "")
    && tidy(project.proposal.approvedBy) === actorName
    && tidy(project.proposal.approvalComments) === comment;
  if (alreadyApplied) return { project, auditEvent: null, idempotent: true };
  if (project.proposal.approvalStatus !== "pending") {
    throw new ProposalApprovalError(409, "not_pending", "This proposal is no longer awaiting a decision.");
  }

  const proposal = {
    ...project.proposal,
    approvalStatus: targetStatus,
    approvedBy: actorName,
    approvedAt: now,
    approvalComments: comment || undefined,
    approvedRevisionHash: decision === "approve" ? canonicalRevisionHash : undefined,
  };
  const auditEvent = {
    id: `proposal-decision-${projectId}-${canonicalRevisionHash}-${decision}`,
    scope: "proposal",
    action: decision === "approve" ? "approved" : "changes_requested",
    detail: decision === "approve" ? "Proposal revision approved for customer publication." : "Proposal revision returned for changes.",
    projectId,
    userId: actorId,
    userName: actorName,
    actorName,
    actorEmail: tidy(actor?.email),
    at: now,
    createdAt: now,
    revisionHash: canonicalRevisionHash,
  };
  return {
    project: { ...project, proposal, updatedAt: now },
    auditEvent,
    idempotent: false,
  };
}

export function canPublishProposal(project) {
  const proposal = project?.proposal;
  const canonicalRevisionHash = tidy(proposal?.designRevision?.contentHash);
  return Boolean(canonicalRevisionHash)
    && proposal?.approvalStatus === "approved"
    && tidy(proposal?.approvedRevisionHash) === canonicalRevisionHash;
}
