import JSZip from "jszip";
import { Packer } from "docx";
import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { StoredProjectProposal } from "../data/projectStore";
import type { SalesBomRow } from "./salesReadiness";
import { buildProposalDocx, exportProposalDocx } from "./proposalDocxExport";
import { buildProposalHtml } from "./proposalExport";
import { createProposalWizardDefaults } from "./proposalWizard";
import { wallMappingPreviews } from "./wallElevation";
import { defaultWallRequirements, wallCanvasPlan, wallResolutionSummary } from "./videowallOptions";
import { wallStartPresets } from "./videowallDecision";
import { wallStartingPointOrigin } from "./wallStartingPointOrigin";
import { PARITY_MARKERS, parityBom, parityProposal, parityWizard } from "../../../e2e/fixtures/proposal-output-parity";

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
  afterEach(() => vi.useRealTimers());
  it("keeps the canonical completed proposal content aligned with the screen export", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-11T12:00:00.000Z"));
    const html = buildProposalHtml(parityProposal, parityBom, parityProposal.products);
    const screenText = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ");
    const buffer = await Packer.toBuffer(buildProposalDocx(parityProposal, parityBom, parityWizard));
    const zip = await JSZip.loadAsync(buffer);
    const xml = await zip.file("word/document.xml")!.async("string");
    const docxText = xml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    const requiredMarkers = [
      PARITY_MARKERS.requirement, PARITY_MARKERS.recommendation, PARITY_MARKERS.dependency,
      PARITY_MARKERS.assumption, PARITY_MARKERS.risk,      PARITY_MARKERS.discoveryQuestion, PARITY_MARKERS.discoveryAnswer, PARITY_MARKERS.disclaimer,
      PARITY_MARKERS.displaySchedule,
      "NHD-600-TX", "NHD-600-RX", "NHD-CTL-PRO-V2",
    ];
    for (const marker of requiredMarkers) {
      expect(screenText).toContain(marker);
      expect(docxText).toContain(marker);
    }

    if (process.env.WINGMAN_WRITE_PROPOSAL_PARITY === "1") {
      const outputDir = path.resolve("docs/release-evidence/proposal-output-parity/latest");
      fs.rmSync(outputDir, { recursive: true, force: true });
      fs.mkdirSync(outputDir, { recursive: true });
      fs.writeFileSync(path.join(outputDir, "proposal-screen.html"), html.replace(/^[\t ]+$/gm, ""));
      fs.writeFileSync(path.join(outputDir, "proposal.docx"), buffer);
      fs.writeFileSync(path.join(outputDir, "proposal-docx.txt"), `${docxText.trim()}\n`);
      fs.writeFileSync(path.join(outputDir, "manifest.json"), JSON.stringify({
        fixture: "northstar-parity",
        requiredSections: ["Customer Requirement", "Recommended Solution", "Display Schedule", "Equipment Schedule", "Technical Architecture", "Discovery Conversation", "Assumptions", "Risks and Dependencies", "Best-Efforts Disclaimer"],
        requiredMarkers, quantities: { "NHD-600-TX": 2, "NHD-600-RX": 4, "NHD-CTL-PRO-V2": 1 },
        artifacts: { screenHtml: "proposal-screen.html", docx: "proposal.docx", docxText: "proposal-docx.txt" },
      }, null, 2));
    }
  });
  it("carries the canonical design revision into the Word output", async () => {
    const withDesign: StoredProjectProposal = { ...proposal, designRevision: { schemaVersion: 1, revisionId: "dp1-word", contentHash: "dp1-word", projectId: "p", projectName: "Room", compiledAt: "2026-09-07", customerRequirement: "Customer said operational sources", interpretedRequirement: "Wingman understood routed visibility", architecture: "NetworkHD fabric", requirements: [], roleCoverage: [{ role: "network", label: "Network infrastructure", required: true, covered: true, evidence: ["10G fabric"], requirementIds: [] }], productOverviews: [{ sku: "NHD-CTL-PRO-V2", name: "Controller", quantity: 1, designRole: "Routing control", requirementIds: [], reason: "Controls the selected endpoints", proof: ["Central management"], dependencies: [], validation: [] }], assumptions: [], blockers: [], warnings: [], canIssue: true } };
    const wizard = createProposalWizardDefaults({ projectId: "p", projectName: "Room", preparedBy: "Team", executiveSummary: "Summary", architectureNarrative: "NetworkHD" });
    const buffer = await Packer.toBuffer(buildProposalDocx(withDesign, bom, wizard));
    const zip = await JSZip.loadAsync(buffer); const xml = await zip.file("word/document.xml")!.async("string"); const text = xml.replace(/<[^>]+>/g, " ");
    expect(text).toContain("What You Asked For and How We Designed It");
    expect(text).toContain("dp1-word");
    expect(text).toContain("System completeness");
    expect(text).toContain("Controls the selected endpoints");
  });

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
    expect(text).toContain("a partial match we will check with you before quoting");
  });

  it("prints fit and fill side by side so the customer can weigh the costs", async () => {
    const wizard = createProposalWizardDefaults({
      projectId: "wall", projectName: proposal.title, preparedBy: "Solutions Team",
      executiveSummary: proposal.summary, architectureNarrative: "LED wall.",
    });
    const requirements = { ...defaultWallRequirements, application: "led" as const, ledCanvasWidth: 1920, ledCanvasHeight: 2160, mapping: "fill" as const };
    const plan = wallCanvasPlan(requirements);
    const resolution = wallResolutionSummary(requirements);
    const wall = {
      savedAt: "2026-10-19T00:00:00.000Z",
      wallType: "led",
      summary: {
        version: 2,
        requirements,
        resolution: { canvas: resolution.canvas, display: resolution.display, source: resolution.source, mapping: resolution.label },
        canvasPlan: { canvas: plan.canvas, native: plan.native, perPanel: plan.perPanel, recommended: plan.recommended, rationale: plan.rationale, text: plan.text },
      },
    };
    // The pair comes from the same previews the screen export prints.
    const previews = wallMappingPreviews(requirements)!;

    const buffer = await Packer.toBuffer(buildProposalDocx(proposal, bom, wizard, {
      wallPreviews: {
        chosen: previews.chosen,
        options: previews.previews.map((preview) => ({ value: preview.value, consequence: preview.consequence })),
      },
    }, wall));
    const zip = await JSZip.loadAsync(buffer);
    const documentXml = await zip.file("word/document.xml")!.async("string");
    const text = documentXml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

    expect(text).toContain("Source mapping options");
    expect(text).toContain("Both drawings show this wall at the same size");
    expect(text).toContain("Leaves 50% of the wall as black bars, 540 px top and bottom.");
    expect(text).toContain("Loses 50% of the picture to the crop, 960 px left and right.");
    expect(text).toContain("Fill · in this design");
    expect(text).not.toContain("Fit · in this design");

    // The pair is one row Word may not page-break, so a Fit drawing never ends
    // up on the page after its Fill partner.
    const from = documentXml.indexOf("Source mapping options");
    const mappingStart = documentXml.indexOf("<w:tbl", from);
    const mappingEnd = documentXml.indexOf("</w:tbl>", mappingStart);
    const mappingTable = documentXml.slice(mappingStart, mappingEnd);
    expect(mappingTable).toContain("<w:cantSplit/>");
    expect(mappingTable.match(/<w:tr[ >]/g)).toHaveLength(1);

    // Every schedule row is pinned too: the display schedule keeps each panel
    // on one page, while the table itself still breaks between rows.
    const scheduleStart = documentXml.indexOf("<w:tbl", mappingEnd);
    const scheduleTable = documentXml.slice(scheduleStart, documentXml.indexOf("</w:tbl>", scheduleStart));
    expect(scheduleTable).toContain("<w:cantSplit/>");
    expect(scheduleTable).not.toContain("<w:pageBreakBefore/>");
  });

  it("keeps every row whole across every schedule in the Word output", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-11T12:00:00.000Z"));
    const buffer = await Packer.toBuffer(buildProposalDocx(parityProposal, parityBom, parityWizard));
    const zip = await JSZip.loadAsync(buffer);
    const xml = await zip.file("word/document.xml")!.async("string");

    // Count rows rather than inspecting one table: the guarantee is that no
    // schedule can introduce a row Word is allowed to cut in half.
    const rows = xml.match(/<w:tr[ >]/g) ?? [];
    const pinned = xml.match(/<w:cantSplit\/>/g) ?? [];
    expect(rows.length).toBeGreaterThan(10);
    expect(pinned).toHaveLength(rows.length);
  });

  it("prints the survey's installation detail beside the display schedule", async () => {
    const wizard = createProposalWizardDefaults({
      projectId: "wall", projectName: proposal.title, preparedBy: "Solutions Team",
      executiveSummary: proposal.summary, architectureNarrative: "LCD wall.",
    });
    const requirements = {
      ...defaultWallRequirements,
      application: "lcd-direct" as const,
      layout: "independent" as const,
      columns: 2,
      rows: 1,
      sources: 1,
      linkDetails: {
        "source-1": { enclosure: "Rack shelf", termination: "HDMI faceplate" },
        "display-2": { enclosure: "Back box", mount: "Tilt bracket", termination: "Cat6A outlet" },
      },
    };
    const resolution = wallResolutionSummary(requirements);
    const plan = wallCanvasPlan(requirements);
    const wall = {
      savedAt: "2026-10-21T00:00:00.000Z",
      wallType: "lcd",
      summary: {
        version: 2,
        requirements,
        resolution: { canvas: resolution.canvas, display: resolution.display, source: resolution.source, mapping: resolution.label },
        canvasPlan: { canvas: plan.canvas, native: plan.native, perPanel: plan.perPanel, recommended: plan.recommended, rationale: plan.rationale, text: plan.text },
      },
    };

    const buffer = await Packer.toBuffer(buildProposalDocx(proposal, bom, wizard, {}, wall));
    const zip = await JSZip.loadAsync(buffer);
    const xml = await zip.file("word/document.xml")!.async("string");
    const text = xml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

    expect(text).toContain("Installation Detail");
    expect(text).toContain("recorded for 2 of 3 links");
    expect(text).toContain("Missing display housing, run entry or termination: Source 1; Panel 1; Panel 2");
    expect(text).toContain("Rack shelf");
    expect(text).toContain("Tilt bracket");
    expect(text).toContain("Cat6A outlet");
  });

  it("prints the card the wall started on and the answers the room changed", async () => {
    const wizard = createProposalWizardDefaults({
      projectId: "wall", projectName: proposal.title, preparedBy: "Solutions Team",
      executiveSummary: proposal.summary, architectureNarrative: "LCD wall.",
    });
    const preset = wallStartPresets.find((entry) => entry.key === "two-up")!;
    const requirements = { ...preset.requirements, sources: preset.requirements.sources + 1 };
    const resolution = wallResolutionSummary(requirements);
    const plan = wallCanvasPlan(requirements);
    const wall = {
      savedAt: "2026-10-21T00:00:00.000Z",
      wallType: "lcd",
      summary: {
        version: 2,
        requirements,
        resolution: { canvas: resolution.canvas, display: resolution.display, source: resolution.source, mapping: resolution.label },
        canvasPlan: { canvas: plan.canvas, native: plan.native, perPanel: plan.perPanel, recommended: plan.recommended, rationale: plan.rationale, text: plan.text },
        startingPoint: wallStartingPointOrigin(preset),
      },
    };

    const buffer = await Packer.toBuffer(buildProposalDocx(proposal, bom, wizard, {}, wall));
    const zip = await JSZip.loadAsync(buffer);
    const xml = await zip.file("word/document.xml")!.async("string");
    const text = xml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

    // The same sentence the project record prints, so the two cannot disagree
    // about which card the drawing came from.
    expect(text).toContain(
      `Started from ${preset.label}. 1 answer changed: Sources: ${preset.requirements.sources} → ${preset.requirements.sources + 1}.`,
    );
  });

  it("prices the survey's installation scope in the equipment and services schedule", async () => {
    const base = createProposalWizardDefaults({
      projectId: "wall", projectName: proposal.title, preparedBy: "Solutions Team",
      executiveSummary: proposal.summary, architectureNarrative: "LCD wall.",
    });
    const requirements = {
      ...defaultWallRequirements,
      application: "lcd-direct" as const,
      layout: "independent" as const,
      columns: 2,
      rows: 1,
      sources: 1,
      linkDetails: {
        "source-1": { enclosure: "Rack shelf", termination: "HDMI faceplate" },
        "display-2": { enclosure: "Back box", mount: "Tilt bracket", termination: "Cat6A outlet" },
      },
    };
    const resolution = wallResolutionSummary(requirements);
    const plan = wallCanvasPlan(requirements);
    const wall = {
      savedAt: "2026-10-21T00:00:00.000Z",
      wallType: "lcd",
      summary: {
        version: 2,
        requirements,
        resolution: { canvas: resolution.canvas, display: resolution.display, source: resolution.source, mapping: resolution.label },
        canvasPlan: { canvas: plan.canvas, native: plan.native, perPanel: plan.perPanel, recommended: plan.recommended, rationale: plan.rationale, text: plan.text },
      },
    };
    const wizard = {
      ...base,
      installationUnitPrices: {
        "install-enclosure-back-box": "120",
        "install-enclosure-rack-shelf": "80",
        "install-mount-tilt-bracket": "150",
        "install-termination-cat6a-outlet": "45",
        "install-termination-hdmi-faceplate": "35",
      },
    };

    const buffer = await Packer.toBuffer(buildProposalDocx(proposal, bom, wizard, {}, wall));
    const zip = await JSZip.loadAsync(buffer);
    const xml = await zip.file("word/document.xml")!.async("string");
    const text = xml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

    // The survey's install detail becomes priced lines, one per item, not per link.
    expect(text).toContain("Installation and services");
    expect(text).toContain("Installation scope from the site survey: 2 display housings, 1 mount, 2 terminations across 3 wall links.");
    expect(text).toContain("Back box");
    expect(text).toContain("£120.00");
    expect(text).toContain("The installation and services total is £430.00 excluding VAT / sales tax.");

    // An unpriced line holds the total exactly as an unpriced equipment row does.
    const unpriced = await Packer.toBuffer(buildProposalDocx(proposal, bom, base, {}, wall));
    const unpricedXml = await (await JSZip.loadAsync(unpriced)).file("word/document.xml")!.async("string");
    const unpricedText = unpricedXml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    expect(unpricedText).toContain("COMMERCIAL HOLD: one or more installation rates are missing");
    expect(unpricedText).toContain("TBC — pricing incomplete");

    // The screen export schedules the same scope, so the two documents agree on
    // what installation the customer is buying.
    const html = buildProposalHtml(proposal, bom, proposal.products, null, wall);
    expect(html).toContain('data-installation-line="install-enclosure-back-box"');
    expect(html).toContain("Installation scope from the site survey: 2 display housings, 1 mount, 2 terminations across 3 wall links.");
    expect(html).toContain("Tilt bracket");
  });

  it("refuses the DOCX when a saved wall run exceeds its transport", async () => {
    const wizard = createProposalWizardDefaults({
      projectId: "wall", projectName: proposal.title, preparedBy: "Solutions Team",
      executiveSummary: proposal.summary, architectureNarrative: "LCD wall.",
    });
    const requirements = {
      ...defaultWallRequirements,
      application: "lcd-direct" as const,
      layout: "independent" as const,
      columns: 2,
      rows: 1,
      sources: 2,
      windows: 2,
      measuredRuns: { "display-2": 40 },
    };
    const resolution = wallResolutionSummary(requirements);
    const plan = wallCanvasPlan(requirements);
    const wall = {
      savedAt: "2026-10-21T00:00:00.000Z",
      wallType: "lcd",
      summary: {
        version: 2,
        requirements,
        resolution: { canvas: resolution.canvas, display: resolution.display, source: resolution.source, mapping: resolution.label },
        canvasPlan: { canvas: plan.canvas, native: plan.native, perPanel: plan.perPanel, recommended: plan.recommended, rationale: plan.rationale, text: plan.text },
      },
    };

    // The document is never packed: its own schedule would list the broken run.
    await expect(exportProposalDocx(proposal, bom, wizard, wall))
      .rejects.toThrow(/Panel 2 cannot carry its run[\s\S]*active or fibre HDMI cable/);
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
