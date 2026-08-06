import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("existing Discovery resume warning", () => {
  it("renders only the state-controlled warning and wires its resume action", () => {
    const source = readFileSync(join(process.cwd(), "src/wingman2/pages/DiscoveryPage.tsx"), "utf8");

    expect(source.match(/<div className="wm-existing-discovery-warning-backdrop">/g)).toHaveLength(1);
    expect(source).toContain("onClick={continueExistingDiscovery}");
    expect(source).toContain("setShowExistingDiscoveryWarning(false)");
  });
});
