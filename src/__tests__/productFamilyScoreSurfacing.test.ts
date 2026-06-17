import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("product-family score surfacing", () => {
  it("keeps the Project Detail command centre product-family decision visible", () => {
    const source = readSource("src/wingman2/pages/ProjectDetailPage.tsx");

    expect(source).toContain("Product-family decision");
    expect(source).toContain("Product-family scores");
    expect(source).toContain("leadingProductFamilyScore");
    expect(source).toContain("recommendationEvidence?.productFamilyScores");
  });

  it("keeps product-family scores in Proposal preview and saved proposal data", () => {
    const source = readSource("src/wingman2/pages/ProposalPage.tsx");

    expect(source).toContain("Proposal product-family decision");
    expect(source).toContain("const productFamilyScores = useMemo");
    expect(source).toContain("leadingProductFamilyScore");
    expect(source).toContain("productFamilyScores,");
  });

  it("keeps product-family decision in exported proposal HTML", () => {
    const source = readSource("src/wingman2/lib/proposalExport.ts");

    expect(source).toContain("Product Family Decision");
    expect(source).toContain("productFamilyDecisionHtml");
    expect(source).toContain("leadingProductFamilyScore");
    expect(source).toContain("proposal.productFamilyScores");
  });

  it("keeps product-family scores on the stored proposal model", () => {
    const source = readSource("src/wingman2/data/projectStore.ts");

    expect(source).toContain("export type StoredProductFamilyScore");
    expect(source).toContain("productFamilyScores?: StoredProductFamilyScore[];");
  });
});
