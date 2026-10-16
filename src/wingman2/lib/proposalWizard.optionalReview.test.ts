import { describe, expect, it } from "vitest";
import { computeProposalReadiness } from "./proposalWizard";

describe("optional proposal review", () => {
  it("does not deduct readiness or request sign-off when review checkboxes are absent", () => {
    const input = { discoveryPercent: 100, executiveSummary: "Boardroom", proposedSolution: "Local presentation", architectureNarrative: "Direct HDMI", customerName: "Customer", projectName: "Room", preparedBy: "Designer", proposalReference: "ROOM-1", bomRowCount: 1, continueWithoutBom: false, commercialPricingComplete: true, technicalBlockerCount: 0, solutionConfirmed: false, reviewConfirmed: false };
    const result = computeProposalReadiness(input);
    expect(result.score).toBe(100);
    expect(result.missing).toEqual([]);
    expect(computeProposalReadiness({ ...input, solutionConfirmed: true, reviewConfirmed: true })).toEqual(result);
    expect(computeProposalReadiness({ ...input, technicalBlockerCount: 1 }).missing.join(" ")).toContain("technical assurance blocker");
  });
});
