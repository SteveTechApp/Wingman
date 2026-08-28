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

  it("ranks the pure HDMI MX-0808-H2A-MK2 above the HDBaseT MXV-0808-H2A-70-V3 for a local HDMI matrix competitor", () => {
    // Lightware MMX8X8-HDMI-4K-A is an 8x8 pure-HDMI matrix. The MX-0808-H2A-MK2
    // is WyreStorm's equivalent pure-HDMI matrix; MXV-0808-H2A-70-V3 is HDBaseT.
    // The H2A in the SKU must NOT falsely flag MX-0808-H2A-MK2 as HDBaseT.
    const requirement = "Lightware MMX8X8-HDMI-4K-A 8x8 HDMI matrix switcher 8x HDMI inputs 8x HDMI outputs 4K60";
    const pureHdmi = matrixFit(
      requirement,
      "MX-0808-H2A-MK2",
      "8x8 HDMI matrix switcher with audio de-embedding",
    );
    const hdbaseT = matrixFit(
      requirement,
      "MXV-0808-H2A-70-V3",
      "8x8 HDBaseT matrix with 70m reach",
    );

    expect(pureHdmi.eligibility).toBe("direct");
    expect(hdbaseT.eligibility).toBe("direct");
    // Pure HDMI candidate must rank above HDBaseT for a local-HDMI competitor.
    expect(pureHdmi.fitPenalty).toBeLessThan(hdbaseT.fitPenalty);
  });
});
