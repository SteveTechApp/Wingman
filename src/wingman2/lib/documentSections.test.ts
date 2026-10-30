/**
 * The document's detail level is the one thing that decides which of its
 * sections print: `DOCUMENT_SECTIONS` files every section at the shallowest
 * level that carries it, and both document builders read that plan.
 *
 * These specs pin the ladder and the two ends of it — a Technical document
 * carries the evidence appendix and an Executive one stops before the technical
 * substantiation — plus the middle, which is the whole document every proposal
 * printed before the level reached print.
 */
import JSZip from "jszip";
import { Packer } from "docx";
import { beforeEach, describe, expect, it } from "vitest";
import type { StoredProjectProposal } from "../data/projectStore";
import type { SalesBomRow } from "./salesReadiness";
import { createProposalWizardDefaults } from "./proposalWizard";
import { buildProposalDocx } from "./proposalDocxExport";
import { buildProposalHtml } from "./proposalExport";
import {
  DOCUMENT_SECTIONS,
  buildDocumentAppendix,
  documentSectionPlan,
  type DocumentSectionId,
} from "./documentSections";
import type { DocumentDetail } from "./solutionTemplates";

/** One sourced line and one line with an open question, so the appendix has both. */
const bomRows: SalesBomRow[] = [
  {
    item: 1, sku: "NHD-600-E-TX", description: "NetworkHD 600 encoder", role: "Encode operator sources",
    qty: 2, type: "Required", status: "included", evidence: "Two confirmed operator sources.", notes: "",
    sourceUrl: "https://wyrestorm.com/products/nhd-600-e-tx", sourceCheckedOn: "2026-10-19",
  },
  {
    item: 2, sku: "BY-OTHERS-CUSTOM", description: "Wall bracket allowance", role: "Mounting",
    qty: 1, type: "Validate", status: "validate", evidence: "", notes: "Confirm the mount before order.",
  },
];

const proposal: StoredProjectProposal = {
  title: "Operations room", summary: "Route two operator sources to four displays.",
  sections: [], products: [], assumptions: ["Customer IT provides a dedicated AV VLAN."],
  updatedAt: "2026-10-20T00:00:00.000Z",
  discoveryConversation: [{ stepId: "displays", question: "How many displays must be routed?", answer: "Four displays", note: "Each operator needs its own routing.", confirmed: true }],
  applicationProposal: {
    vertical: "Government", application: "Operations room", executiveSummary: "Operational visibility.",
    customerNeed: "Route operator sources to displays.", solutionOverview: "NetworkHD 600 fabric.",
    benefits: [{ title: "Continuity", detail: "Operators keep access to approved sources." }],
    userJourney: ["Select an approved source and route it to a display."],
    technicalFacts: [], architectureDiagram: "Operator sources → NetworkHD → displays",
    acceptanceCriteria: ["Every approved route passes functional testing."],
    verifiedDesignParameters: [], marketStory: "Supports controlled operational decisions.",
    productSpecifications: [], thirdPartyScope: [],
  },
};

const wizard = createProposalWizardDefaults({
  projectId: "document-detail", projectName: proposal.title, preparedBy: "Solutions team",
  executiveSummary: proposal.summary, architectureNarrative: "NetworkHD 600 10G AV-over-IP fabric.",
});

async function docxText(detail?: DocumentDetail) {
  const buffer = await Packer.toBuffer(buildProposalDocx(proposal, bomRows, wizard, {}, null, detail));
  const zip = await JSZip.loadAsync(buffer);
  const xml = await zip.file("word/document.xml")!.async("string");
  return xml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
}

/** The substantiation an Executive document is supposed to stop before. */
const SUBSTANTIATION_HEADINGS = [
  "Discovery Conversation",
  "What You Asked For and How We Designed It",
  "Technical Architecture",
  "Cable Schedule",
  "Products in the Solution",
  "WyreStorm Product Specifications",
  "Power Strategy",
];

const APPENDIX_HEADING = "Appendix — Equipment Evidence and Verification";

/** The commercial and governance reading an Executive document still prints. */
const DECISION_HEADINGS = [
  "Executive Summary",
  "Unresolved Discovery Items",
  "Equipment and Pricing",
  "Assumptions, Risks and Exclusions",
  "Next Steps",
];

