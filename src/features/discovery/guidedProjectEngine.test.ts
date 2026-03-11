import { describe, expect, it } from "vitest";

import {
  buildGuidedProjectAdvice,
  createEmptyGuidedProjectRecord,
  getVisibleQuestionsForStep,
  needsNetworkDetail,
} from "@/features/discovery/guidedProjectEngine";

describe("guidedProjectEngine", () => {
  it("opens network questioning when transport hints point to AVoIP or decoder delivery", () => {
    const record = {
      ...createEmptyGuidedProjectRecord(),
      displayCount: "4",
      cableDistanceM: "80",
      sourceConnectionType: "AVoIP or network encoder",
      displayConnectionType: "AVoIP decoder",
    };

    expect(needsNetworkDetail(record)).toBe(true);
    const physicalDynamicsQuestions = getVisibleQuestionsForStep(record, 2);
    expect(physicalDynamicsQuestions.some((question) => question.id === "networkEnvironment")).toBe(true);
  });

  it("opens capability questioning once transport cues exist", () => {
    const record = {
      ...createEmptyGuidedProjectRecord(),
      sourceCount: "2",
      displayCount: "1",
      cableDistanceM: "35",
      sourceConnectionType: "HDBaseT handoff",
    };

    const physicalDynamicsQuestions = getVisibleQuestionsForStep(record, 2);
    expect(physicalDynamicsQuestions.some((question) => question.id === "signalFormats")).toBe(true);
    expect(physicalDynamicsQuestions.some((question) => question.id === "signalHdr")).toBe(false);
  });

  it("keeps HDBaseT credible when the signal envelope fits the reach and cable grade", () => {
    const record = {
      ...createEmptyGuidedProjectRecord(),
      applicationType: "Boardroom",
      displayCount: "1",
      sourceCount: "2",
      cableDistanceM: "32",
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
    expect(advice.families).toContain("HDBaseT");
    expect(advice.reasons.join(" ")).toMatch(/hdbaset/i);
  });

  it("promotes AVoIP when the room has distributed transport cues", () => {
    const record = {
      ...createEmptyGuidedProjectRecord(),
      applicationType: "Training Room",
      displayCount: "2",
      sourceCount: "6",
      transportDistanceBand: "100m",
      sourcePlacement: "Mixed local and central",
      sourceConnectionPath: "Via network drop",
      sourceConnectionType: "AVoIP or network encoder",
      displayConnectionPath: "Via receiver or decoder",
      displayConnectionType: "AVoIP decoder",
      networkEnvironment: "Dedicated AV LAN or VLAN",
      cableDistanceM: "75",
      signalFormats: "4K 60 | 8K",
      signalHdr: "Dolby Vision or advanced HDR",
      usbNeeds: "Webcam, microphone, or UC soundbar",
      usbStandards: "USB 3.0",
      sourceCableType: "Cat5e",
      displayCableType: "Cat5e",
    };

    const advice = buildGuidedProjectAdvice(record);
    expect(advice.primary).toBe("AVoIP");
    expect(advice.families).toContain("AVoIP");
    expect(advice.reasons.join(" ")).toMatch(/network/i);
  });
});
