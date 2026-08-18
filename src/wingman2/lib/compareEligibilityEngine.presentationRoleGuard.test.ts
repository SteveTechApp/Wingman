import { describe, expect, it } from "vitest";
import { evaluateProductEligibility } from "./compareEligibilityEngine";

describe("Compare presentation-switcher role isolation", () => {
  const apoVideoBar = {
    sku: "APO-VX20-UC-V2",
    name: "Video Bar for Conference Rooms: Advanced Meeting Solution",
    family: "Unified Communications",
    category: "USB conferencing",
    role: "PTZ Camera",
    productClass: "USB conferencing",
    description: "All-in-one conferencing video bar with integrated camera",
  };

  it("blocks UC video-bar / camera hardware from a presentation-switcher lead", () => {
    const result = evaluateProductEligibility({
      intent: "presentation-switcher",
      competitorText: "Crestron HD-PS622 presentation switcher with 6 HDMI inputs and 2 HDMI outputs",
      match: apoVideoBar,
      product: apoVideoBar,
    });

    expect(result.eligibility).toBe("blocked");
    expect(result.blockers.join(" ")).toMatch(/product class|role mismatch|different primary product class/i);
  });

  it("blocks the same UC/camera hardware from matrix lead ranking", () => {
    const result = evaluateProductEligibility({
      intent: "matrix",
      competitorText: "8x2 HDMI routed matrix",
      match: apoVideoBar,
      product: apoVideoBar,
    });

    expect(result.eligibility).toBe("blocked");
  });
});