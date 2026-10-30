import { describe, expect, it } from "vitest";
import { Packer } from "docx";
import JSZip from "jszip";
import type { StoredProjectProposal } from "../data/projectStore";
import type { SalesBomRow } from "./salesReadiness";
import { proposalRoomBrief, roomBriefHtml } from "./proposalRoomBrief";
import { proposalSolutionStory } from "./proposalSalesContent";
import { buildProposalHtml } from "./proposalExport";
import { buildProposalDocx } from "./proposalDocxExport";
import { createProposalWizardDefaults } from "./proposalWizard";

const proposal: StoredProjectProposal = {
  title: "Boardroom", summary: "Meet with remote colleagues", sections: [], products: [], assumptions: [], updatedAt: "2026-10-15",
  applicationProposal: {
    vertical: "Corporate", application: "Boardroom", executiveSummary: "Meeting space", customerNeed: "Host hybrid meetings",
    solutionOverview: "Local presentation and conferencing", benefits: [{ title: "Experience", detail: "Share from the table" }],
    userJourney: ["Select Presentation on the touch panel.", "Connect the guest laptop."],
    technicalFacts: ["Users and capacity: 12 people"], architectureDiagram: "", acceptanceCriteria: [], verifiedDesignParameters: [],
  },
};
const row: SalesBomRow = { item: 7, sku: "TEST-TX", description: "Table transmitter", role: "Sources", qty: 2, type: "Required", status: "included", evidence: "", notes: "" };

describe("room design pack", () => {
  it("keeps original references and optional quantities, without excluded equipment", () => {
    const brief = proposalRoomBrief(proposal, [row, { ...row, item: 9, type: "Optional" }, { ...row, status: "excluded" }, { ...row, qty: 0 }]);
    expect(brief.groups[0].equipment.map((item) => [item.item, item.qty, item.type])).toEqual([[7, 2, "Required"], [9, 2, "Optional"]]);
    expect(brief.facts).toEqual(["Users and capacity: 12 people"]);
  });

  it("uses recorded operating steps even before equipment selection and falls back for empty steps", () => {
    expect(proposalSolutionStory(proposal, []).operation).toEqual(proposal.applicationProposal!.userJourney);
    expect(buildProposalHtml(proposal, [], [])).toContain("Select Presentation on the touch panel.");
    const empty = { ...proposal, applicationProposal: { ...proposal.applicationProposal!, userJourney: [" "] } };
    expect(proposalSolutionStory(empty, []).operation[0]).toContain("Agree the source-to-destination routes");
  });

  it("escapes authored content and keeps missing room facts explicit", () => {
    const html = roomBriefHtml({ ...proposal, applicationProposal: undefined, title: '<script>alert("x")</script>' }, [{ ...row, role: "<Audio>" }]);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;Audio&gt;");
    expect(html).toContain("Room dimensions, capacity and site conditions require confirmation.");
  });

  it("labels concept imagery and rejects executable image URLs", () => {
    const withImage = (roomVisualUrl: string) => ({ ...proposal, applicationProposal: { ...proposal.applicationProposal!, roomVisualUrl } });
    expect(roomBriefHtml(withImage("https://example.com/room.jpg"), [])).toContain("Illustrative room concept");
    expect(roomBriefHtml(withImage("javascript:alert(1)"), [])).not.toContain("<img");
    expect(roomBriefHtml(withImage("/template-photos/room.jpg"), [])).toContain("/template-photos/room.jpg");
  });

  it("exports the same room facts and equipment roles to HTML and Word", async () => {
    const html = buildProposalHtml(proposal, [row], []);
    const wizard = createProposalWizardDefaults({ projectId: "room", projectName: proposal.title, preparedBy: "Designer", executiveSummary: proposal.summary, architectureNarrative: "Local routing", proposedSolution: "Presentation" });
    const zip = await JSZip.loadAsync(await Packer.toBuffer(buildProposalDocx(proposal, [row], wizard)));
    const xml = await zip.file("word/document.xml")!.async("string");
    for (const text of ["Room at a glance", "Users and capacity: 12 people", "Share from the table", "In this room", "Sources", "Table transmitter", "Select Presentation on the touch panel."]) {
      expect(html).toContain(text);
      expect(xml).toContain(text);
    }
  });
});
