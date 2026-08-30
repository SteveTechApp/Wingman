import { describe, expect, it } from "vitest";
import { evaluateDiscoveryDecisionIntegrity } from "./discoveryDecisionIntegrity";
import type { DiscoveryQuestion } from "../pages/discovery/discoveryTypes";

const question = (id: string, required = true): DiscoveryQuestion => ({
  id,
  shortLabel: id,
  section: "Test",
  question: `What is the ${id}?`,
  prompt: "Choose",
  why: "Test",
  required,
  capturePlaceholder: "",
  options: [],
});

describe("evaluateDiscoveryDecisionIntegrity", () => {
  it("flags mutually exclusive UC answers", () => {
    const result = evaluateDiscoveryDecisionIntegrity(
      [question("uc-purpose")],
      { "uc-purpose": ["no-uc", "video-conferencing"] },
    );
    expect(result.contradictions[0]?.title).toBe("Conflicting communications scope");
    expect(result.canProceedToRecommendation).toBe(false);
  });

  it("flags a missing required answer and supplies a targeted question", () => {
    const result = evaluateDiscoveryDecisionIntegrity([question("signal-standard")], {}, {});
    expect(result.underspecified).toHaveLength(1);
    expect(result.underspecified[0]?.followUpQuestion).toContain("signal-standard");
    expect(result.canProceedToRecommendation).toBe(false);
  });

  it("allows a complete, internally consistent answer set", () => {
    const result = evaluateDiscoveryDecisionIntegrity(
      [question("usb"), question("display-behaviour")],
      { usb: ["no-usb"], "display-behaviour": ["same-content-all-displays"] },
    );
    expect(result.issues).toEqual([]);
    expect(result.canProceedToRecommendation).toBe(true);
  });
});
