import { describe, expect, it } from "vitest";
import { assessMatrixVariantFit } from "./matrixVariantFit";

const simple = {
  sku: "MX-0404-HDMI",
  name: "4x4 HDMI Matrix",
  productClass: "Matrix",
  transport: "HDMI",
  tags: ["matrix", "4x4", "hdmi"],
};
const scaling = {
  sku: "MX-0404-SCL",
  name: "4x4 Seamless Scaling HDMI Matrix",
  productClass: "Matrix",
  transport: "HDMI",
  tags: ["matrix", "4x4", "hdmi", "scaling", "seamless"],
};
const hdbaset = {
  sku: "MXV-0404-H2A-KIT",
  name: "4x4 HDBaseT Matrix Kit with Receivers",
  productClass: "Matrix",
  transport: "HDBaseT / HDMI",
  tags: ["matrix", "4x4", "hdbaset", "receiver kit"],
};

describe("matrix variant fit", () => {
  it("keeps scaling neutral when competitor evidence does not establish it", () => {
    const simpleFit = assessMatrixVariantFit({ competitorText: "4x4 HDMI matrix", candidate: simple });
    const scalingFit = assessMatrixVariantFit({ competitorText: "4x4 HDMI matrix", candidate: scaling });

    expect(simpleFit.scoreAdjustment).toBe(0);
    expect(scalingFit.scoreAdjustment).toBe(0);
    expect(scalingFit.checks.join(" ")).toMatch(/not confirmed.*feature-enhanced alternative/i);
  });

  it("promotes scaling only when per-output scaling or seamless switching is evidenced", () => {
    const requirement = "4x4 matrix with independent per-output scaling for mixed-resolution displays and seamless switching";
    const simpleFit = assessMatrixVariantFit({ competitorText: requirement, candidate: simple });
    const scalingFit = assessMatrixVariantFit({ competitorText: requirement, candidate: scaling });

    expect(scalingFit.scoreAdjustment).toBeGreaterThan(simpleFit.scoreAdjustment);
    expect(scalingFit.matched.join(" ")).toMatch(/requires output scaling/i);
    expect(simpleFit.gaps.join(" ")).toMatch(/requires output scaling/i);
  });

  it("promotes HDBaseT only when CAT distribution or receiver topology is evidenced", () => {
    const unknownFit = assessMatrixVariantFit({ competitorText: "4x4 HDMI matrix", candidate: hdbaset });
    const requiredFit = assessMatrixVariantFit({ competitorText: "4x4 HDBaseT matrix kit over CAT6 with receivers", candidate: hdbaset });

    expect(unknownFit.scoreAdjustment).toBe(0);
    expect(unknownFit.checks.join(" ")).toMatch(/not confirmed/i);
    expect(requiredFit.scoreAdjustment).toBeGreaterThan(0);
    expect(requiredFit.matched.join(" ")).toMatch(/requires HDBaseT/i);
  });
});
