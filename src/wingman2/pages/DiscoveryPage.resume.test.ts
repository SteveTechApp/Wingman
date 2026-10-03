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

  it("auto-starts the guided interview from the dashboard resume link", () => {
    const source = readFileSync(join(process.cwd(), "src/wingman2/pages/DiscoveryPage.tsx"), "utf8");

    // The dashboard/project-card resume links land on `?resume=project&interview=1`;
    // the page must open straight into the interview and treat the visit as intentional
    // (no existing-discovery warning), so the interview resumes at the first open question.
    expect(source).toContain('searchParams.get("interview") === "1"');
    expect(source).toContain('useState(\n    () => searchParams.get("interview") === "1",\n  )');
  });
});
