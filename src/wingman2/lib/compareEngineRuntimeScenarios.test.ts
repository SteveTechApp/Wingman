import { describe, expect, it } from "vitest";
import { buildRuntimeCompareSummary } from "./compareEngineRuntimeAdapter";

describe("compareEngineRuntimeScenarios", () => {
  it("protects against the mirrored-output trap in matrix comparison", () => {
    const summary = buildRuntimeCompareSummary({
      competitor: {
        manufacturer: "Competitor",
        sku: "COMP-0606-HDMI",
        productClass: "HDMI matrix",
        technology: "HDMI matrix",
        inputs: 6,
        outputs: 6,
        routedInputs: 6,
        routedOutputs: 6,
        resolution: "4K60",
        inputTypes: ["HDMI 2.0"],
        outputTypes: ["HDMI 2.0"],
        readiness: "approved",
      },
      candidates: [
        {
          manufacturer: "WyreStorm",
          sku: "WYRE-0406-MIRROR",
          productClass: "HDMI matrix",
          technology: "HDMI matrix with mirrored HDMI outputs",
          inputs: 4,
          outputs: 6,
          routedInputs: 4,
          routedOutputs: 4,
          mirroredOutputs: 2,
          resolution: "4K60",
          inputTypes: ["HDMI 2.0"],
          outputTypes: ["HDMI 2.0"],
          readiness: "approved",
        },
      ],
    });

    expect(summary.gapSummary.some((gap) => gap.attribute === "ioCountMatch")).toBe(true);
    expect(summary.customerSafeSummary).not.toContain("safe to quote");
  });

  it("offers a NetworkHD architecture alternative for large fixed matrix requirements", () => {
    const summary = buildRuntimeCompareSummary({
      competitor: {
        manufacturer: "Competitor",
        sku: "COMP-1616-HDMI",
        productClass: "16x16 HDMI matrix",
        technology: "HDMI matrix",
        inputs: 16,
        outputs: 16,
        routedInputs: 16,
        routedOutputs: 16,
        resolution: "4K60",
      },
      candidates: [],
    });

    expect(summary.architectureAlternative?.skus).toContain("NHD-CTL-PRO");
    expect(summary.customerSafeSummary).toContain("architecture alternative");
  });

  it("flags PoH dependency as blocking where candidate does not confirm PoH", () => {
    const summary = buildRuntimeCompareSummary({
      competitor: {
        manufacturer: "Competitor",
        sku: "COMP-HDBT-CLASS-A",
        productClass: "HDBaseT extender",
        technology: "HDBaseT extender Class A",
        hdbasetClass: "Class A",
        hdbasetDistance: 100,
        powerSupply: "PoH",
        poeClass: "PoH 802.3bt",
        resolution: "4K60",
      },
      candidates: [
        {
          manufacturer: "WyreStorm",
          sku: "EX-70-UNKNOWN",
          productClass: "HDBaseT extender",
          technology: "HDBaseT extender",
          hdbasetClass: "Class A",
          hdbasetDistance: 100,
          powerSupply: "external",
          resolution: "4K60",
          readiness: "approved",
        },
      ],
    });

    expect(summary.blockers.join(" ")).toContain("PoH");
    expect(summary.powerNote).toContain("Power");
  });

  it("requires video wall or scaling evidence where competitor has wall processing", () => {
    const summary = buildRuntimeCompareSummary({
      competitor: {
        manufacturer: "Competitor",
        sku: "COMP-VW-33",
        productClass: "Video wall processor",
        technology: "video wall processor",
        videoWall: true,
        scalingOutput: true,
        outputs: 9,
        routedOutputs: 9,
        resolution: "4K60",
      },
      candidates: [
        {
          manufacturer: "WyreStorm",
          sku: "BASIC-HDMI-MATRIX",
          productClass: "HDMI matrix",
          technology: "HDMI matrix",
          outputs: 9,
          routedOutputs: 9,
          resolution: "4K60",
          readiness: "approved",
        },
      ],
    });

    expect(summary.shortlist.intent).toBe("video_wall");
    expect(summary.shortlist.candidateSkus).toContain("SW-0206-VW");
    expect(summary.shortlist.candidateSkus).not.toContain("BASIC-HDMI-MATRIX");
    expect(summary.customerSafeSummary).not.toContain("safe to quote");
  });

  it("allows NetworkHD 600 as the 10G path and keeps NetworkHD 500 out of 10G direct matching", () => {
    const summary = buildRuntimeCompareSummary({
      competitor: {
        manufacturer: "Competitor",
        sku: "COMP-10G-TRX",
        technology: "AVoIP SDVoE",
        role: "Receiver",
        network: "10GbE",
        outputs: 1,
        resolution: "4K60",
        compressionLatency: "zero-frame",
      },
      candidates: [
        {
          manufacturer: "WyreStorm",
          sku: "NHD-500-RX",
          technology: "NetworkHD 500",
          role: "Receiver",
          network: "1GbE",
          outputs: 1,
          resolution: "4K60",
          compressionLatency: "ultra-low",
          readiness: "approved",
        },
        {
          manufacturer: "WyreStorm",
          sku: "NHD-600-TRX",
          technology: "NetworkHD 600",
          role: "Receiver",
          network: "10GbE",
          outputs: 1,
          resolution: "4K60",
          compressionLatency: "zero-frame",
          readiness: "approved",
        },
      ],
    });

    expect(summary.matches[0]?.sku).toBe("NHD-600-TRX");
        expect(summary.shortlist.candidateSkus).not.toContain("NHD-500-RX");
    expect(summary.rejected.some((item) => item.sku === "NHD-500-RX")).toBe(false);
  });
});