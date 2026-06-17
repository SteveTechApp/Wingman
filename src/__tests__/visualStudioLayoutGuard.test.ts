import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Visual Studio layout guard", () => {
  it("keeps Visual Studio readable at browser zoom with a usable React Flow canvas", () => {
    const css = readFileSync(join(process.cwd(), "src/wingman2/styles/wingman-style-stack.css"), "utf8");

    expect(css).toContain("Wingman Visual Studio compact layout repair start");
    expect(css).toContain(".wm-vs-layout");
    expect(css).toContain("grid-template-columns: minmax(225px, 280px) minmax(520px, 1fr) minmax(250px, 330px)");
    expect(css).toContain(".wm-vs-canvas-shell");
    expect(css).toContain("grid-template-rows: auto minmax(500px, 1fr)");
    expect(css).toContain(".wm-vs-canvas");
    expect(css).toContain("min-height: 500px");
    expect(css).toContain(".wm-vs-choice");
    expect(css).toContain("white-space: normal");
    expect(css).toContain("@media (max-width: 1400px)");
  });
});
