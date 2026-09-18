import { describe, expect, it } from "vitest";
import { ProposalApprovalError, canPublishProposal, decideProposalApproval } from "./proposal-approval.mjs";

const actor = { id: "user-1", name: "Ava Admin", email: "ava@example.com" };
const project = {
  id: "p1",
  updatedAt: "2026-09-17T09:00:00.000Z",
  proposal: {
    title: "Room",
    approvalStatus: "pending",
    submittedRevisionHash: "hash-1",
    designRevision: { contentHash: "hash-1" },
  },
};

describe("decideProposalApproval", () => {
  it("stores the authenticated actor and ignores request-body identity", () => {
    const result = decideProposalApproval({ projectId: "p1", expectedRevisionHash: "hash-1", decision: "approve", approvedBy: "Manager" }, actor, project, "2026-09-17T10:00:00.000Z");
    expect(result.project.proposal.approvedBy).toBe("Ava Admin");
    expect(result.project.proposal.approvedRevisionHash).toBe("hash-1");
    expect(result.auditEvent.userId).toBe("user-1");
  });

  it("rejects a stale canonical hash with 409", () => {
    expect(() => decideProposalApproval({ projectId: "p1", expectedRevisionHash: "old", decision: "approve" }, actor, project)).toThrowError(ProposalApprovalError);
    try { decideProposalApproval({ projectId: "p1", expectedRevisionHash: "old", decision: "approve" }, actor, project); } catch (error) { expect(error.statusCode).toBe(409); }
  });

  it("requires a rejection comment", () => {
    expect(() => decideProposalApproval({ projectId: "p1", expectedRevisionHash: "hash-1", decision: "reject" }, actor, project)).toThrow(/comment is required/i);
  });

  it("makes an identical retry idempotent", () => {
    const first = decideProposalApproval({ projectId: "p1", expectedRevisionHash: "hash-1", decision: "approve" }, actor, project);
    const retry = decideProposalApproval({ projectId: "p1", expectedRevisionHash: "hash-1", decision: "approve" }, actor, first.project);
    expect(retry.idempotent).toBe(true);
    expect(retry.auditEvent).toBeNull();
  });

  it("allows publication only for the approved canonical revision", () => {
    const approved = decideProposalApproval({ projectId: "p1", expectedRevisionHash: "hash-1", decision: "approve" }, actor, project).project;
    expect(canPublishProposal(approved)).toBe(true);
    expect(canPublishProposal({ ...approved, proposal: { ...approved.proposal, designRevision: { contentHash: "hash-2" } } })).toBe(false);
  });
});
