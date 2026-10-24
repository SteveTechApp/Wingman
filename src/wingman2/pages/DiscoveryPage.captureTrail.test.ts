import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("free-text capture suggestions reach the discovery conversation trail", () => {
  it("confirms a suggestion against its owning question and preserves the typed wording", () => {
    const source = readFileSync(join(process.cwd(), "src/wingman2/pages/DiscoveryPage.tsx"), "utf8");
    const expertBuilder = readFileSync(join(process.cwd(), "src/wingman2/pages/discovery/DiscoveryExpertBuilder.tsx"), "utf8");
    const roomWizard = readFileSync(join(process.cwd(), "src/wingman2/pages/discovery/DiscoveryRoomWizard.tsx"), "utf8");

    // Both authoring surfaces confirm to the owning question. The typed note is
    // already stored separately and the suggestion handler only updates answers.
    expect(source).toContain("function confirmCaptureSuggestion(questionId: string, values: string[], confidence?: \"high\" | \"matched\" | \"low\"): void {");
    expect(source).toContain("[questionId]: values[0]");
    expect(source).toContain("onConfirmCaptureSuggestion={confirmCaptureSuggestion}");
    expect(expertBuilder).toContain("<DiscoveryCaptureSuggestion step={question} view={view} note={note}");
    expect(roomWizard).toContain("<DiscoveryCaptureSuggestion step={canonical}");
  });

  it("hands the room's name to the wall builder beside the answers", () => {
    const source = readFileSync(join(process.cwd(), "src/wingman2/pages/DiscoveryPage.tsx"), "utf8");

    // A wall answered here is answered for one room. The builder otherwise only
    // learns the wall behaviour, so the capture passes the name it recorded for
    // the room — from the saved project or the draft — rather than a placeholder.
    expect(source).toContain('(existingDiscoveryProject?.name || discoveryDraft?.projectName || "").trim()');
    expect(source).toContain("discoveryVideoWallHandoff(answers, discoveryRoomName)");
    expect(source).toContain("writeVideoWallHandoff(videoWallHandoff)");
  });

  it("keeps the wording column populated by wiring notes into buildDiscoveryConversation", () => {
    const source = readFileSync(join(process.cwd(), "src/wingman2/pages/DiscoveryPage.tsx"), "utf8");
    const briefBuilder = readFileSync(
      join(process.cwd(), "src/wingman2/pages/discovery/discoveryBriefBuilder.ts"),
      "utf8",
    );

    // The brief must build the trail from BOTH the governed answers and the
    // notes store, so a chip-confirmed capture records the customer's own
    // wording next to the auto-classified answer.
    expect(source).toContain("return compileDiscoveryBrief({");
    expect(briefBuilder).toContain("buildDiscoveryConversation(discoveryQuestions.filter");
    expect(briefBuilder).toContain("wmDiscoveryHasAnswer(answers[step.id]) || Boolean(notes[step.id]?.trim())");
    expect(briefBuilder).toMatch(/buildDiscoveryConversation,\s/);
  });
});
