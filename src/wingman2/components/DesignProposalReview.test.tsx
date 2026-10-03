import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DesignProposalReview } from "./DesignProposalReview";

describe("DesignProposalReview", () => {
  it("shows the customer-to-design trace, role gap and contextual product reason", () => {
    render(<DesignProposalReview revision={{ schemaVersion: 1, revisionId: "dp1-abcd", contentHash: "dp1-abcd", projectId: "p", projectName: "Room", compiledAt: "2026-09-07", customerRequirement: "Two laptops to two displays", interpretedRequirement: "Independent switching is required", architecture: "4x2 matrix with extended outputs", requirements: [{ id: "r", customerStatement: "Two laptops", interpretation: "Two HDMI inputs", designConsequence: "Provide two source inputs", source: "Customer", state: "confirmed", confidence: "high" }], roleCoverage: [{ role: "source", label: "Sources and source connections", required: true, covered: true, evidence: ["2 × HDMI"], requirementIds: ["r"] }, { role: "audio", label: "Audio path", required: true, covered: false, evidence: [], requirementIds: [] }], productOverviews: [{ sku: "MX-0402-MST", name: "4x2 matrix", quantity: 1, designRole: "Matrix", requirementIds: ["r"], reason: "Selected to address: Two laptops", proof: ["Four inputs"], dependencies: [], validation: ["Confirm outputs"] }], assumptions: [], blockers: ["Complete the audio path design role."], warnings: [], canIssue: false }} />);
    expect(screen.getByText("Customer requirement")).toBeTruthy();
    expect(screen.getByText("Independent switching is required")).toBeTruthy();
    expect(screen.getByText("Complete the audio path design role.")).toBeTruthy();
    expect(screen.getByText("Selected to address: Two laptops")).toBeTruthy();
  });
});
