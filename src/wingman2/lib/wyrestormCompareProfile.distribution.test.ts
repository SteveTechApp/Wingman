import { describe, expect, it } from "vitest";
import { buildWyrestormCompareProfile } from "./wyrestormCompareProfile";

describe("WyreStorm distribution-amplifier compare profile", () => {
  it("counts mirrored HDMI outputs as functional splitter fan-out", () => {
    const profile = buildWyrestormCompareProfile({
      sku: "SP-0104-H2",
      name: "4K HDMI Splitter",
      family: "HDMI Distribution",
      productClass: "HDMI splitter",
      role: "Distribution amplifier",
      transport: "HDMI distribution",
      tags: ["splitter", "hdmi", "4k60"],
      technicalProfile: {
        io: {
          video: [
            {
              connector: "HDMI",
              direction: "input",
              category: "video",
              count: 1,
              detail: "HDMI input",
            },
            {
              connector: "HDMI",
              direction: "output",
              category: "video",
              count: 4,
              detail: "4 mirrored HDMI outputs",
            },
          ],
        },
      },
    } as any);

    expect(profile.domain).toBe("DISTRIBUTION");
    expect(profile.role).toBe("distribution amplifier");
    expect(profile.inputCount).toBe(1);
    expect(profile.outputCount).toBe(4);
    expect(profile.specs?.hdmiInputs).toBe(1);
    expect(profile.specs?.hdmiOutputs).toBe(4);
    expect(profile.specs?.hdmiLoopOutputs).toBeUndefined();
  });

  it("recovers 1x4 fan-out from an SP-0104 SKU even when the title omits 1x4", () => {
    const profile = buildWyrestormCompareProfile({
      sku: "SP-0104-H2",
      name: "4K HDMI Splitter - High-Quality HDMI Signal Distribution",
      family: "HDMI Distribution",
      productClass: "HDMI splitter",
      role: "Distribution amplifier",
      transport: "HDMI distribution",
      tags: ["splitter", "hdmi", "4k60"],
    } as any);

    expect(profile.domain).toBe("DISTRIBUTION");
    expect(profile.inputCount).toBe(1);
    expect(profile.outputCount).toBe(4);
    expect(profile.specs?.hdmiOutputs).toBe(4);
  });
});
