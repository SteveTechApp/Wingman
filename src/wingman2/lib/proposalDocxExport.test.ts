import JSZip from "jszip";
import { Packer } from "docx";
import { describe, expect, it } from "vitest";
import type { StoredProjectProposal } from "../data/projectStore";
import type { SalesBomRow } from "./salesReadiness";
import { buildProposalDocx } from "./proposalDocxExport";
import { createProposalWizardDefaults } from "./proposalWizard";

const proposal: StoredProjectProposal = {
  title: "Government Control Room - NetworkHD 600",
  summary: "Provide resilient, low-latency routing for a government control room.",
  sections: [], products: [], assumptions: [], updatedAt: "2026-08-06T00:00:00.000Z",
  companyName: "WyreStorm", preparedBy: "Solutions Team",
  applicationProposal: {
    vertical: "Government", application: "Control room", executiveSummary: "Operational control room.",
    customerNeed: "Maintain operational visibility.", solutionOverview: "Sources route through NetworkHD to displays.",
    benefits: [{ title: "Resilience", detail: "Support continuous operations." }],
    userJourney: ["Operators select an operational source and route it to an approved display."],
    technicalFacts: [], architectureDiagram: "Operational sources → NetworkHD 600 fabric → Operator displays",
    acceptanceCriteria: ["All approved source-to-display routes pass functional testing."],
    visualBriefs: [], verifiedDesignParameters: [], deploymentConditions: [],
    marketStory: "The room supports rapid, controlled decision-making.",
    productSpecifications: [{ sku: "NHD-CTL-PRO-V2", name: "NetworkHD controller", role: "Routing control", quantity: 1, summary: "Controls the NetworkHD system.", keyFeatures: ["Central routing management"], validation: ["Confirm firmware compatibility"] }],
    thirdPartyScope: [{ category: "Displays", description: "Operator and overview displays", responsibility: "Integrator", status: "allowance", quantity: 4, notes: "Confirm size and mounting." }],
  },
};

const bom: SalesBomRow[] = [{
  item: 1, sku: "NHD-CTL-PRO-V2", description: "NetworkHD controller", role: "Routing control",
  qty: 1, type: "Required", status: "included", evidence: "Selected by template", notes: "",
}];

