import { describe, expect, it } from "vitest";
import { resolveRecommendationCheck } from "./recommendationResolution";

describe("recommendation check resolution", () => {
  it.each([
    ["Source count and source connector types", ["sources", "source-connection", "source-device-workflows"]],
    ["Display/output count and display behaviour", ["primary-display", "displays", "repeater-displays", "display-behaviour"]],
    ["Resolution, HDR, HDCP and EDID requirement", ["signal-standard"]],
    ["Audio system designed by others; confirm the audio feed", ["audio", "audio-route", "audio-zones", "audio-programme"]],
    ["Installed cable distance and infrastructure path", ["locations-connections", "network-path"]],
    ["USB host ownership, peripheral location and transport bandwidth", ["uc-purpose", "uc-platform", "usb", "uc-camera", "uc-microphones"]],
    ["Network availability, managed switch suitability and AV VLAN approach", ["network-path", "source-connection", "avoip-profile"]],
    ["Wall layout, source behaviour, canvas/preset needs and processor path", ["video-wall-technology", "video-wall-purpose", "multiview-destination", "multiview-operation", "control"]],
    ["Teaching-room USB capture path, audio path, control ownership and confidence-display behaviour", ["uc-purpose", "uc-platform", "usb", "audio", "audio-route", "display-behaviour", "control"]],
    ["Application type, source count, display count, distance, USB, audio, control and network requirement", ["opportunity", "sources", "primary-display", "displays", "locations-connections", "uc-purpose", "audio", "control", "network-path"]],
  ])("maps %s to its governed Discovery questions", (item, expected) => {
    const result = resolveRecommendationCheck(String(item));
    expect(result.answerInDiscovery).toBe(true);
    expect(result.questionIds).toEqual(expected);
  });

  it("only offers questions that are visible for the current Discovery branch", () => {
    const result = resolveRecommendationCheck(
      "USB host ownership, peripheral location and transport bandwidth",
      new Set(["uc-purpose", "audio"]),
    );
    expect(result.questionIds).toEqual(["uc-purpose"]);
    expect(result.answerInDiscovery).toBe(true);
  });

  it("keeps unknown engineering checks open instead of accepting generic notes", () => {
    const result = resolveRecommendationCheck("Confirm a custom firmware mode with the manufacturer");
    expect(result).toMatchObject({
      category: "Site or technical follow-up",
      questionIds: [],
      answerInDiscovery: false,
    });
  });
});
