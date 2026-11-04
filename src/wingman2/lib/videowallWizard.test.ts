import { describe, expect, it } from "vitest";
import { defaultWallRequirements } from "./videowallOptions";
import { videowallLocationChoices, videowallLocationKeyFor, videowallNetworkChoices, videowallNetworkKeyFor } from "./videowallDraft";
import {
  wallWizardAnswers,
  wallWizardApplicationPatch,
  wallWizardConcernChecks,
  wallWizardConcerns,
  wallReviewStageStatuses,
  wallDesignBands,
  wallReviewStages,
  wallWizardLayoutChoices,
  wallWizardSteps,
} from "./videowallWizard";

describe("guided video wall wizard", () => {
  it("summarises each question with the answer the design used", () => {
    const answers = wallWizardAnswers({ ...defaultWallRequirements, columns: 3, rows: 3, sources: 9, layout: "nine" });
    expect(answers.map((answer) => answer.key)).toEqual(["picture", "size", "sources", "network", "feeding", "layout"]);
    expect(answers.find((answer) => answer.key === "size")?.value).toContain("3 × 3 (9 panels)");
    expect(answers.find((answer) => answer.key === "layout")?.value).toBe("Nine windows");
    // The connection sits between the size and the layout, and reads the build
    // the answers describe rather than a value kept beside them.
    const looping = wallWizardAnswers({ ...defaultWallRequirements, application: "lcd-loop", layout: "nine", windows: 9 });
    expect(looping.map((answer) => answer.key)).toContain("feeding");
    expect(looping.find((answer) => answer.key === "feeding")?.value).toBe("One canvas, panels tile it");
    expect(answers.find((answer) => answer.key === "feeding")?.value).toBe("9 feeds, a panel per feed");
    expect(answers.find((answer) => answer.key === "sources")?.value).toBe("9 sources at 4K60");
    expect(answers.find((answer) => answer.key === "network")?.value).toBe("Choose a network option");
  });

  it("describes LED, projection and custom pixel answers", () => {
    const led = wallWizardAnswers({ ...defaultWallRequirements, application: "led", ledCanvasWidth: 5120, ledCanvasHeight: 1440, sources: 1 });
    expect(led.find((answer) => answer.key === "size")?.value).toContain("5120 × 1440 LED canvas");
    const projector = wallWizardAnswers({ ...defaultWallRequirements, application: "projection", sources: 2, displayResolution: "1080p" });
    // The box and what it carries are two answers: the drawn millimetres of the
    // wall, then the sources at their timing.
    expect(projector.find((answer) => answer.key === "size")?.value)
      .toBe("One projector at 1080p · Screen 1,218 × 685 mm (55 in)");
    expect(projector.find((answer) => answer.key === "sources")?.value)
      .toBe("2 sources at 4K60");
    const custom = wallWizardAnswers({ ...defaultWallRequirements, displayCustom: true, displayWidth: 2560, displayHeight: 1600 });
    expect(custom.find((answer) => answer.key === "size")?.value).toContain("2560 × 1600 panels");
  });

  it("maps every answer to a question step so the result can be edited", () => {
    const answers = wallWizardAnswers(defaultWallRequirements);
    for (const answer of answers) {
      expect(wallWizardSteps[answer.step].key).toBe(answer.key);
    }
  });

  it("drops layouts that only exist for a different wall type", () => {
    expect(wallWizardLayoutChoices("lcd-direct").map((choice) => choice.value)).toContain("independent");
    expect(wallWizardLayoutChoices("lcd-loop").map((choice) => choice.value)).not.toContain("independent");
    expect(wallWizardLayoutChoices("led").map((choice) => choice.value)).toContain("custom");
    expect(wallWizardLayoutChoices("lcd-direct").map((choice) => choice.value)).not.toContain("custom");
  });

  it("resets the layout when the wall type changes", () => {
    expect(wallWizardApplicationPatch("lcd-loop", { layout: "independent" })).toEqual({ application: "lcd-loop", layout: "single", windows: 1 });
    expect(wallWizardApplicationPatch("lcd-direct", { layout: "custom" })).toEqual({ application: "lcd-direct", layout: "single", windows: 1 });
    expect(wallWizardApplicationPatch("led", { layout: "quad" })).toEqual({ application: "led" });
  });

  it("offers existing/new network speeds and a no-AVoIP choice", () => {
    expect(videowallNetworkChoices.map((choice) => choice.key)).toEqual([
      "existing-1g", "existing-10g", "new-1g", "new-10g", "no-avoip",
    ]);
    expect(videowallNetworkChoices.map((choice) => choice.label)).toEqual([
      "Use an existing 1Gb network",
      "Use an existing 10Gb network",
      "Supply new 1Gb network switches",
      "Supply new 10Gb network switches",
      "Do not use AVoIP",
    ]);
    for (const choice of videowallNetworkChoices) {
      expect(videowallNetworkKeyFor({ ...defaultWallRequirements, ...choice.patch })).toBe(choice.key);
      expect(wallWizardAnswers({ ...defaultWallRequirements, ...choice.patch }).find((answer) => answer.key === "network")?.value)
        .toBe(choice.label);
    }
    // Older saved designs only have the network speed, which meant the site
    // already had that network.
    expect(videowallNetworkKeyFor({ ...defaultWallRequirements, network: "10g" })).toBe("existing-10g");
    expect(videowallNetworkKeyFor({ ...defaultWallRequirements, network: "none" })).toBe("no-avoip");
  });

  it("keeps Expert's source-location answer aligned with Guided network provision", () => {
    expect(videowallLocationKeyFor({ ...defaultWallRequirements, network: "1g", networkProvision: "new" }))
      .toBe("new-one-gig");
    expect(videowallLocationChoices.find((choice) => choice.key === "new-one-gig")?.patch)
      .toMatchObject({ network: "1g", networkProvision: "new", sourceLocation: "distributed" });
    expect(videowallLocationChoices.find((choice) => choice.key === "one-gig")?.patch)
      .toMatchObject({ network: "1g", networkProvision: "existing" });
  });

  it("turns must-haves into ordering checks without inventing products", () => {
    const checks = wallWizardConcernChecks(["hdcp", "portrait"]);
    expect(checks).toHaveLength(2);
    expect(checks.join(" ")).toContain("HDCP");
    expect(checks.join(" ")).toContain("rotation");
    expect(wallWizardConcernChecks([])).toEqual([]);
    expect(wallWizardConcernChecks(["unknown"])).toEqual([]);
  });

  it("reviews the result in three passes, decision first and transport last", () => {
    expect(wallReviewStages.map((stage) => stage.key)).toEqual(["decision", "wall", "transport"]);
    expect(wallReviewStages.map((stage) => stage.label)).toEqual(["The design", "The wall", "Transport and survey"]);
  });

  it("reads the design pass in bands, the picker first and the catalogue last", () => {
    expect(wallDesignBands.map((item) => item.key)).toEqual(["start", "answer", "questions", "options"]);
    // Every band says how it is left; the first is the only one with no return,
    // because the picker is where the pass opens.
    expect(wallDesignBands.every((item) => item.next.length > 0)).toBe(true);
    expect(wallDesignBands[0].back).toBeUndefined();
    expect(wallDesignBands.filter((item) => item.back).length).toBe(wallDesignBands.length - 1);
  });

  it("names what each review pass holds without opening it", () => {
    const statuses = wallReviewStageStatuses({
      selectedTitle: "Two into one wall",
      unblockers: 0,
      wall: "2,436 × 1,370 mm",
      links: 4,
      gaps: 2,
    });
    expect(statuses.decision).toBe("Two into one wall");
    expect(statuses.wall).toBe("2,436 × 1,370 mm");
    expect(statuses.transport).toBe("2 of 4 links need an install cell");
  });

  it("counts a finished survey and an open requirement change", () => {
    const surveyed = wallReviewStageStatuses({ selectedTitle: null, unblockers: 1, wall: "0 × 0 mm", links: 3, gaps: 0 });
    expect(surveyed.decision).toBe("1 requirement change opens the field");
    expect(surveyed.transport).toBe("All 3 links surveyed");
    expect(wallReviewStageStatuses({ selectedTitle: null, unblockers: 2, wall: "", links: 0, gaps: 0 }))
      .toEqual({ decision: "2 requirement changes open the field", wall: "", transport: "No cable links in this design" });
  });

  it("carries the portrait answer into the requirements", () => {
    const portrait = wallWizardConcerns.find((concern) => concern.key === "portrait")!;
    expect(portrait.patch).toEqual({ orientation: "portrait" });
    expect(portrait.clear).toEqual({ orientation: "landscape" });
  });
});
