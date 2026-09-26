import { describe, expect, it } from "vitest";
import { Packer } from "docx";
import JSZip from "jszip";
import { proposalProductCards, proposalSolutionStory, safeProposalWebUrl } from "./proposalSalesContent";
import { buildProposalHtml } from "./proposalExport";
import { buildProposalDocx } from "./proposalDocxExport";
import { createProposalWizardDefaults } from "./proposalWizard";
import { decodeStoredProject } from "../features/projects/persistence/projectCodecs";
import { compileDesignProposal } from "./designProposal";
import type { ProductMediaIndex } from "../data/productMedia";
import type { StoredProjectProposal } from "../data/projectStore";
import type { SalesBomRow } from "./salesReadiness";

const proposal: StoredProjectProposal = {
  title: "Operations room", summary: "Help operators share incident information.", sections: [], products: [], assumptions: [], updatedAt: "2026-09-25",
  salesContent: { objectives: "Keep the duty team informed.", solutionOverview: "Operators can share the agreed incident feeds with the wider team.", externalScope: "Displays | Customer supplies four displays | Mounts by integrator" },
};
const rows: SalesBomRow[] = [{ item: 1, sku: "NHD-600-TX", description: "Source encoder", role: "Source distribution", qty: 2, type: "Required", status: "included", evidence: "", notes: "" }];
const media: ProductMediaIndex = { products: [], lookup: { "NHD-600-TX": { sku: "NHD-600-TX", status: "primary-only", officialProductUrl: "https://www.wyrestorm.com/product/nhd-600-tx/", front: { url: "https://www.wyrestorm.com/example.png", alt: "Encoder front", view: "front", sourceUrl: "", confidence: "HIGH" }, gallery: [], notes: [] } } };

describe("customer proposal story and references", () => {
  it("keeps exact product identity and rejects unsafe web links", () => {
    expect(proposalProductCards(rows, media)[0].imageUrl).toContain("example.png");
    expect(proposalProductCards([{ ...rows[0], sku: "NHD-600-RX" }], media)[0].imageUrl).toBeUndefined();
    expect(proposalProductCards([{ ...rows[0], status: "excluded" }], media)).toEqual([]);
    expect(safeProposalWebUrl("javascript:alert(1)")).toBeUndefined();
    expect(safeProposalWebUrl("https://user:password@example.com")).toBeUndefined();
  });

  it("describes intended operation without promising unverified expansion", () => {
    const story = proposalSolutionStory(proposal, rows);
    expect(story.overview).toBe(proposal.salesContent!.solutionOverview);
    expect(story.operation.join(" ")).toContain("subject to endpoint compatibility");
    expect(story.externalScope).toContain("Customer supplies four displays");
    expect(proposalSolutionStory({ ...proposal, salesContent: undefined }, []).externalScope).toContain("[complete]");
  });

  it("exports the authored story, concept topology and product links in HTML", () => {
    const html = buildProposalHtml(proposal, rows, [], media);
    expect(html).toContain(proposal.salesContent!.solutionOverview);
    expect(html).toContain(proposal.salesContent!.objectives);
    expect(html).toContain(proposal.salesContent!.externalScope);
    expect(html).toContain('aria-label="Concept signal-flow diagram"');
    expect(html).toContain('href="https://www.wyrestorm.com/product/nhd-600-tx/"');
    expect(html).toContain('alt="Encoder front"');
  });

  it("puts photographs and live hyperlink relationships in Word, with missing-image fallback", async () => {
    const wizard = createProposalWizardDefaults({ projectId: "p", projectName: proposal.title, preparedBy: "Sales", executiveSummary: proposal.summary, architectureNarrative: "Agreed routing", proposedSolution: proposal.salesContent!.solutionOverview });
    wizard.externalScope = proposal.salesContent!.externalScope;
    const image = { data: Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aH1kAAAAASUVORK5CYII="), (c) => c.charCodeAt(0)), type: "png" as const, title: "Encoder", width: 1, height: 1 };
    const zip = await JSZip.loadAsync(await Packer.toBuffer(buildProposalDocx(proposal, rows, wizard, { media, products: { "NHD-600-TX": image } })));
    const xml = await zip.file("word/document.xml")!.async("string");
    const links = await zip.file("word/_rels/document.xml.rels")!.async("string");
    expect(xml).toContain(proposal.salesContent!.externalScope);
    expect(xml).toContain("Solution Overview");
    expect(xml).toContain("w:hyperlink");
    expect(xml).toContain("w:drawing");
    expect(links).toContain("https://www.wyrestorm.com/product/nhd-600-tx/");
    const fallback = await JSZip.loadAsync(await Packer.toBuffer(buildProposalDocx(proposal, rows, wizard)));
    expect(await fallback.file("word/document.xml")!.async("string")).toContain("Product photograph unavailable.");
  });

  it("preserves authored content through project reload and changes the approval revision when scope changes", () => {
    const project = decodeStoredProject({ id: "p", name: "Room", owner: "Sales", stage: "Proposal", status: "ready", updated: "Today", createdAt: "2026-09-25", updatedAt: "2026-09-25", resumeTo: "/wingman/proposal", proposal })!;
    expect(project.proposal?.salesContent).toEqual(proposal.salesContent);
    const before = compileDesignProposal(project).contentHash;
    project.proposal!.salesContent!.externalScope = "Displays excluded";
    expect(compileDesignProposal(project).contentHash).not.toBe(before);
  });
});
