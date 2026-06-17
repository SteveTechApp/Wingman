import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Finder product-family ranking handoff", () => {
  it("keeps Finder matches ranked by stored product-family scores when available", () => {
    const source = readFileSync(join(process.cwd(), "src/wingman2/pages/FinderPage.tsx"), "utf8");

    expect(source).toContain("rankProductsByFamilyScores");
    expect(source).toContain("finderProductFamilyScores");
    expect(source).toContain("activeProject?.recommendationEvidence?.productFamilyScores");
    expect(source).toContain("workflowProject?.recommendationEvidence?.productFamilyScores");
    expect(source).toContain("rankedMatches");
  });
});
