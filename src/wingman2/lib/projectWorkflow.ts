import type { StoredProject } from "../data/projectStore";
import { updateStoredProject } from "../data/projectStore";
import { compileDesignProposal } from "./designProposal";

function nowIso() { return new Date().toISOString(); }

export function withRefreshedDesignRevision(project: StoredProject, compiledAt = nowIso()): StoredProject {
  if (!project.proposal) return project;
  const designRevision = compileDesignProposal(project, compiledAt);
  const approvalStillMatches = project.proposal.approvedRevisionHash === designRevision.contentHash;
  return {
    ...project,
    proposal: {
      ...project.proposal,
      designRevision,
      ...(project.proposal.approvalStatus === "approved" && !approvalStillMatches
        ? { approvalStatus: "draft" as const, approvedBy: undefined, approvedAt: undefined, approvedRevisionHash: undefined, approvalComments: "Approval cleared because the design changed." }
        : {}),
    },
    updatedAt: compiledAt,
  };
}

export function withSubmittedDesignRevision(project: StoredProject, submittedBy: string, submittedAt = nowIso()): StoredProject {
  const current = withRefreshedDesignRevision(project, submittedAt);
  if (!current.proposal?.designRevision) return current;
  return { ...current, proposal: { ...current.proposal, approvalStatus: "pending", submittedBy, submittedAt, submittedRevisionHash: current.proposal.designRevision.contentHash, approvedBy: undefined, approvedAt: undefined, approvedRevisionHash: undefined } };
}

export function withApprovedDesignRevision(project: StoredProject, approvedBy: string, comments = "", approvedAt = nowIso()): StoredProject {
  const current = withRefreshedDesignRevision(project, approvedAt);
  if (!current.proposal?.designRevision || current.proposal.submittedRevisionHash !== current.proposal.designRevision.contentHash) return current;
  return { ...current, proposal: { ...current.proposal, approvalStatus: "approved", approvedBy, approvedAt, approvalComments: comments || current.proposal.approvalComments, approvedRevisionHash: current.proposal.designRevision.contentHash } };
}

export function refreshProjectDesignRevision(projectId: string) {
  return updateStoredProject(projectId, (project) => withRefreshedDesignRevision(project));
}

export function submitProjectDesignRevision(projectId: string, submittedBy: string) {
  return updateStoredProject(projectId, (project) => withSubmittedDesignRevision(project, submittedBy));
}

export function approveProjectDesignRevision(projectId: string, approvedBy: string, comments = "") {
  return updateStoredProject(projectId, (project) => withApprovedDesignRevision(project, approvedBy, comments));
}
