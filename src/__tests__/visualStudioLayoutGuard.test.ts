import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Visual Studio layout guard", () => {
  it("keeps Visual Studio readable at browser zoom with a usable React Flow canvas", () => {
    const css = readFileSync(join(process.cwd(), "src/wingman2/styles/wingman-route-overrides.css"), "utf8");

    expect(css).toContain("Wingman Visual Studio compact layout repair start");
    expect(css).toContain(".wm-vs-layout");
    expect(css).toContain("grid-template-columns: minmax(220px, 252px) minmax(720px, 1fr) minmax(230px, 286px)");
    expect(css).toContain(".wm-vs-canvas-shell");
    expect(css).toContain("grid-template-rows: auto minmax(580px, 1fr)");
    expect(css).toContain(".wm-vs-canvas");
    expect(css).toContain("min-height: 640px");
    expect(css).toContain(".wm-vs-choice");
    expect(css).toContain("white-space: normal");
    expect(css).toContain("@media (max-width: 1400px)");
  });
});
