import { useCallback, useMemo } from "react";
import {
  useProjectStore,
  upsertStoredProject,
  type ProposalApprovalStatus,
  type StoredProjectProposal,
} from "./projectStore";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type ApprovalAction = "submit" | "approve" | "reject";

export type ApprovalDecision = {
  action: ApprovalAction;
  proposalTitle: string;
  projectId: string;
  by: string;
  at: string;
  comments?: string;
};

export type PendingProposal = {
  projectId: string;
  projectName: string;
  proposal: StoredProjectProposal;
  submittedBy: string;
  submittedAt: string;
};

/* ------------------------------------------------------------------ */
/*  Approval actions                                                   */
/* ------------------------------------------------------------------ */

/**
 * Submit a proposal for approval. Sets status to "pending".
 */
export function useSubmitForApproval() {
  const { projects } = useProjectStore();

  return useCallback(
    (projectId: string, submittedBy: string) => {
      const project = projects.find((p) => p.id === projectId);
      if (!project?.proposal) return false;

      const proposal: StoredProjectProposal = {
        ...project.proposal,
        approvalStatus: "pending" as ProposalApprovalStatus,
        submittedBy,
        submittedAt: new Date().toISOString(),
        // Clear previous approval if re-submitting
        approvedBy: undefined,
        approvedAt: undefined,
        approvalComments: undefined,
      };

      upsertStoredProject({
        ...project,
        proposal,
        updatedAt: new Date().toISOString(),
      });
      return true;
    },
    [projects],
  );
}

/**
 * Approve a proposal. Sets status to "approved".
 */
export function useApproveProposal() {
  const { projects } = useProjectStore();

  return useCallback(
    (projectId: string, approvedBy: string, comments?: string) => {
      const project = projects.find((p) => p.id === projectId);
      if (!project?.proposal) return false;

      const proposal: StoredProjectProposal = {
        ...project.proposal,
        approvalStatus: "approved" as ProposalApprovalStatus,
        approvedBy,
        approvedAt: new Date().toISOString(),
        approvalComments: comments || project.proposal.approvalComments,
      };

      upsertStoredProject({
        ...project,
        proposal,
        updatedAt: new Date().toISOString(),
      });
      return true;
    },
    [projects],
  );
}

/**
 * Reject a proposal. Sets status to "rejected" with comments.
 */
export function useRejectProposal() {
  const { projects } = useProjectStore();

  return useCallback(
    (projectId: string, rejectedBy: string, comments: string) => {
      const project = projects.find((p) => p.id === projectId);
      if (!project?.proposal) return false;

      const proposal: StoredProjectProposal = {
        ...project.proposal,
        approvalStatus: "rejected" as ProposalApprovalStatus,
        approvedBy: rejectedBy,
        approvedAt: new Date().toISOString(),
        approvalComments: comments,
      };

      upsertStoredProject({
        ...project,
        proposal,
        updatedAt: new Date().toISOString(),
      });
      return true;
    },
    [projects],
  );
}

/**
 * Recall a proposal from review (back to draft).
 */
export function useRecallProposal() {
  const { projects } = useProjectStore();

  return useCallback(
    (projectId: string) => {
      const project = projects.find((p) => p.id === projectId);
      if (!project?.proposal) return false;

      const proposal: StoredProjectProposal = {
        ...project.proposal,
        approvalStatus: "draft" as ProposalApprovalStatus,
        submittedBy: undefined,
        submittedAt: undefined,
        approvedBy: undefined,
        approvedAt: undefined,
        approvalComments: undefined,
      };

      upsertStoredProject({
        ...project,
        proposal,
        updatedAt: new Date().toISOString(),
      });
      return true;
    },
    [projects],
  );
}

/* ------------------------------------------------------------------ */
/*  Derived state hooks                                                */
/* ------------------------------------------------------------------ */

/**
 * Get all proposals pending approval.
 */
export function usePendingApprovals(): PendingProposal[] {
  const { projects } = useProjectStore();

  return useMemo(() => {
    return projects
      .filter(
        (p) =>
          p.proposal?.approvalStatus === "pending" && p.proposal.submittedBy,
      )
      .map((p) => ({
        projectId: p.id,
        projectName: p.name,
        proposal: p.proposal!,
        submittedBy: p.proposal!.submittedBy!,
        submittedAt: p.proposal!.submittedAt || "",
      }))
      .sort(
        (a, b) =>
          new Date(b.submittedAt).getTime() -
          new Date(a.submittedAt).getTime(),
      );
  }, [projects]);
}

/**
 * Get the approval status for a specific project's proposal.
 */
export function useProposalApprovalStatus(
  projectId: string,
): ProposalApprovalStatus {
  const { projects } = useProjectStore();
  const project = projects.find((p) => p.id === projectId);
  return project?.proposal?.approvalStatus || "draft";
}

/**
 * Check if a proposal can be exported (approved or no approval required).
 */
export function useCanExportProposal(projectId: string): boolean {
  const status = useProposalApprovalStatus(projectId);
  // "draft" proposals can be exported (approval not yet submitted)
  // "approved" proposals can be exported
  // "pending" and "rejected" cannot
  return status === "draft" || status === "approved";
}
