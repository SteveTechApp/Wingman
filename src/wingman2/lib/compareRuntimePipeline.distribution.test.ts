import { describe, expect, it } from "vitest";
import { runCompareRuntimePipeline } from "./compareRuntimePipeline";

const PRODUCTS = [
  {
    sku: "SP-0104-H2",
    name: "4K60Hz 4:4:4 1x4 HDMI Splitter",
    title: "4K60Hz 4:4:4 1x4 HDMI Splitter",
    family: "HDMI Distribution",
    category: "HDMI splitter",
    productClass: "HDMI splitter",
    role: "Distribution amplifier",
    transport: "HDMI distribution",
    description: "4K60Hz 4:4:4 1x4 HDMI Splitter with EDID management",
    summary: "One HDMI source distributed to four mirrored HDMI outputs.",
    tags: ["splitter", "distribution amplifier", "1x4", "hdmi", "4k60", "4:4:4"],
  },
  {
    sku: "SP-0108-SCL",
    name: "4K HDR 1x8 Splitter with Scaling Outputs",
    title: "4K HDR 1x8 Splitter with Scaling Outputs",
    family: "HDMI Distribution",
    category: "HDMI splitter",
    productClass: "HDMI splitter",
    role: "Distribution amplifier",
    transport: "HDMI distribution",
    description: "4K60 1x8 HDMI splitter with scaling",
    summary: "One HDMI source distributed to eight mirrored HDMI outputs.",
    tags: ["splitter", "distribution amplifier", "1x8", "hdmi", "4k60", "scaling"],
  },
];

describe("Compare runtime distribution-amplifier recovery", () => {
  it("keeps a non-NO-MATCH 1x4 WyreStorm candidate for Atlona AT-HDDA-4", () => {
    const result = runCompareRuntimePipeline(
      "Atlona AT-HDDA-4",
      PRODUCTS,
      "Atlona",
      8,
    ) as any;

    const candidate = (result.matches ?? []).find(
      (match: any) => String(match.sku).toUpperCase() === "SP-0104-H2",
    );

    expect(result.competitor?.domain).toBe("DISTRIBUTION");
    expect(candidate).toBeTruthy();
    expect(candidate?.compareEligibility?.eligibility).toBe("direct");
    expect(candidate?.decision?.outcome).not.toBe("NO MATCH");

    const eight = (result.matches ?? []).find(
      (match: any) => String(match.sku).toUpperCase() === "SP-0108-SCL",
    );

    if (eight) {
      expect(Number(candidate?.compareEligibility?.fitPenalty ?? 0))
        .toBeLessThan(Number(eight?.compareEligibility?.fitPenalty ?? 999));
    }
  });
});
