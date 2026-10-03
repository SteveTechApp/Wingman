import { useCallback, useMemo } from "react";
import {
  useProjectStore,
  upsertStoredProject,
  type ProposalApprovalStatus,
  type StoredProjectProposal,
} from "./projectStore";
import { withSubmittedDesignRevision } from "../lib/projectWorkflow";
import { postWingmanJson } from "../api/wingmanApi";

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

type ProposalDecisionResponse = {
  ok: boolean;
  project: ReturnType<typeof useProjectStore>["projects"][number];
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

      upsertStoredProject(withSubmittedDesignRevision(project, submittedBy));
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
    async (projectId: string, _approvedBy?: string, comments?: string) => {
      const project = projects.find((p) => p.id === projectId);
      const expectedRevisionHash = project?.proposal?.designRevision?.contentHash;
      if (!project?.proposal || !expectedRevisionHash) return false;
      const response = await postWingmanJson<ProposalDecisionResponse>(`/api/wingman/projects/${encodeURIComponent(projectId)}/proposal-decision`, {
        expectedRevisionHash,
        decision: "approve",
        comment: comments,
      });
      upsertStoredProject(response.project);
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
    async (projectId: string, _rejectedBy: string | undefined, comments: string) => {
      const project = projects.find((p) => p.id === projectId);
      const expectedRevisionHash = project?.proposal?.designRevision?.contentHash;
      if (!project?.proposal || !expectedRevisionHash) return false;
      const response = await postWingmanJson<ProposalDecisionResponse>(`/api/wingman/projects/${encodeURIComponent(projectId)}/proposal-decision`, {
        expectedRevisionHash,
        decision: "reject",
        comment: comments,
      });
      upsertStoredProject(response.project);
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
  const { projects } = useProjectStore();
  const proposal = projects.find((project) => project.id === projectId)?.proposal;
  return proposal?.approvalStatus === "approved"
    && Boolean(proposal.designRevision?.contentHash)
    && proposal.approvedRevisionHash === proposal.designRevision?.contentHash;
}
