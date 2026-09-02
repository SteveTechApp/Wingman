import { describe, expect, it } from "vitest";
import {
  findQuickStartApplicationDrift,
  getQuickStartDisagreements,
  mergeRoomAndStandardProfiles,
  plainLanguageLabels,
  quickStartConfigs,
} from "./discoveryQuickStart";
import { SMART_DEFAULTS } from "./discoveryProgressiveDisclosure";
import type { DiscoveryAnswers } from "./discoveryTypes";

const lectureHallSeed = {
  application: "classroom",
  answers: { opportunity: "classroom", ...quickStartConfigs["lecture-hall"].defaults } as DiscoveryAnswers,
};

const meetingRoomStandardSeed = {
  application: "meeting-room",
  answers: { opportunity: "meeting-room", ...SMART_DEFAULTS["meeting-room"] } as DiscoveryAnswers,
};

describe("findQuickStartApplicationDrift", () => {
  it("returns nothing while the application is unchanged", () => {
    expect(findQuickStartApplicationDrift(lectureHallSeed, lectureHallSeed.answers, "classroom")).toEqual([]);
    expect(findQuickStartApplicationDrift(null, {}, "classroom")).toEqual([]);
  });

  it("flags untouched quick-start answers that disagree with the new application profile", () => {
    const drift = findQuickStartApplicationDrift(lectureHallSeed, lectureHallSeed.answers, "meeting-room");
    const questionIds = drift.map((item) => item.questionId).sort();
    // Lecture hall seeds two displays with independent routing, more sources,
    // premium signal and room-PC USB — all disagree with the meeting-room
    // standard profile; scale/audio etc. agree and stay unflagged.
    expect(questionIds).toEqual(["display-behaviour", "displays", "signal-standard", "sources", "usb"]);
    expect(drift.every((item) => item.reason === "differs-from-new-standard")).toBe(true);

    const displays = drift.find((item) => item.questionId === "displays")!;
    expect(displays.standardText).toBe("1 display / output");
    expect(displays.roomText).not.toBe(displays.standardText);
    expect(displays.questionLabel).toContain("Display");
  });

  it("ignores answers the rep edited after seeding — only old-profile defaults are flagged", () => {
    const edited = { ...lectureHallSeed.answers, displays: "three-four-displays" };
    const drift = findQuickStartApplicationDrift(lectureHallSeed, edited, "meeting-room");
    expect(drift.some((item) => item.questionId === "displays")).toBe(false);
    // The untouched ones are still flagged.
    expect(drift.map((item) => item.questionId)).toContain("usb");
  });

  it("flags a seeded default the new application no longer defines as no-longer-in-profile", () => {
    // Meeting-room standard seeds uc-purpose; the classroom standard has no UC
    // section at all — switching the seeded answers to classroom leaves that
    // answer carrying the previous application's default.
    const drift = findQuickStartApplicationDrift(meetingRoomStandardSeed, meetingRoomStandardSeed.answers, "classroom");
    const ucPurpose = drift.find((item) => item.questionId === "uc-purpose")!;
    expect(ucPurpose).toBeTruthy();
    expect(ucPurpose.reason).toBe("no-longer-in-profile");
    expect(ucPurpose.standardText).toBe("Not part of the new application profile");
    // Differing defaults are still reported as plain disagreements.
    expect(drift.map((item) => item.questionId).sort()).toEqual([
      "control",
      "signal-standard",
      "uc-camera",
      "uc-purpose",
      "usb",
    ]);
  });

  it("resolves both application labels through plainLanguageLabels", () => {
    const drift = findQuickStartApplicationDrift(lectureHallSeed, lectureHallSeed.answers, "meeting-room");
    expect(drift.length).toBeGreaterThan(0);
    expect(plainLanguageLabels["classroom"]).toBeTruthy();
    expect(plainLanguageLabels["meeting-room"]).toBeTruthy();
  });
});

describe("mergeRoomAndStandardProfiles", () => {
  it("takes the standard default on every disagreement and the room default elsewhere", () => {
    const merged = mergeRoomAndStandardProfiles("lecture-hall");
    const standard = SMART_DEFAULTS["classroom"];
    const disagreements = getQuickStartDisagreements("lecture-hall").map((item) => item.questionId);

    expect(merged.opportunity).toBe("classroom");
    // Every point of disagreement resolves to the standard default.
    for (const questionId of disagreements) {
      expect(merged[questionId], questionId).toEqual(standard[questionId as keyof DiscoveryAnswers]);
    }
    expect(merged.displays).toBe("one-display");
    expect(merged["signal-standard"]).toBe("1080p-standard-hdmi");
    expect(merged.usb).toBe("room-pc-uc");
    expect(merged["display-behaviour"]).toBe("same-content-all-displays");
    // Values the profiles agree on stay at the (shared) room value.
    expect(merged.scale).toBe(quickStartConfigs["lecture-hall"].defaults.scale);
    expect(merged.scale).toBe(standard.scale);
  });

  it("leaves no residual disagreement with the standard profile", () => {
    for (const roomType of Object.keys(quickStartConfigs) as Array<keyof typeof quickStartConfigs>) {
      const merged = mergeRoomAndStandardProfiles(roomType);
      const standard = SMART_DEFAULTS[quickStartConfigs[roomType].suggestedApplication];
      if (!standard) continue;
      const normalize = (value: string | string[] | undefined) =>
        Array.isArray(value) ? JSON.stringify([...value].sort()) : String(value ?? "");
      for (const [questionId, standardValue] of Object.entries(standard)) {
        expect(
          normalize(merged[questionId as keyof DiscoveryAnswers]) === normalize(standardValue as string | string[]),
          `${roomType} blend leaves disagreement on ${questionId}`,
        ).toBe(true);
      }
      // Room-only defaults the standard is silent on are preserved.
      for (const [questionId, roomValue] of Object.entries(quickStartConfigs[roomType].defaults)) {
        if (standard[questionId as keyof DiscoveryAnswers] !== undefined) continue;
        expect(
          normalize(merged[questionId as keyof DiscoveryAnswers]) === normalize(roomValue as string | string[]),
          `${roomType} blend dropped room-only default ${questionId}`,
        ).toBe(true);
      }
    }
  });
});