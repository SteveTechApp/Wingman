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
    const pathQuestions = getVisibleQuestionsForStep(record, 2);
    expect(pathQuestions.some((question) => question.id === "networkEnvironment")).toBe(true);
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

  it("shows feature checkboxes during ", () => {
    const record = {
      ...createEmptyGuidedProjectRecord(),
      workflowTrack: "Extend a signal",
    };

    const coreFitQuestions = getVisibleQuestionsForStep(record, 1);
    expect(coreFitQuestions.some((question) => question.id === "featureRequirements")).toBe(true);
  });

  it("uses core-fit features to unlock later detail questions", () => {
    const record = {
      ...createEmptyGuidedProjectRecord(),
      workflowTrack: "Extend a signal",
      featureRequirements: "USB support | Audio breakout",
    };

    const criticalChecksQuestions = getVisibleQuestionsForStep(record, 3);
    expect(criticalChecksQuestions.some((question) => question.id === "usbStandards")).toBe(true);
    expect(criticalChecksQuestions.some((question) => question.id === "audioBreakout")).toBe(true);
  });
});
