import { beforeEach, describe, expect, it } from "vitest";
import {
  readProjectStore,
  resetProjectStore,
  saveDiscoveryBriefToProject,
  type StoredDiscoveryBrief,
} from "./projectStore";

const briefWithConversation: StoredDiscoveryBrief = {
  savedAt: "2026-08-26T00:00:00.000Z",
  roomModel: { roomType: "Meeting room / boardroom" },
  capturedPercent: 25,
  discoveryConversation: [
    { stepId: "opportunity", question: "What type of opportunity is this?", answer: "Meeting room / boardroom", note: "A boardroom for the exec team.", confirmed: true },
    { stepId: "sources", question: "How many source positions are likely?", answer: "2-4 sources", note: "Two laptops at the table." },
  ],
};

describe("discovery conversation store round-trip", () => {
  beforeEach(() => resetProjectStore());

  it("persists the Q&A trail with the brief and reads it back intact", () => {
    const saved = saveDiscoveryBriefToProject(briefWithConversation);

    const project = readProjectStore().projects.find((item) => item.id === saved.id);
    expect(project?.discoveryBrief?.discoveryConversation).toEqual([
      { stepId: "opportunity", question: "What type of opportunity is this?", answer: "Meeting room / boardroom", note: "A boardroom for the exec team.", confirmed: true },
      { stepId: "sources", question: "How many source positions are likely?", answer: "2-4 sources", note: "Two laptops at the table.", confirmed: false },
    ]);
  });

  it("defaults missing confirmed flags to false so older rows keep loading", () => {
    const legacyBrief: StoredDiscoveryBrief = {
      ...briefWithConversation,
      discoveryConversation: [
        { stepId: "opportunity", question: "What type of opportunity is this?", answer: "Meeting room / boardroom", note: "" },
      ],
    };

    const saved = saveDiscoveryBriefToProject(legacyBrief);
    const project = readProjectStore().projects.find((item) => item.id === saved.id);
    expect(project?.discoveryBrief?.discoveryConversation?.[0].confirmed).toBe(false);
  });

  it("drops empty conversation rows without failing the brief read", () => {
    const withEmptyRow: StoredDiscoveryBrief = {
      ...briefWithConversation,
      discoveryConversation: [
        { stepId: "opportunity", question: "What type of opportunity is this?", answer: "Meeting room / boardroom", note: "A boardroom for the exec team." },
        { stepId: "junk", question: "", answer: "", note: "" },
      ],
    };

    const saved = saveDiscoveryBriefToProject(withEmptyRow);
    const project = readProjectStore().projects.find((item) => item.id === saved.id);
    expect(project?.discoveryBrief?.discoveryConversation).toHaveLength(1);
    expect(project?.discoveryBrief?.discoveryConversation?.[0].stepId).toBe("opportunity");
  });

  it("persists the guided-interview review position and clamps invalid values", () => {
    const withPosition: StoredDiscoveryBrief = {
      ...briefWithConversation,
      reviewPosition: 9,
    };
    const saved = saveDiscoveryBriefToProject(withPosition);
    const project = readProjectStore().projects.find((item) => item.id === saved.id);
    expect(project?.discoveryBrief?.reviewPosition).toBe(9);

    const negative: StoredDiscoveryBrief = {
      ...briefWithConversation,
      reviewPosition: -3,
    };
    const savedNegative = saveDiscoveryBriefToProject(negative);
    const negativeProject = readProjectStore().projects.find((item) => item.id === savedNegative.id);
    expect(negativeProject?.discoveryBrief?.reviewPosition).toBe(0);
  });
});
