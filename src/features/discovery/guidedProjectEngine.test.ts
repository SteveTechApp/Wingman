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

  it("promotes AVoIP when the room has distributed transport cues", () => {
    const record = {
      ...createEmptyGuidedProjectRecord(),
      applicationType: "Training Room",
      displayCount: "2",
      sourceCount: "6",
      sourcePlacement: "Mixed local and central",
      sourceConnectionPath: "Via network drop",
      sourceConnectionType: "AVoIP or network encoder",
      displayConnectionPath: "Via receiver or decoder",
      displayConnectionType: "AVoIP decoder",
      networkEnvironment: "Dedicated AV LAN or VLAN",
      cableDistanceM: "75",
    };

    const advice = buildGuidedProjectAdvice(record);
    expect(advice.primary).toBe("AVoIP");
    expect(advice.families).toContain("AVoIP");
    expect(advice.reasons.join(" ")).toMatch(/network/i);
  });
});
