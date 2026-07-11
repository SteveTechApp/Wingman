import { describe, expect, it } from "vitest";
import type { StoredProjectProposal } from "../data/projectStore";
import { buildProposalHtml } from "./proposalExport";

describe("proposal safety standard", () => {
  it("separates every required customer-safe output section", () => {
    const proposal: StoredProjectProposal = {
      title: "Test proposal",
      summary: "Confirmed room requirement.",
      sections: [],
      products: [],
      assumptions: ["Display location requires confirmation."],
      updatedAt: "2026-06-28T00:00:00.000Z",
    };

    const html = buildProposalHtml(proposal, []);
    for (const heading of [
      "Executive Summary",
      "Customer Requirement",
      "Recommended Solution",
      "Practical Operation",
      "Commercial and Operational Benefits",
      "Technical Architecture",
      "Equipment Schedule",
      "Options",
      "Assumptions and Exclusions",
      "Risks and Dependencies",
      "Implementation and Next Steps",
    ]) {
      expect(html).toContain(`<h2>${heading}</h2>`);
    }
  });

  it("labels assumptions, risks and options rather than blending them into prose", () => {
    const proposal: StoredProjectProposal = {
      title: "Labelled proposal",
      summary: "Confirmed requirement for a labelled test.",
      sections: [],
      products: [],
      assumptions: ["Assume the network is AV-over-IP ready."],
      governanceWarnings: ["Confirm cable distance before order."],
      updatedAt: "2026-06-28T00:00:00.000Z",
    };

    const html = buildProposalHtml(proposal, [
      {
        item: 1,
        sku: "NHD-500-TX",
        description: "NetworkHD 500 encoder",
        role: "Source endpoint",
        qty: 2,
        type: "Optional",
        status: "optional",
        evidence: "Assumes two sources.",
        notes: "Confirm source count.",
      },
    ]);

    expect(html).toContain("<strong>Assumption:</strong>");
    expect(html).toContain("<strong>Risk:</strong>");
    expect(html).toContain("<strong>Option:</strong>");
  });

  it("lists BY-OTHERS rows as explicit exclusions from the WyreStorm scope", () => {
    const proposal: StoredProjectProposal = {
      title: "Exclusions proposal",
      summary: "Confirmed requirement.",
      sections: [],
      products: [],
      assumptions: [],
      updatedAt: "2026-06-28T00:00:00.000Z",
    };

    const html = buildProposalHtml(proposal, [
      {
        item: 1,
        sku: "BY-OTHERS-NETWORK-INFRASTRUCTURE",
        description: "Managed network switch and configuration",
        role: "Network infrastructure by others",
        qty: 1,
        type: "Validate",
        status: "validate",
        evidence: "Placeholder row.",
        notes: "Confirm switch model.",
      },
    ]);

    expect(html).toContain("Specifically excluded from this WyreStorm equipment schedule, provided by others");
    expect(html).toContain("BY-OTHERS-NETWORK-INFRASTRUCTURE");
  });
});
