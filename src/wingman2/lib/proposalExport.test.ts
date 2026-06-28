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
      "Confirmed Requirement",
      "Design Assumptions",
      "Recommended Architecture",
      "Required WyreStorm Products",
      "Optional Enhancements",
      "Risks / Needs Validation",
      "Next Steps",
    ]) {
      expect(html).toContain(`<h2>${heading}</h2>`);
    }
  });
});
