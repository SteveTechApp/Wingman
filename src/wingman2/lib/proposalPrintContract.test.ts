import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { Packer } from "docx";
import JSZip from "jszip";
import type { StoredDiscoveryBrief, StoredProjectProposal, StoredVideowallSummary } from "../data/projectStore";
import { buildProposalHtml } from "./proposalExport";
import { buildProposalDocx } from "./proposalDocxExport";
import { buildDiscoveryBriefHtml } from "./discoveryBriefExport";
import { buildDiscoveryBriefDocx } from "./discoveryBriefDocxExport";
import { createProposalWizardDefaults } from "./proposalWizard";
import { defaultWallRequirements, wallCanvasPlan, wallResolutionSummary } from "./videowallOptions";
import { REP_COPY } from "./proposalCopy";
import type { SalesBomRow } from "./salesReadiness";

const rows: SalesBomRow[] = Array.from({ length: 70 }, (_, index) => ({
  item: index + 1, sku: `SCHEDULE-${String(index + 1).padStart(3, "0")}`, description: `Display control equipment ${index + 1} with a verified connection for the meeting room and its installation position`,
  role: "Display control", qty: 2, type: "Required", status: "included", evidence: "Review fixture", notes: "Customer-approved equipment",
}));
const wizard = { ...createProposalWizardDefaults({ projectId: "project-a", projectName: "Wall installation review", preparedBy: "Solutions team", executiveSummary: "Agreed wall installation.", architectureNarrative: "Local wall distribution." }),
  bomUnitPrices: Object.fromEntries(rows.map(row => [row.sku, "100"])), installationUnitPrices: { "install-enclosure-back-box": "25", "install-termination-hdmi": "10" },
};
const proposal: StoredProjectProposal = { title: "Wall installation review", summary: "Agreed wall installation.", sections: [], products: [], assumptions: [], updatedAt: "2026-10-20T12:00:00Z", preparedBy: "Solutions team", pricing: wizard };
const requirements = { ...defaultWallRequirements, sources: 1, columns: 2, rows: 1,
  linkDetails: { "source-1": { enclosure: "Back box", termination: "HDMI" } },
  mappingHistory: [{ appliedAt: "2026-10-20T11:00:00Z", kind: "canvas-to-source", before: { ledCanvasWidth: 3840, ledCanvasHeight: 2160, sourceCustom: false, sourceWidth: 3840, sourceHeight: 2160 } }],
};
const wall: StoredVideowallSummary = { projectId: "project-a", templateId: "template-a", savedAt: "2026-10-20T12:00:00Z", wallType: "lcd", summary: { requirements, resolution: wallResolutionSummary(requirements), canvasPlan: wallCanvasPlan(requirements) } };
const brief: StoredDiscoveryBrief = { savedAt: "2026-10-20T12:00:00Z", roomModel: { completionScope: [REP_COPY.scopePrompts, "Four ceiling speakers supplied by the integrator"] }, missingInformation: ["[rep only] Check the margin", "Display mounting position remains to be agreed."], nextBestQuestion: "Ask the customer for budget authority", discoveryConversation: Array.from({ length: 45 }, (_, index) => ({ stepId: `q-${index}`, question: `Which display location ${index + 1} is agreed?`, answer: `Room ${index + 1}`, note: "Customer confirmed the position", confirmed: true })) };

describe("print and Word output contracts", () => {
  it("prints saved ownership, mapping audit, missing links and priced schedule totals", () => {
    const html = buildProposalHtml(proposal, rows, [], null, wall);
    expect(html).toContain("Recorded project: project-a. Recorded template: template-a.");
    expect(html).toContain("canvas-to-source applied 2026-10-20T11:00:00Z");
    expect(html).toContain("Missing display housing, run entry or termination: Source 1; Panel 1; Panel 2");
    expect(html).toContain("£14,000.00");
    expect(html).toContain("Running priced total");
    // The priced installation table folds the links into its detail column, so
    // its heading is the two shared labels joined — not a wording of its own.
    expect(html).toContain("Survey detail / Links");
    expect(html).toContain("<tfoot>");
    expect(html).toContain("@page :first");
    expect(html).toContain('aria-label="Document control"');
  });

  it("keeps Word headers with data and discovery rows intact, with no rep prompts", async () => {
    const proposalBuffer = await Packer.toBuffer(buildProposalDocx(proposal, rows, wizard, {}, wall));
    const briefBuffer = await Packer.toBuffer(buildDiscoveryBriefDocx(brief));
    for (const buffer of [proposalBuffer, briefBuffer]) {
      const zip = await JSZip.loadAsync(buffer);
      const xml = await zip.file("word/document.xml")!.async("string");
      const tableRows = xml.match(/<w:tr[ >][\s\S]*?<\/w:tr>/g) ?? [];
      expect(tableRows.length).toBeGreaterThan(20);
      for (const row of tableRows) expect(row).toContain("<w:cantSplit/>");
      for (const header of tableRows.filter(row => row.includes("<w:tblHeader/>"))) expect(header).toContain("<w:keepNext/>");
      expect(xml).not.toContain("[complete]");
      expect(xml).not.toContain("[rep only]");
      expect(xml).not.toContain("Ask the customer for budget authority");
    }
    const proposalZip = await JSZip.loadAsync(proposalBuffer);
    expect(await proposalZip.file("word/document.xml")!.async("string")).toContain("<w:titlePg/>");
    const html = buildDiscoveryBriefHtml(brief);
    expect(html).not.toContain("[complete]");
    expect(html).not.toContain("Fill in the remaining");
    expect(html).toContain("Four ceiling speakers supplied by the integrator");
    if (process.env.WINGMAN_EXPORT_REVIEW === "1") {
      const output = path.resolve("reports/export-review");
      fs.mkdirSync(output, { recursive: true });
      fs.writeFileSync(path.join(output, "proposal.html"), buildProposalHtml(proposal, rows, [], null, wall));
      fs.writeFileSync(path.join(output, "proposal.docx"), proposalBuffer);
      fs.writeFileSync(path.join(output, "discovery.html"), html);
      fs.writeFileSync(path.join(output, "discovery.docx"), briefBuffer);
    }
  });
});
