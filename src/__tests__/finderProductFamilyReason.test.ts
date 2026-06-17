import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Finder product-family ranking reason", () => {
  it("shows sales users why the top Finder match was prioritised", () => {
    const source = readFileSync(join(process.cwd(), "src/wingman2/pages/FinderPage.tsx"), "utf8");

    expect(source).toContain("getProductFamilyRankingReason");
    expect(source).toContain("topFinderRankingReason");
    expect(source).toContain("Why this is first: {topFinderRankingReason}");
    expect(source).toContain("finder-product-family-ranking-reason");
    expect(source).toContain('data-testid="finder-product-family-ranking-reason"');
  });
});
