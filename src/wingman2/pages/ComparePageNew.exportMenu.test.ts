import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(process.cwd(), "src/wingman2/styles/wingman-route-overrides.css"), "utf8");

describe("Compare export menu styling", () => {
  it("keeps menu styling scoped and keyboard-visible", () => {
    expect(css).toContain('html[data-wingman-route="compare"] .compare-native-history-export');
    expect(css).toContain("[role=\"menuitem\"]:focus-visible");
    expect(css).toContain("@media (max-width: 600px)");
  });
});
