import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("existing Discovery resume warning", () => {
  it("renders only the state-controlled warning and wires its resume action", () => {
    const source = readFileSync(join(process.cwd(), "src/wingman2/pages/DiscoveryPage.tsx"), "utf8");

    expect(source.match(/<ExistingDiscoveryWarning/g)).toHaveLength(1);
    expect(source).toContain("onContinue={continueExistingDiscovery}");
    expect(source).toContain("setShowExistingDiscoveryWarning(false)");
  });

  it("does not nest a second page host inside the AppShell page host", () => {
    const source = readFileSync(join(process.cwd(), "src/wingman2/pages/DiscoveryPage.tsx"), "utf8");

    expect(source).not.toMatch(/<main[^>]+className="[^"]*wingman-page-host/);
    expect(source).toContain('className="wm-discovery-capture-page wm-ui-page"');
  });
});
