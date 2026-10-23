import { describe, expect, it } from "vitest";
import { Packer } from "docx";
import JSZip from "jszip";
import {
  CUSTOMER_COPY,
  REP_COPY,
  customerCopyLines,
  customerCopyText,
  isRepOnlyCopy,
} from "./proposalCopy";
import { proposalSolutionStory } from "./proposalSalesContent";
import { buildProposalHtml } from "./proposalExport";
import { buildProposalDocx } from "./proposalDocxExport";
import { createProposalWizardDefaults } from "./proposalWizard";
import type { StoredProjectProposal } from "../data/projectStore";
import type { SalesBomRow } from "./salesReadiness";

const proposal: StoredProjectProposal = {
  title: "Operations room",
  summary: "Help operators share incident information.",
  sections: [],
  products: [],
  assumptions: [],
  updatedAt: "2026-10-20",
};

const row: SalesBomRow = {
  item: 1,
  sku: "NHD-600-TX",
  description: "NetworkHD 600 encoder",
  role: "Source distribution",
  qty: 2,
  type: "Required",
  status: "included",
  evidence: "",
  notes: "",
};

function wizardFor() {
  return createProposalWizardDefaults({
    projectId: "copy-layers",
    projectName: proposal.title,
    preparedBy: "Solutions Team",
    executiveSummary: proposal.summary,
    proposedSolution: "Encoders feed the agreed displays.",
    architectureNarrative: "1GbE AV fabric.",
  });
}

describe("proposal copy layers", () => {
  it("keeps every rep prompt recognisable as guidance and out of the customer layer", () => {
    const repLines = [...REP_COPY.scopePrompts.split("\n"), REP_COPY.scopeGuidance];
    expect(repLines.length).toBeGreaterThan(1);
    for (const line of repLines) expect(isRepOnlyCopy(line)).toBe(true);
    for (const value of Object.values(CUSTOMER_COPY)) {
      for (const line of value.split("\n")) expect(isRepOnlyCopy(line)).toBe(false);
    }
  });

  it("drops guidance lines from a field but keeps the agreed detail", () => {
    const mixed = [
      "Displays / projection | Model, size, location and mounting: [complete] | Supplier / owner: [complete]",
      "Displays | Customer supplies four 65 in displays | Mounts by integrator",
    ].join("\n");
    expect(customerCopyLines(mixed, CUSTOMER_COPY.scopePending)).toEqual([
      "Displays | Customer supplies four 65 in displays | Mounts by integrator",
    ]);
    // An untouched field falls back to the customer wording, never to the prompt.
    expect(customerCopyText(REP_COPY.scopePrompts, CUSTOMER_COPY.scopePending)).toBe(
      CUSTOMER_COPY.scopePending,
    );
  });

  it("has the story fall back to customer scope wording instead of the prompts", () => {
    const story = proposalSolutionStory(proposal, [row]);
    expect(story.externalScope).not.toContain("[complete]");
    expect(story.externalScope).toContain("Displays / projection — model, size");
  });

  it("never prints an authoring instruction in the HTML or Word export", async () => {
    const withScope = { ...proposal, salesContent: { objectives: "Share incidents.", solutionOverview: "Agreed routing.", externalScope: REP_COPY.scopePrompts } };
    const html = buildProposalHtml(withScope, [row]);
    expect(html).not.toContain("[complete]");
    expect(html).not.toContain("Add BOM rows");
    expect(html).toContain("Displays / projection — model, size");

    // No schedule rows at all: the empty states address the reader, not the rep.
    const empty = buildProposalHtml(proposal, []);
    expect(empty).not.toContain("Add equipment schedule rows");
    expect(empty).not.toContain("[complete]");
    expect(empty).toContain(CUSTOMER_COPY.noSchematic);
    expect(empty).toContain(CUSTOMER_COPY.noOperation);
    expect(empty).toContain(CUSTOMER_COPY.noBenefits);
    expect(empty).toContain(CUSTOMER_COPY.noEquipment);

    const wizard = wizardFor();
    expect(wizard.externalScope).toBe(REP_COPY.scopePrompts);
    const zip = await JSZip.loadAsync(await Packer.toBuffer(buildProposalDocx(withScope, [row], wizard)));
    const xml = await zip.file("word/document.xml")!.async("string");
    expect(xml).not.toContain("[complete]");
    expect(xml).toContain("Displays / projection — model, size");
  });
});
