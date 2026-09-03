import { describe, expect, it } from "vitest";
import { findStrandedQuickStartDefaults, removeDiscoveryAnswerValue } from "./discoveryAnswerUtils";
import { getVisibleDiscoveryQuestions } from "./discoveryQuestions";
import { quickStartConfigs } from "./discoveryQuickStart";
import type { DiscoveryAnswers } from "./discoveryTypes";

// findStrandedQuickStartDefaults — the set-level version of the step alert:
// a stored quick-start default whose option a later answer hid must show up in
// the summary/completion surfaces too, so the conflict is visible outside the
// step where it was caused.
describe("findStrandedQuickStartDefaults", () => {
  it("reports a default the interview hides after a later answer", () => {
    // Lecture hall seeds independent routing per display; answering
    // displays = one-display hides that option across the whole set.
    const lectureHallDefaults = quickStartConfigs["lecture-hall"].defaults;
    const changedAnswers: DiscoveryAnswers = {
      ...lectureHallDefaults,
      opportunity: "classroom",
      displays: "one-display",
    };
    const visible = getVisibleDiscoveryQuestions("classroom", changedAnswers);
    const stranded = findStrandedQuickStartDefaults(visible, changedAnswers);

    // Without provenance the caller cannot tell the value's origin, so it
    // reads as quick-start (the pre-existing wording) — the safe default for
    // legacy imports and quote-safety scans over saved answers.
    expect(stranded).toContainEqual({
      questionId: "display-behaviour",
      questionLabel: expect.any(String),
      optionValue: "independent-routing-per-display",
      optionLabel: "Different content by display or zone",
      origin: "quick-start",
    });
  });

  it("calls an untouched app-applied default quick-start origin", () => {
    // The app seeded lecture hall and the rep never touched the value: the
    // applied-defaults record still matches the stored answer, so the strand
    // is an untouched quick-start pre-fill (safe for the bulk removal action).
    const lectureHallDefaults = quickStartConfigs["lecture-hall"].defaults;
    const changedAnswers: DiscoveryAnswers = {
      ...lectureHallDefaults,
      opportunity: "classroom",
      displays: "one-display",
    };
    const visible = getVisibleDiscoveryQuestions("classroom", changedAnswers);
    const stranded = findStrandedQuickStartDefaults(
      visible,
      changedAnswers,
      { ...lectureHallDefaults, opportunity: "classroom" } as DiscoveryAnswers,
    );

    expect(stranded).toContainEqual({
      questionId: "display-behaviour",
      questionLabel: expect.any(String),
      optionValue: "independent-routing-per-display",
      optionLabel: "Different content by display or zone",
      origin: "quick-start",
    });
  });

  it("calls a rep-changed answer rep-typed so bulk removal keeps it", () => {
    // The app applied one value but the rep later picked their own answer:
    // the stored value no longer matches the record, so the strand is the
    // rep's own choice and must NOT be silently bulk-removed. The rep-typed
    // value is itself a hidden option (a wall feed is not selectable for one
    // display), so it strands — but with rep-typed origin.
    const lectureHallDefaults = quickStartConfigs["lecture-hall"].defaults;
    const changedAnswers: DiscoveryAnswers = {
      ...lectureHallDefaults,
      opportunity: "classroom",
      displays: "one-display",
      // The rep changed the behaviour answer themselves before displays hid it.
      "display-behaviour": "video-wall-or-processor-feed",
    };
    const visible = getVisibleDiscoveryQuestions("classroom", changedAnswers);
    const stranded = findStrandedQuickStartDefaults(
      visible,
      changedAnswers,
      { ...lectureHallDefaults, opportunity: "classroom" } as DiscoveryAnswers,
    );

    expect(stranded).toContainEqual({
      questionId: "display-behaviour",
      questionLabel: expect.any(String),
      optionValue: "video-wall-or-processor-feed",
      optionLabel: expect.any(String),
      origin: "rep-typed",
    });
    expect(stranded.every((entry) => entry.origin === "rep-typed")).toBe(true);
  });

  it("keeps a default that survives the changed answers (mirrored content)", () => {
    // Training room seeds mirrored content, which one-display keeps visible.
    const trainingRoomDefaults = quickStartConfigs["training-room"].defaults;
    const changedAnswers: DiscoveryAnswers = {
      ...trainingRoomDefaults,
      opportunity: "classroom",
      displays: "one-display",
    };
    const visible = getVisibleDiscoveryQuestions("classroom", changedAnswers);
    const stranded = findStrandedQuickStartDefaults(visible, changedAnswers);

    expect(stranded.filter((entry) => entry.questionId === "display-behaviour")).toEqual([]);
  });

  it("ignores raw-input values that were never options of the question", () => {
    const answers: DiscoveryAnswers = {
      opportunity: "not-sure",
      displays: "one-display",
      "display-behaviour": "not-a-real-option",
    };
    const visible = getVisibleDiscoveryQuestions("not-sure", answers);
    expect(findStrandedQuickStartDefaults(visible, answers)).toEqual([]);
  });

  it("returns no stranded defaults for an untouched quick-start seed", () => {
    // A freshly-seeded room without later answers has nothing to report —
    // this pins that the validation gate (no quick-start room seeds a default
    // the interview hides at start) holds end to end.
    for (const [roomType, config] of Object.entries(quickStartConfigs)) {
      const seeded = { opportunity: config.suggestedApplication, ...config.defaults } as DiscoveryAnswers;
      const visible = getVisibleDiscoveryQuestions(config.suggestedApplication, seeded);
      const stranded = findStrandedQuickStartDefaults(visible, seeded);
      expect(stranded, `${roomType} seeds a self-stranded default`).toEqual([]);
    }
  });
});

describe("removeDiscoveryAnswerValue", () => {
  it("removes one member from an array answer and keeps the rest", () => {
    const multi: DiscoveryAnswers = {
      sources: ["laptops", "camera", "media-players"],
      displays: "one-display",
    };
    const removed = removeDiscoveryAnswerValue(multi, "sources", "camera");
    expect(removed.sources).toEqual(["laptops", "media-players"]);
    expect(removed.displays).toBe("one-display");
  });

  it("empties the array when the last member is removed", () => {
    const multi: DiscoveryAnswers = { sources: ["camera"] };
    const removed = removeDiscoveryAnswerValue(multi, "sources", "camera");
    expect(removed.sources).toEqual([]);
  });

  it("deletes a single-value answer that matches exactly", () => {
    const answers: DiscoveryAnswers = { "display-behaviour": "independent-routing-per-display", displays: "one-display" };
    const next = removeDiscoveryAnswerValue(answers, "display-behaviour", "independent-routing-per-display");
    expect("display-behaviour" in next).toBe(false);
    expect(next.displays).toBe("one-display");
  });

  it("returns the same reference when the value is absent", () => {
    const answers: DiscoveryAnswers = { displays: "one-display" };
    expect(removeDiscoveryAnswerValue(answers, "displays", "two-displays")).toBe(answers);
    expect(removeDiscoveryAnswerValue(answers, "never-set", "anything")).toBe(answers);
  });
});