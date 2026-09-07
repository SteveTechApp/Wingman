import type { StoredProject } from "../data/projectStore";
import { updateStoredProject } from "../data/projectStore";

function nowIso() { return new Date().toISOString(); }

export function withSubmittedDesignRevision(project: StoredProject, submittedBy: string, submittedAt = nowIso()): StoredProject {
  if (!project.proposal?.designRevision) return project;
  return { ...project, proposal: { ...project.proposal, approvalStatus: "pending", submittedBy, submittedAt, submittedRevisionHash: project.proposal.designRevision.contentHash, approvedBy: undefined, approvedAt: undefined, approvedRevisionHash: undefined } };
}

export function withApprovedDesignRevision(project: StoredProject, approvedBy: string, comments = "", approvedAt = nowIso()): StoredProject {
  if (!project.proposal?.designRevision || project.proposal.submittedRevisionHash !== project.proposal.designRevision.contentHash) return project;
  return { ...project, proposal: { ...project.proposal, approvalStatus: "approved", approvedBy, approvedAt, approvalComments: comments || project.proposal.approvalComments, approvedRevisionHash: project.proposal.designRevision.contentHash } };
}

export function submitProjectDesignRevision(projectId: string, submittedBy: string) {
  return updateStoredProject(projectId, (project) => withSubmittedDesignRevision(project, submittedBy));
}

export function approveProjectDesignRevision(projectId: string, approvedBy: string, comments = "") {
  return updateStoredProject(projectId, (project) => withApprovedDesignRevision(project, approvedBy, comments));
}
