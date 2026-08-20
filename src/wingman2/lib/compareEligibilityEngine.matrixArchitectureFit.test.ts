import { describe, expect, it } from "vitest";
import { evaluateProductEligibility } from "./compareEligibilityEngine";

function matrixFit(competitorText: string, sku: string, productText: string) {
  return evaluateProductEligibility({
    intent: "matrix",
    competitorText,
    match: { sku, name: productText },
  });
}

describe("matrix architecture fit", () => {
  it("prefers a local HDMI matrix over an equal-size HDBaseT receiver kit", () => {
    const requirement = "4K HDR 4x4 matrix switcher for HDMI signals with 4 HDMI inputs and 4 HDMI outputs";
    const hdmi = matrixFit(requirement, "MX-0404-HDMI", "4x4 HDMI matrix with four routed HDMI outputs");
    const hdbtKit = matrixFit(requirement, "MX-0404-KIT", "4x4 HDBaseT / HDMI matrix kit with receivers");
    const scaling = matrixFit(requirement, "MX-0404-SCL", "4x4 seamless scaling HDMI matrix");

    expect(hdmi.eligibility).toBe("direct");
    expect(hdmi.fitPenalty).toBeLessThan(hdbtKit.fitPenalty);
    expect(hdmi.fitPenalty).toBeLessThan(scaling.fitPenalty);
  });

  it("prefers HDBaseT architecture when remote receiver transport is required", () => {
    const requirement = "4x4 HDBaseT matrix kit for CAT6 distribution with receivers";
    const hdmi = matrixFit(requirement, "MX-0404-HDMI", "4x4 local HDMI matrix with HDMI outputs");
    const hdbtKit = matrixFit(requirement, "MX-0404-KIT", "4x4 HDBaseT matrix kit with receivers");

    expect(hdbtKit.eligibility).toBe("direct");
    expect(hdbtKit.fitPenalty).toBeLessThan(hdmi.fitPenalty);
  });
});
