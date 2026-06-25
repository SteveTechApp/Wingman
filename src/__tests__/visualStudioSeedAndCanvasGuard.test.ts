import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Visual Studio seed handoff and canvas readability", () => {
  it("opens product discussion links on the product connection view", () => {
    const page = readFileSync(join(process.cwd(), "src/wingman2/pages/VisualStudioPage.tsx"), "utf8");

    expect(page).toContain("readSeedSku");
    expect(page).toContain("getInitialVisualStudioDiagramId");
    expect(page).toContain('"product-port-view"');
    expect(page).toContain("buildProductConnectionDiagram");
    expect(page).toContain("findProductIntelligenceEntry");
  });
});
