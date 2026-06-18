import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Visual Studio seed handoff and canvas readability", () => {
  it("opens product discussion links on the product connection view", () => {
    const page = readFileSync(join(process.cwd(), "src/wingman2/pages/VisualStudioPage.tsx"), "utf8");

    expect(page).toContain("readSeedSku");
    expect(page).toContain("getInitialVisualStudioDiagramId");
    expect(page).toContain('"product-port-view"');
    expect(page).toContain("replaceSeedProductNode");
    expect(page).toContain("Seed product:");
  });

  it("keeps React Flow nodes readable instead of scaling them down too far", () => {
    const canvas = readFileSync(join(process.cwd(), "src/wingman2/components/VisualStudioCanvas.tsx"), "utf8");
    const factory = readFileSync(join(process.cwd(), "src/wingman2/lib/visualStudioDiagramFactory.ts"), "utf8");
    const css = readFileSync(join(process.cwd(), "src/wingman2/styles/wingman-style-stack.css"), "utf8");

    expect(canvas).toContain("fitViewOptions={{ padding: 0.08 }}");
    expect(canvas).toContain("minZoom={0.65}");
    expect(canvas).toContain("maxZoom={1.8}");

    expect(factory).toContain("VISUAL_STUDIO_COLUMN_GAP = 210");
    expect(factory).toContain("VISUAL_STUDIO_ROW_GAP = 132");
    expect(factory).toContain("node.column * VISUAL_STUDIO_COLUMN_GAP");
    expect(factory).toContain("node.row * VISUAL_STUDIO_ROW_GAP");

    expect(css).toContain("Wingman Visual Studio readable flow scale start");
    expect(css).toContain(".wm-vs-flow-node");
    expect(css).toContain("width: 190px");
    expect(css).toContain(".react-flow__minimap");
    expect(css).toContain("display: none");
  });
});
