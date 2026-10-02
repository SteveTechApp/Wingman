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
    expect(briefBuilder).toContain("discoveryConversation: buildDiscoveryConversation(modeQuestions, answers, notes, selectedApplication, confirmedSteps, confidenceByStep, confidenceScoresByStep)");
    expect(briefBuilder).toContain('buildDiscoveryConversation,\n');
  });
});
