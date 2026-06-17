import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Project Detail product-family ranking reason", () => {
  it("surfaces the product-family ranking reason in the command cards", () => {
    const source = readFileSync(join(process.cwd(), "src/wingman2/pages/ProjectDetailPage.tsx"), "utf8");

    expect(source).toContain("getProductFamilyRankingReason");
    expect(source).toContain("selectedProductRankingReasons");
    expect(source).toContain('label: "Ranking reason"');
    expect(source).toContain("No product-family ranking reason has been stored");
  });
});