describe("proposal DOCX export", () => {
  it("creates the required commercial sections and exact equipment totals", async () => {
    const wizard = createProposalWizardDefaults({
      projectId: "government-control-room", projectName: proposal.title, preparedBy: "Solutions Team",
      executiveSummary: proposal.summary, architectureNarrative: "NetworkHD 600 10G AV-over-IP architecture.",
      customerName: "Example Customer",
    });
    wizard.bomUnitPrices = { "NHD-CTL-PRO-V2": "1250.00" };

    const buffer = await Packer.toBuffer(buildProposalDocx(proposal, bom, wizard));
    const zip = await JSZip.loadAsync(buffer);
    const documentXml = await zip.file("word/document.xml")!.async("string");
    const text = documentXml.replace(/<[^>]+>/g, " ");

    expect(text).toContain("Executive Summary");
    expect(text).toContain("Scope of Work");
    expect(text).toContain("Equipment and Pricing");
    expect(text).toContain("£1,250.00");
    expect(text).toContain("Services and Commercial Allowances");
    expect(text).toContain("Market and Application Story");
    expect(text).toContain("Third-Party System Scope");
    expect(text).toContain("WyreStorm Product Specifications");
    expect(text).toContain("Testing and Acceptance Criteria");
    expect(text).toContain("Operator displays");
    expect(text).toContain("Cabling and consumables");
    expect(text).toContain("Visio / CAD / as-built drawings");
    expect(text).toContain("Timeline and Phases");
    expect(text).toContain("Site survey and preparation");
    expect(text).toContain("Next Steps");
  });

  it("carries the best-efforts disclaimer in the DOCX body", async () => {
    const wizard = createProposalWizardDefaults({
      projectId: "government-control-room", projectName: proposal.title, preparedBy: "Solutions Team",
      executiveSummary: proposal.summary, architectureNarrative: "NetworkHD 600 10G AV-over-IP architecture.",
    });

    const buffer = await Packer.toBuffer(buildProposalDocx(proposal, bom, wizard));
    const zip = await JSZip.loadAsync(buffer);
    const documentXml = await zip.file("word/document.xml")!.async("string");
    const text = documentXml.replace(/<[^>]+>/g, " ");

    expect(text).toContain("Best-Efforts Disclaimer");
    expect(text).toContain("best-efforts basis");
    expect(text).toContain("verified against the current WyreStorm documentation");
    expect(text).toContain("accepts no liability");
  });

  it("carries the discovery Q&A trail into the DOCX body", async () => {
    const wizard = createProposalWizardDefaults({
      projectId: "government-control-room", projectName: proposal.title, preparedBy: "Solutions Team",
      executiveSummary: proposal.summary, architectureNarrative: "NetworkHD 600 10G AV-over-IP architecture.",
    });
    const withConversation: StoredProjectProposal = {
      ...proposal,
      discoveryConversation: [
        { stepId: "opportunity", question: "What type of opportunity is this?", answer: "Meeting room / boardroom", note: "A boardroom for the exec team.", confirmed: true, confidence: "high", confidenceScore: 12 },
        { stepId: "sources", question: "How many source positions are likely?", answer: "2-4 sources", note: "Two laptops at the table.", confidence: "low", confidenceScore: 1 },
      ],
    };

    const buffer = await Packer.toBuffer(buildProposalDocx(withConversation, bom, wizard));
    const zip = await JSZip.loadAsync(buffer);
    const documentXml = await zip.file("word/document.xml")!.async("string");
    const text = documentXml.replace(/<[^>]+>/g, " ");

    expect(text).toContain("Discovery Conversation");
    expect(text).toContain("What type of opportunity is this?");
    expect(text).toContain("Meeting room / boardroom");
    expect(text).toContain("A boardroom for the exec team.");
    expect(text).toContain("Two laptops at the table.");
    expect(text).toContain("Customer wording");
    expect(text).toContain("Capture confidence");
    // The trust level (and the score behind it) for each you-said → matched
    // pair is visible — low rows carry the "verify before quote" flag.
    expect(text).toContain("High confidence (12)");
    expect(text).toContain("Low confidence — verify before quote (1)");
  });

  it("marks confirmed rows settled and open rows 'to be confirmed' in the DOCX", async () => {
    const wizard = createProposalWizardDefaults({
      projectId: "government-control-room", projectName: proposal.title, preparedBy: "Solutions Team",
      executiveSummary: proposal.summary, architectureNarrative: "NetworkHD 600 10G AV-over-IP architecture.",
    });
    const withConversation: StoredProjectProposal = {
      ...proposal,
      discoveryConversation: [
        { stepId: "opportunity", question: "What type of opportunity is this?", answer: "Meeting room / boardroom", note: "", confirmed: true },
        { stepId: "sources", question: "How many source positions are likely?", answer: "2-4 sources", note: "", confirmed: false },
      ],
    };

    const buffer = await Packer.toBuffer(buildProposalDocx(withConversation, bom, wizard));
    const zip = await JSZip.loadAsync(buffer);
    const documentXml = await zip.file("word/document.xml")!.async("string");
    const text = documentXml.replace(/<[^>]+>/g, " ");

    expect(text).toContain("Confirmed with customer");
    expect(text).toContain("To be confirmed");
    expect(text).toContain("Status");
    // Rows recorded before confidence existed render an honest placeholder.
    expect(text).toContain("—");
    expect(text).toContain("must be re-verified with the customer before quoting");
  });

  it("marks missing equipment prices as a commercial hold", async () => {
    const wizard = createProposalWizardDefaults({
      projectId: "draft", projectName: proposal.title, preparedBy: "Solutions Team",
      executiveSummary: proposal.summary, architectureNarrative: "Draft architecture.",
    });
    const buffer = await Packer.toBuffer(buildProposalDocx(proposal, bom, wizard));
    const zip = await JSZip.loadAsync(buffer);
    const documentXml = await zip.file("word/document.xml")!.async("string");
    expect(documentXml).toContain("COMMERCIAL HOLD");
    expect(documentXml).toContain("TBC");
  });
});
