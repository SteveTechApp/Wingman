import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// The compare route owns a stylesheet of its own, split out of the shared route
// overrides, so the contract is read from every route stylesheet rather than
// from the remainder file a rule may have left.
const stylesDirectory = resolve(process.cwd(), "src/wingman2/styles");
const css = readdirSync(stylesDirectory)
  .filter((name) => /^wingman-route-.*\.css$/.test(name))
  .sort()
  .map((name) => readFileSync(resolve(stylesDirectory, name), "utf8"))
  .join("\n");

describe("Compare export menu styling", () => {
  it("keeps menu styling scoped and keyboard-visible", () => {
    expect(css).toContain('html[data-wingman-route="compare"] .compare-native-history-export');
    expect(css).toContain("[role=\"menuitem\"]:focus-visible");
    expect(css).toContain("@media (max-width: 600px)");
  });
});
