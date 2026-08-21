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

  it("blocks a same-family presentation switcher that is below confirmed routed capacity", () => {
    const result = evaluateProductEligibility({
      intent: "presentation-switcher",
      competitorText: "11x2 routed matrix presentation switcher",
      match: {
        sku: "SW-510-TX",
        name: "4-input presentation switcher",
        inputCount: 4,
        outputCount: 2,
      },
      product: {
        sku: "SW-510-TX",
        name: "4-input presentation switcher",
        inputCount: 4,
        outputCount: 2,
      },
    });

    expect(result.eligibility).toBe("blocked");
    expect(result.blockers.join(" ")).toMatch(/undersized|routed I\/O/i);
  });
});

describe("HDBaseT extender class eligibility", () => {
  const competitorText = "HEX18G-KIT uncompressed 18Gbps HDBaseT 3.0 extender kit 100m 4K60 4:4:4";

  it("rejects a generic earlier-generation extender for an HDBaseT 3.0 requirement", () => {
    const result = evaluateProductEligibility({
      intent: "extender",
      competitorText,
      match: { sku: "EX-70-H2", name: "70m Class A HDBaseT extender" },
      product: { sku: "EX-70-H2", name: "70m Class A HDBaseT extender" },
    });

    expect(result.eligibility).not.toBe("direct");
    expect([...result.reasons, ...result.blockers].join(" ")).toMatch(/HDBaseT 3\.0|generation/i);
  });

  it("accepts a capacity-equivalent HDBaseT 3.0 extender", () => {
    const result = evaluateProductEligibility({
      intent: "extender",
      competitorText,
      match: { sku: "EX3-100-EARC", name: "100m uncompressed 18Gbps HDBaseT 3.0 4K60 4:4:4 extender" },
      product: { sku: "EX3-100-EARC", name: "100m uncompressed 18Gbps HDBaseT 3.0 4K60 4:4:4 extender" },
    });

    expect(result.eligibility).toBe("direct");
  });
});
