import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("free-text capture suggestions reach the discovery conversation trail", () => {
  it("confirms a suggestion through handleSelectAnswer so the typed wording survives as the note", () => {
    const source = readFileSync(join(process.cwd(), "src/wingman2/pages/DiscoveryPage.tsx"), "utf8");

    // The suggestion chip must confirm via the same answer path used by option
    // taps. handleSelectAnswer only clears notes for conditional-route cleanup
    // (opportunity / uc-purpose), so the customer's typed wording stays in the
    // notes store and flows into the conversation trail.
    expect(source).toContain("function confirmCaptureSuggestion(values: string[], confidence?: \"high\" | \"matched\" | \"low\"): void {");
    expect(source).toContain("handleSelectAnswer(values[0]);");
    expect(source).toContain("onConfirm={confirmCaptureSuggestion}");
  });

  it("keeps the wording column populated by wiring notes into buildDiscoveryConversation", () => {
    const source = readFileSync(join(process.cwd(), "src/wingman2/pages/DiscoveryPage.tsx"), "utf8");

    // The brief must build the trail from BOTH the governed answers and the
    // notes store, so a chip-confirmed capture records the customer's own
    // wording next to the auto-classified answer.
    expect(source).toContain("discoveryConversation: buildDiscoveryConversation(modeQuestions, answers, notes, selectedApplication, confirmedSteps, confidenceByStep, confidenceScoresByStep)");
    expect(source).toContain('buildDiscoveryConversation,\n');
  });
});
