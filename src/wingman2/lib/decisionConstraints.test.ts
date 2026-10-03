import { describe, expect, it } from "vitest";
import { evaluateDecisionConstraints, hasBlockingDecisionIssue } from "./decisionConstraints";

describe("decision constraint engine", () => {
  it("reports every active cross-answer issue without mutating workflow state", () => {
    const state = { transport: "hdmi", distance: "100m", layout: "fixed" };
    const issues = evaluateDecisionConstraints(state, [
      {
        id: "distance",
        severity: "blocking" as const,
        fields: ["transport", "distance"],
        when: (current) => current.transport === "hdmi" && current.distance === "100m",
        title: "Transport distance mismatch",
        detail: "The selected transport cannot cover the requested distance.",
        resolution: "Choose an extension transport.",
      },
    ]);

    expect(issues).toHaveLength(1);
    expect(hasBlockingDecisionIssue(issues)).toBe(true);
    expect(state).toEqual({ transport: "hdmi", distance: "100m", layout: "fixed" });
  });
});
