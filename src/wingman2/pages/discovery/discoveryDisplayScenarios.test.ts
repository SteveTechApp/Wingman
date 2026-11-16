import { describe, expect, it } from "vitest";
import { buildDiscoveryRecommendationEvidence } from "../../lib/recommendationEvidence";
import { evaluateDiscoveryDecisionIntegrity } from "../../lib/discoveryDecisionIntegrity";
import type { StoredDiscoveryBrief } from "../../features/projects";
import { BASIC_MODE_REQUIRED_IDS } from "./discoveryProgressiveDisclosure";
import { canonicalDiscoveryQuestions, getVisibleDiscoveryQuestions } from "./discoveryQuestions";

function displayBehaviourOptions(answers: Record<string, string | string[]>) {
  return getVisibleDiscoveryQuestions("meeting-room", answers)
    .find((question) => question.id === "display-behaviour")?.options.map((option) => option.value) ?? [];
}

describe("primary and repeater display scenarios", () => {
  it("offers the requested primary display arrangements in the essential flow", () => {
    const primary = canonicalDiscoveryQuestions.find((question) => question.id === "primary-display")!;
    expect(BASIC_MODE_REQUIRED_IDS).toContain("primary-display");
    expect(primary.options.map((option) => option.value)).toEqual(expect.arrayContaining([
      "single-large-flat-panel",
      "dual-large-flat-panels",
      "three-large-flat-panels",
      "single-projector",
      "dual-projectors",
      "lcd-video-wall",
      "led-video-wall",
    ]));
    const ids = getVisibleDiscoveryQuestions("meeting-room", {}).map((question) => question.id);
    expect(ids.indexOf("primary-display")).toBeLessThan(ids.indexOf("displays"));
    expect(ids.indexOf("displays")).toBeLessThan(ids.indexOf("repeater-displays"));
    expect(ids.indexOf("repeater-displays")).toBeLessThan(ids.indexOf("display-behaviour"));
  });

  it("hides repeater purposes when no repeaters are needed", () => {
    const options = displayBehaviourOptions({
      "primary-display": "single-large-flat-panel",
      displays: "one-display",
      "repeater-displays": "no-repeater-displays",
    });
    expect(options).not.toContain("overflow-viewing");
    expect(options).not.toContain("room-wide-visibility");
  });

  it.each(["one-two-repeater-displays", "unknown-repeater-displays"])(
    "offers overflow and room-wide visibility choices when repeater count is %s",
    (repeaterCount) => {
      const options = displayBehaviourOptions({
        "primary-display": "single-large-flat-panel",
        displays: "three-eight-displays",
        "repeater-displays": repeaterCount,
      });
      expect(options).toContain("overflow-viewing");
      expect(options).toContain("room-wide-visibility");
    },
  );

  it.each(["lcd-video-wall", "led-video-wall"])(
    "keeps wall processing available for a one-feed %s",
    (primaryDisplay) => {
      const options = displayBehaviourOptions({
        "primary-display": primaryDisplay,
        displays: "one-display",
        "repeater-displays": "no-repeater-displays",
      });
      expect(options).toContain("video-wall-or-processor-feed");
      expect(options).not.toContain("independent-routing-per-display");
      const integrity = evaluateDiscoveryDecisionIntegrity([], {
        "primary-display": primaryDisplay,
        displays: "one-display",
        "repeater-displays": "no-repeater-displays",
        "display-behaviour": ["video-wall-or-processor-feed"],
      });
      expect(integrity.contradictions).toEqual([]);
    },
  );

  it("hides wall-processing behaviour for a known flat-panel primary arrangement", () => {
    const options = displayBehaviourOptions({
      "primary-display": "dual-large-flat-panels",
      displays: "two-displays",
      "repeater-displays": "no-repeater-displays",
    });
    expect(options).not.toContain("video-wall-or-processor-feed");
  });

  it("flags a total range below the known primary and repeater minimum", () => {
    const integrity = evaluateDiscoveryDecisionIntegrity([], {
      "primary-display": "single-large-flat-panel",
      displays: "three-eight-displays",
      "repeater-displays": "nine-plus-repeater-displays",
    });
    expect(integrity.contradictions.map((issue) => issue.title)).toContain("Display count is below the selected display needs");
  });

  it("carries primary display and repeater facts into recommendation evidence", () => {
    const brief = {
      savedAt: "2026-11-10T00:00:00.000Z",
      roomModel: {
        primaryDisplayArrangement: "LED video wall",
        displayCount: "3-8 displays / outputs",
        repeaterDisplayCount: "3-4 repeater screens",
        repeaterDisplayPurpose: ["Repeater screens for overflow seating"],
        displayBehaviour: "Same content on all displays",
      },
    } as unknown as StoredDiscoveryBrief;
    const evidence = buildDiscoveryRecommendationEvidence(brief);
    const text = evidence.evidenceUsed.join(" ");
    expect(text).toContain("Primary display arrangement: LED video wall");
    expect(text).toContain("Display count: 3-8 displays / outputs");
    expect(text).toContain("Repeater screen count: 3-4 repeater screens");
    expect(text).toContain("Repeater purpose: Repeater screens for overflow seating");
  });
});
