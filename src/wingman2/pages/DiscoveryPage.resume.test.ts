import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const readDiscoveryPage = () =>
  readFileSync(join(process.cwd(), "src/wingman2/pages/DiscoveryPage.tsx"), "utf8");

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
    const source = readDiscoveryPage();

    // The dashboard/project-card resume links land on `?resume=project&interview=1`;
    // the page must open straight into the interview and treat the visit as intentional
    // (no existing-discovery warning), so the interview resumes at the first open question.
    expect(source).toContain('searchParams.get("interview") === "1"');
    expect(source).toMatch(/useState\(\s*\(\) => searchParams.get\("interview"\) === "1",\s*\)/);
  });
});

describe("voice interview entry", () => {
  it("invites the rep with the progress card rather than a bare mode toggle", () => {
    const source = readDiscoveryPage();

    // The interview is a way of capturing the room, not a third question set,
    // so the tool row keeps only the two question readings and the entry card
    // carries the progress the rep would resume.
    expect(source.match(/<DiscoveryGuidedInterviewEntry/g)).toHaveLength(1);
    expect(source).not.toMatch(/>\s*Voice interview\s*</);
    expect(source).toContain("total={modeQuestions.length}");
    expect(source).toContain("openCount={modeQuestions.filter((question) => confirmedSteps[question.id] !== true).length}");
  });

  it("starts the open-row walk when the rep takes the re-verify card", () => {
    const source = readDiscoveryPage();

    // The focused re-verify entry only narrows the walk because the page hands
    // the interview `reviewScope="open"`; without this wiring the card would
    // start a full re-walk while promising open rows only.
    expect(source).toContain('onStartReviewOpen={() => { setReviewScope("open");');
    expect(source).toContain('onStart={() => { setReviewScope("all");');
  });
});
