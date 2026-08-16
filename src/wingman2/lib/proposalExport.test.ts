import { describe, expect, it } from "vitest";
import type { StoredProjectProposal, StoredProductSelection } from "../data/projectStore";
import { buildBomCsv, buildBomRows, buildProposalHtml } from "./proposalExport";

describe("BOM export rows", () => {
  it("carries captured quantities instead of assuming one unit per line", () => {
    const products: StoredProductSelection[] = [
      { sku: "NHD-120-TX", title: "NetworkHD 100 encoder", quantity: 4 },
      { sku: "MX-0808-SCL", title: "8x8 matrix", quantity: 1 },
      { sku: "RX-700", title: "HDBaseT receiver" },
    ];

    const rows = buildBomRows(products);
    expect(rows.map((row) => `${row.sku}x${row.qty}`)).toEqual(["NHD-120-TXx4", "MX-0808-SCLx1", "RX-700x1"]);
    expect(buildBomCsv(rows)).toContain('"NHD-120-TX","NetworkHD 100 encoder","Core product","4"');
  });

  it("carries the Compare verdict confidence into the exported evidence basis", () => {
    // The Compare page prepends "Compare verdict: <tier>" to a committed
    // selection's evidence, and the BOM evidence basis takes evidence[0] - so
    // a quoted comparison keeps the same explicit confidence label a rep saw
    // on screen, in both the HTML export and the CSV.
    const products: StoredProductSelection[] = [
      {
        sku: "NHD-500-TX",
        title: "NHD-500-TX AV-over-IP Transmitter",
        status: "recommended",
        evidence: ["Compare verdict: Plausible — confirm", "Technology class matches."],
      },
    ];

    const rows = buildBomRows(products);
    expect(rows[0].evidence).toBe("Compare verdict: Plausible — confirm");
    expect(buildBomCsv(rows)).toContain("Compare verdict: Plausible — confirm");

    const proposal: StoredProjectProposal = {
      title: "Tiered proposal",
      summary: "A quoted comparison.",
      sections: [],
      products,
      assumptions: [],
      updatedAt: "2026-08-16T00:00:00.000Z",
    };
    const html = buildProposalHtml(proposal, buildBomRows(products));
    expect(html).toContain("Compare verdict: Plausible — confirm");
  });
});

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