describe("the document detail level decides which sections print", () => {
  beforeEach(() => window.localStorage.clear());

  it("files every section as a ladder, pinned so a section cannot be added without a level", () => {
    expect(DOCUMENT_SECTIONS.map((section) => section.id)).toEqual<DocumentSectionId[]>([
      "executive-summary", "room-at-a-glance", "solution-overview", "practical-operation",
      "commercial-benefits", "market-and-application-story", "client-objectives",
      "unresolved-discovery-items", "options", "proposed-solution-and-business-value",
      "scope-of-work", "display-schedule", "equipment-and-pricing",
      "services-and-commercial-allowances", "complete-system-design", "third-party-system-scope",
      "timeline-and-phases", "testing-and-acceptance", "responsibilities-and-dependencies",
      "assumptions-risks-and-exclusions", "next-steps", "best-efforts-disclaimer",
      "discovery-conversation", "design-trace", "technical-architecture", "cable-schedule",
      "products-in-the-solution", "product-specifications", "power-strategy",
      "technical-appendix",
    ]);

    const executive = documentSectionPlan("Executive");
    const standard = documentSectionPlan("Standard");
    const technical = documentSectionPlan("Technical");
    // Each level adds to the one below it rather than swapping sections about.
    expect([...executive].every((id) => standard.has(id))).toBe(true);
    expect([...standard].every((id) => technical.has(id))).toBe(true);
    expect(executive.size).toBeLessThan(standard.size);
    expect(standard.size).toBeLessThan(technical.size);
    expect(technical.size).toBe(DOCUMENT_SECTIONS.length);
  });

  it("prints the whole document at the level a draft that chose none falls back to", async () => {
    const byDefault = await docxText();
    const standard = await docxText("Standard");
    for (const heading of SUBSTANTIATION_HEADINGS) {
      expect(byDefault).toContain(heading);
      expect(standard).toContain(heading);
    }
    expect(standard).not.toContain(APPENDIX_HEADING);
  });

  it("stops an Executive document before the substantiation, in both outputs", async () => {
    const docx = await docxText("Executive");
    for (const heading of SUBSTANTIATION_HEADINGS) expect(docx).not.toContain(heading);
    // Nothing an executive document leaves out is a decision or an open item.
    for (const heading of DECISION_HEADINGS) expect(docx).toContain(heading);

    const html = buildProposalHtml(proposal, bomRows, [], null, null, "Executive");
    for (const heading of SUBSTANTIATION_HEADINGS) expect(html).not.toContain(heading);
    expect(html).toContain("Equipment Schedule");
    expect(html).toContain("<h2>Next Steps</h2>");
  });

  it("carries the evidence appendix only in a Technical document, behind the rest of it", async () => {
    const technical = await docxText("Technical");
    expect(technical).toContain(APPENDIX_HEADING);
    expect(technical).toContain("Evidence for this line");
    // Why the line is there, where it was read, and what is still open.
    expect(technical).toContain("Two confirmed operator sources.");
    expect(technical).toContain("https://wyrestorm.com/products/nhd-600-e-tx (read 2026-10-19)");
    expect(technical).toContain("Open — confirm the specification and quantity before order.");
    // The appendix is reference material at the back, not a second report.
    expect(technical.indexOf(APPENDIX_HEADING)).toBeGreaterThan(technical.indexOf("Assumptions, Risks and Exclusions"));

    expect(await docxText("Standard")).not.toContain(APPENDIX_HEADING);
    expect(await docxText("Executive")).not.toContain(APPENDIX_HEADING);

    const html = buildProposalHtml(proposal, bomRows, [], null, null, "Technical");
    expect(html).toContain(APPENDIX_HEADING);
    expect(html).toContain("Two confirmed operator sources.");
    expect(buildProposalHtml(proposal, bomRows, [], null, null, "Standard")).not.toContain(APPENDIX_HEADING);
  });

  it("reads each appendix line from the line's own evidence, source and open question", () => {
    const appendix = buildDocumentAppendix(bomRows);
    expect(appendix.rows).toEqual([
      {
        item: 1, line: "NHD-600-E-TX — NetworkHD 600 encoder",
        evidence: "Two confirmed operator sources.",
        source: "https://wyrestorm.com/products/nhd-600-e-tx (read 2026-10-19)",
        verification: "Recorded in this design.",
      },
      {
        item: 2, line: "BY-OTHERS-CUSTOM — Wall bracket allowance",
        evidence: "No evidence recorded — confirm this line is needed.",
        source: "Not recorded",
        verification: "Open — confirm the specification and quantity before order.",
      },
    ]);
    // Nothing to list is said rather than left as a bare heading.
    expect(buildDocumentAppendix([]).headline).toContain("no selection evidence to list");
  });
});
