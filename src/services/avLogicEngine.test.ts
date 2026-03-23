import { describe, expect, it } from "vitest";

import { buildAvSignalProfile } from "@/services/avLogicEngine";

describe("av logic engine transport inference", () => {
  it("prefers the explicit catalog transport over family text cues", () => {
    const profile = buildAvSignalProfile({
      sku: "EXP-SP-0102-8K",
      family: "USB Extension",
      category: "Distribution",
      subcategory: "Splitter",
      summary: "8K60Hz 4:4:4 1x2 HDMI Splitter",
      transport: "Local",
      inputs: [{ type: "HDMI", count: 1 }],
      outputs: [{ type: "HDMI", count: 2 }],
      features: ["Audio De-embed", "Down-Scaler"],
    });

    expect(profile.transport).toBe("local");
  });
});
