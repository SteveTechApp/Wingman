import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Proposal Visuals route consolidation", () => {
  it("redirects the legacy Visual Studio URL to the canonical Proposal Visuals workflow", () => {
    const root = process.cwd();
    const routes = readFileSync(join(root, "src/wingman2/app/routes.tsx"), "utf8");
    const proposalVisuals = readFileSync(
      join(root, "src/wingman2/pages/ProposalVisualsPage.tsx"),
      "utf8",
    );

    expect(
      existsSync(join(root, "src/wingman2/pages/VisualStudioPage.tsx")),
    ).toBe(false);

    expect(routes).toContain("visual-studio");
    expect(routes).toContain("proposal-visuals");
    expect(routes).toContain("technical-schematic");

    expect(proposalVisuals).toContain("VisualStudioCanvas");
    expect(proposalVisuals).toContain("buildWholeProjectVisualDiagram");
    expect(proposalVisuals).toContain("technical-schematic");
    expect(proposalVisuals).toContain("Generate visual");
  });
});