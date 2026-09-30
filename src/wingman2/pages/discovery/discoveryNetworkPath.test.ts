import { describe, expect, it } from "vitest";
import { getVisibleDiscoveryQuestions } from "./discoveryQuestions";
import { BASIC_MODE_REQUIRED_IDS, SMART_DEFAULTS } from "./discoveryProgressiveDisclosure";

describe("distributed AV network discovery", () => {
  it("does not ask a local single-room project to choose a network", () => {
    expect(getVisibleDiscoveryQuestions("meeting-room", { scale: "single-small-room" }).some((step) => step.id === "network-path")).toBe(false);
  });

  it("asks in Essential mode for multi-room or AV-over-IP projects without preselecting a path", () => {
    expect(Object.values(SMART_DEFAULTS).every((defaults) => defaults["network-path"] === undefined)).toBe(true);
    for (const [application, scale] of [["meeting-room", "building-wide"], ["av-over-ip", "single-large-room"]]) {
      const questions = getVisibleDiscoveryQuestions(application, { scale }).filter((step) => BASIC_MODE_REQUIRED_IDS.includes(step.id as typeof BASIC_MODE_REQUIRED_IDS[number]));
      const network = questions.find((step) => step.id === "network-path");
      expect(network?.options.map((option) => option.value)).toEqual([
        "corporate-av-vlan", "dedicated-av-lan", "unknown-network-path", "no-network-distribution",
      ]);
    }
  });
});
