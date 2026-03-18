import { describe, expect, it } from "vitest";

import {
  buildGuidedProjectAdvice,
  createEmptyGuidedProjectRecord,
  getVisibleQuestionsForStep,
  needsNetworkDetail,
} from "@/features/discovery/guidedProjectEngine";
import { WM_ROUTES } from "@/core/wingman/routeMap";

describe("guidedProjectEngine", () => {
  it("shows network detail for a distribute-over-network workflow", () => {
    const record = {
      ...createEmptyGuidedProjectRecord(),
      workflowTrack: "Distribute over network",
      projectScope: "Part of a wider room workflow",
      sourceCount: "2",
      displayCount: "4",
    };

    expect(needsNetworkDetail(record)).toBe(true);
    const fitQuestions = getVisibleQuestionsForStep(record, 1);
    expect(fitQuestions.some((question) => question.id === "networkEnvironment")).toBe(true);
  });

  it("biases an extension workflow toward HDBaseT and an extender category", () => {
    const record = {
      ...createEmptyGuidedProjectRecord(),
      workflowTrack: "Extend a signal",
      projectScope: "Single device or signal path",
      sourceCount: "1",
      displayCount: "1",
      outputBehaviour: "One destination only",
      cableDistanceM: "35",
      transportDistanceBand: "<40m",
      sourcePlacement: "Local rack or credenza",
      sourceConnectionPath: "Via local rack",
      sourceConnectionType: "HDBaseT handoff",
      signalFormats: "4K 60",
      signalHdr: "HDR10 or HLG",
      sourceCableType: "Cat6A",
      displayConnectionPath: "Via receiver or decoder",
      displayConnectionType: "HDBaseT receiver",
      displayCableType: "Cat6A",
      usbNeeds: "Webcam, microphone, or UC soundbar",
      usbStandards: "USB 2.0",
    };

    const advice = buildGuidedProjectAdvice(record);
    expect(advice.primary).toBe("HDBaseT");
    expect(advice.focusCategory).toMatch(/extender/i);
    expect(advice.families).toContain("HDBaseT");
  });

  it("keeps duplicate workflows in distribution language before assuming a matrix", () => {
    const record = {
      ...createEmptyGuidedProjectRecord(),
      workflowTrack: "Duplicate a signal",
      projectScope: "Single device or signal path",
      sourceCount: "1",
      displayCount: "2",
      outputBehaviour: "Same content everywhere",
      cableDistanceM: "8",
      signalFormats: "4K 60",
    };

    const advice = buildGuidedProjectAdvice(record);
    expect(advice.focusCategory).toMatch(/splitter|distribution/i);
    expect(advice.nextToolPath).toBe(WM_ROUTES.catalogue);
  });

  it("shows duplicate-specific HDMI delivery options and lengths", () => {
    const base = {
      ...createEmptyGuidedProjectRecord(),
      workflowTrack: "Duplicate a signal",
      displayCount: "2",
    };

    const fitQuestions = getVisibleQuestionsForStep(base, 1);
    const cableTypeQuestion = fitQuestions.find((question) => question.id === "transportCableType");
    const lengthQuestion = fitQuestions.find((question) => question.id === "transportDistanceBand");
    const featureQuestion = fitQuestions.find((question) => question.id === "featureRequirements");

    expect(cableTypeQuestion?.options).toEqual(
      expect.arrayContaining(["HDMI copper lead", "HAOC optical HDMI lead", "Add HDMI extender line item"]),
    );
    expect(lengthQuestion?.options).toEqual(
      expect.arrayContaining(["0.5m", "1m", "2m", "3m", "5m", "10m"]),
    );
    expect(lengthQuestion?.options).not.toContain("Up to 70m");
    expect(featureQuestion?.options).toEqual(
      expect.arrayContaining(["18Gb HDMI cable capability", "ALLM support", "eARC support", "Multichannel audio support"]),
    );

    const haocQuestions = getVisibleQuestionsForStep(
      {
        ...base,
        transportCableType: "HAOC optical HDMI lead",
      },
      1,
    );
    const haocLengthQuestion = haocQuestions.find((question) => question.id === "transportDistanceBand");
    expect(haocLengthQuestion?.options).toEqual(expect.arrayContaining(["10m", "15m", "20m", "30m"]));
    expect(haocLengthQuestion?.options).not.toContain("2m");
  });

  it("promotes switching workflows toward presentation or matrix switching", () => {
    const record = {
      ...createEmptyGuidedProjectRecord(),
      workflowTrack: "Switch between devices",
      projectScope: "Part of a wider room workflow",
      sourceCount: "4",
      displayCount: "2",
      outputBehaviour: "Independent switching per display",
      sourceTypes: "Laptops, PC, signage player",
      signalFormats: "4K 60",
      usbNeeds: "USB-C BYOD docking",
    };

    const advice = buildGuidedProjectAdvice(record);
    expect(advice.focusCategory).toMatch(/switch/i);
    expect(advice.families.some((family) => family === "Matrix" || family === "Apollo")).toBe(true);
  });

  it("does not require room-envelope questions for a single-device scope", () => {
    const record = {
      ...createEmptyGuidedProjectRecord(),
      workflowTrack: "Extend a signal",
      projectScope: "Single device or signal path",
      sourceCount: "1",
      displayCount: "1",
    };

    const coreFitQuestions = getVisibleQuestionsForStep(record, 1);
    expect(coreFitQuestions.some((question) => question.id === "roomLengthM")).toBe(false);
    expect(coreFitQuestions.some((question) => question.id === "roomWidthM")).toBe(false);
    expect(coreFitQuestions.some((question) => question.id === "roomHeightM")).toBe(false);
  });

  it("shows extender-specific fit prompts instead of the old generic feature checklist", () => {
    const record = {
      ...createEmptyGuidedProjectRecord(),
      workflowTrack: "Extend a signal",
    };

    const coreFitQuestions = getVisibleQuestionsForStep(record, 1);
    expect(coreFitQuestions.some((question) => question.id === "featureRequirements")).toBe(false);
    expect(coreFitQuestions.some((question) => question.id === "usbStandards")).toBe(true);
    expect(coreFitQuestions.some((question) => question.id === "audioBreakout")).toBe(true);
  });

  it("keeps extender usb and audio detail in the fit step", () => {
    const record = {
      ...createEmptyGuidedProjectRecord(),
      workflowTrack: "Extend a signal",
    };

    const fitQuestions = getVisibleQuestionsForStep(record, 1);
    const criticalChecksQuestions = getVisibleQuestionsForStep(record, 3);
    expect(fitQuestions.some((question) => question.id === "usbStandards")).toBe(true);
    expect(fitQuestions.some((question) => question.id === "audioBreakout")).toBe(true);
    expect(criticalChecksQuestions.some((question) => question.id === "usbStandards")).toBe(false);
    expect(criticalChecksQuestions.some((question) => question.id === "audioBreakout")).toBe(false);
  });
});
