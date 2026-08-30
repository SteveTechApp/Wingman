import { describe, expect, it } from "vitest";
import { buildDiscoveryBriefFromState } from "./workflowHandoff";

function meta(overrides: Record<string, unknown> = {}) {
  return {
    designDirection: "Presentation switcher, UC/BYOD workflow",
    confidence: "medium",
    missingItems: [] as string[],
    capturedPercent: 40,
    ...overrides,
  };
}

describe("buildDiscoveryBriefFromState integrity engine", () => {
  it("produces underspecified issues for required discovery questions missing from a partial legacy state", () => {
    const brief = buildDiscoveryBriefFromState(
      {
        outcome: "Meeting room with Teams",
        devices: ["Laptop HDMI", "Room PC"],
        displayCount: "2 displays",
      },
      meta(),
    );

    // The integrity engine should have flagged required questions that the
    // legacy state does not cover (signal-standard, uc-purpose, audio, control, etc.)
    const missingInfo = brief.missingInformation ?? [];
    const hasIntegrityIssues = missingInfo.some((item) =>
      /signal.standard|uc.purpose|audio|control|locations|display.behaviour/i.test(item),
    );
    expect(hasIntegrityIssues).toBe(true);

    // quoteSafetyStatus should be do-not-quote-yet because the integrity
    // engine found underspecified required questions
    expect(brief.quoteSafetyStatus).toBe("do-not-quote-yet");
  });

  it("merges meta.missingItems with integrity engine follow-up questions", () => {
    const brief = buildDiscoveryBriefFromState(
      {
        outcome: "Boardroom",
        devices: ["HDMI laptop"],
      },
      meta({ missingItems: ["Confirm final product quantities"] }),
    );

    const missingInfo = brief.missingInformation ?? [];
    // The caller's missing item should be present
    expect(missingInfo).toContain("Confirm final product quantities");
    // The integrity engine should also contribute follow-up questions
    expect(missingInfo.length).toBeGreaterThan(1);
  });

  it("sets canProceedToRecommendation false via quoteSafetyStatus when questions are unanswered", () => {
    const brief = buildDiscoveryBriefFromState(
      {
        outcome: "Hospitality bar",
        devices: ["Sky box", "Signage player"],
        displayCount: "6 displays",
        displayBehaviour: "Different content per display",
        cableRun: "35 metres",
        controlNeeds: ["IR"],
        network: "Managed switch",
      },
      meta(),
    );

    // Even though many room model fields are populated, the integrity engine
    // should still flag unanswered required questions (signal-standard, uc-purpose, etc.)
    expect(brief.quoteSafetyStatus).toBe("do-not-quote-yet");

    // The roomModel should also carry the merged missing information
    const roomModel = brief.roomModel as Record<string, unknown>;
    const roomMissing = roomModel.missingInformation as string[];
    expect(roomMissing.length).toBeGreaterThan(0);
  });

  it("includes decisionEvidence built from room model fields", () => {
    const brief = buildDiscoveryBriefFromState(
      {
        outcome: "Classroom",
        devices: ["Lectern PC", "Visualiser"],
        displayCount: "1 display",
        displayBehaviour: "Same content on all displays",
      },
      meta(),
    );

    const roomModel = brief.roomModel as Record<string, unknown>;
    const evidence = roomModel.decisionEvidence as Array<{
      field: string;
      state: string;
    }>;

    expect(Array.isArray(evidence)).toBe(true);
    expect(evidence.length).toBeGreaterThan(0);

    // applicationType should be confirmed because outcome is provided
    const applicationEvidence = evidence.find((e) => e.field === "application");
    expect(applicationEvidence?.state).toBe("confirmed");

    // display-count should be confirmed because displayCount is provided
    const displayEvidence = evidence.find((e) => e.field === "display-count");
    expect(displayEvidence?.state).toBe("confirmed");
  });

  it("includes decisionIntegrity summary on roomModel", () => {
    const brief = buildDiscoveryBriefFromState(
      {
        outcome: "Meeting room",
        devices: ["Laptop"],
        displayCount: "1 display",
      },
      meta(),
    );

    const roomModel = brief.roomModel as Record<string, unknown>;
    const integrity = roomModel.decisionIntegrity as {
      status: string;
      unknownCount: number;
      canQuote: boolean;
    };

    expect(integrity).toBeDefined();
    expect(typeof integrity.status).toBe("string");
    expect(typeof integrity.unknownCount).toBe("number");
    expect(typeof integrity.canQuote).toBe("boolean");
  });

  it("uses meta.missingItems as the fallback when the integrity engine has no issues", () => {
    // Provide a nearly-complete state so the integrity engine produces few/no issues
    const brief = buildDiscoveryBriefFromState(
      {
        outcome: "Meeting room",
        roomType: "Single small room",
        devices: ["Laptop HDMI"],
        technicalTags: ["HDMI"],
        displayCount: "1 display",
        displayBehaviour: "Same content on all displays",
        cableRun: "3 metres",
        controlNeeds: ["Simple / automatic"],
        network: "Existing LAN",
      },
      meta({ missingItems: ["Confirm installation date"] }),
    );

    const missingInfo = brief.missingInformation ?? [];
    // The caller's item should still be present
    expect(missingInfo).toContain("Confirm installation date");
  });

  it("produces a valid brief with inference and recommendationEvidence", () => {
    const brief = buildDiscoveryBriefFromState(
      {
        outcome: "AVoIP campus distribution",
        devices: ["5 sources"],
        displayCount: "20 displays",
      },
      meta({ designDirection: "NetworkHD distribution" }),
    );

    expect(brief.savedAt).toBeDefined();
    expect(brief.capturedPercent).toBe(40);
    expect(brief.inference).toBeDefined();
    expect(brief.inference?.architecture).toBe("NetworkHD distribution");
    expect(brief.recommendationEvidence).toBeDefined();
  });

  it("treats 'Unknown' values in state as present answers for the integrity engine", () => {
    const brief = buildDiscoveryBriefFromState(
      {
        outcome: "Meeting room",
        devices: ["Laptop"],
        displayCount: "Unknown",
        displayBehaviour: "Not confirmed",
        cableRun: "Unknown",
      },
      meta(),
    );

    // 'Unknown' and 'Not confirmed' are non-empty text, so the integrity engine
    // sees them as answered (not flagged as underspecified via the answer text).
    // However the engine still flags questions not present in the mapped answers
    // (e.g. signal-standard, uc-purpose, audio, control, locations-connections).
    const missingInfo = brief.missingInformation ?? [];
    expect(missingInfo.length).toBeGreaterThan(0);
  });

  it("selects video-wall application and hides UC questions from integrity engine", () => {
    const brief = buildDiscoveryBriefFromState(
      {
        outcome: "Video wall for reception",
        devices: ["Signage player"],
        displayCount: "4 displays",
        displayBehaviour: "Video wall layout",
        cableRun: "10 metres",
        controlNeeds: ["Touch panel"],
      },
      meta(),
    );

    // Video-wall route hides UC questions, so fewer underspecified issues than a
    // meeting-room route with the same number of mapped fields.
    const meetingBrief = buildDiscoveryBriefFromState(
      {
        outcome: "Meeting room",
        devices: ["Signage player"],
        displayCount: "4 displays",
        displayBehaviour: "Video wall layout",
        cableRun: "10 metres",
        controlNeeds: ["Touch panel"],
      },
      meta(),
    );

    const videoWallMissing = (brief.missingInformation ?? []).length;
    const meetingMissing = (meetingBrief.missingInformation ?? []).length;
    expect(videoWallMissing).toBeLessThanOrEqual(meetingMissing);
  });

  it("preserves meta.missingItems even when integrity engine has no issues", () => {
    // Provide enough state to satisfy most required questions
    const brief = buildDiscoveryBriefFromState(
      {
        outcome: "Meeting room",
        roomType: "Single small room",
        devices: ["Laptop HDMI"],
        technicalTags: ["HDMI"],
        displayCount: "1 display",
        displayBehaviour: "Same content on all displays",
        cableRun: "3 metres",
        controlNeeds: ["Simple / automatic"],
        network: "Existing LAN",
      },
      meta({ missingItems: ["Confirm installation date", "Check power availability"] }),
    );

    const missingInfo = brief.missingInformation ?? [];
    expect(missingInfo).toContain("Confirm installation date");
    expect(missingInfo).toContain("Check power availability");
  });

  it("returns an empty brief shape when state is completely empty", () => {
    const brief = buildDiscoveryBriefFromState({}, meta({ capturedPercent: 0 }));

    expect(brief.savedAt).toBeDefined();
    expect(brief.capturedPercent).toBe(0);
    expect(brief.roomModel).toBeDefined();
    expect(brief.missingInformation).toBeDefined();
    // The integrity engine should flag many required questions as underspecified
    expect((brief.missingInformation ?? []).length).toBeGreaterThan(0);
  });

  it("includes NDI cameras in source count while filtering plain microphones", () => {
    const briefWithNdi = buildDiscoveryBriefFromState(
      {
        outcome: "Meeting room",
        devices: ["Laptop HDMI", "NDI PTZ camera", "Ceiling microphone"],
      },
      meta(),
    );
    const briefWithoutNdi = buildDiscoveryBriefFromState(
      {
        outcome: "Meeting room",
        devices: ["Laptop HDMI", "Ceiling microphone"],
      },
      meta(),
    );

    const ndiSourceCount = (briefWithNdi.roomModel as Record<string, unknown>).sourceCount as string;
    const plainSourceCount = (briefWithoutNdi.roomModel as Record<string, unknown>).sourceCount as string;
    // NDI camera is kept (ndi matches exclusion), plain mic is filtered
    expect(ndiSourceCount).not.toBe(plainSourceCount);
  });
});
