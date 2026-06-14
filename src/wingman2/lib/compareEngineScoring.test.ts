import { describe, expect, it } from "vitest";
import {
  buildCompareResult,
  compareProfiles,
  getArchitectureAlternative,
} from "./compareEngineScoring";
import type { ProductProfile } from "./compareEngineModel";

function profile(overrides: Partial<ProductProfile>): ProductProfile {
  return {
    brand: "WyreStorm",
    sku: "TEST",
    name: "Test product",
    productClass: "Test product",
    domainTag: "avoip_decoder",
    subTags: [],
    readiness: "approved",
    ...overrides,
  };
}

describe("compareEngineScoring", () => {
  it("blocks a 1G NetworkHD candidate against a 10G AVoIP competitor", () => {
    const competitor = profile({
      brand: "Competitor",
      sku: "COMP-10G-RX",
      domainTag: "avoip_decoder",
      networkInterface: ["10GbE"],
      inputTypes: ["AVoIP"],
      outputTypes: ["HDMI 2.0"],
      outputCount: 1,
      maxResolution: "4K60",
      compressionLatency: "zero-frame",
    });

    const candidate = profile({
      brand: "WyreStorm",
      sku: "NHD-500-RX",
      name: "NetworkHD 500 Receiver",
      domainTag: "avoip_decoder",
      networkInterface: ["1GbE"],
      inputTypes: ["AVoIP"],
      outputTypes: ["HDMI 2.0"],
      outputCount: 1,
      maxResolution: "4K60",
      compressionLatency: "ultra-low",
    });

    const result = compareProfiles(competitor, candidate);

    expect(result.decision.outcome).toBe("NO MATCH");
    expect(result.decision.blockers.join(" ")).toContain("10G");
  });

  it("allows NetworkHD 600 as the corrected 10G WyreStorm architecture", () => {
    const competitor = profile({
      brand: "Competitor",
      sku: "COMP-10G-RX",
      domainTag: "avoip_decoder",
      networkInterface: ["10GbE"],
      inputTypes: ["AVoIP"],
      outputTypes: ["HDMI 2.0"],
      outputCount: 1,
      maxResolution: "4K60",
      compressionLatency: "zero-frame",
    });

    const candidate = profile({
      brand: "WyreStorm",
      sku: "NHD-600-TRX",
      name: "NetworkHD 600 Transceiver",
      domainTag: "avoip_decoder",
      networkInterface: ["10GbE"],
      inputTypes: ["AVoIP"],
      outputTypes: ["HDMI 2.0"],
      outputCount: 1,
      maxResolution: "4K60",
      compressionLatency: "zero-frame",
    });

    const result = compareProfiles(competitor, candidate);

    expect(result.decision.blockers).toHaveLength(0);
    expect(result.decision.matches.join(" ")).toContain("10GbE");
  });

  it("does not count mirrored outputs as routed matrix outputs", () => {
    const competitor = profile({
      brand: "Competitor",
      sku: "COMP-0606",
      domainTag: "hdmi_matrix",
      inputCount: 6,
      outputCount: 6,
      routedInputCount: 6,
      routedOutputCount: 6,
      inputTypes: ["HDMI 2.0"],
      outputTypes: ["HDMI 2.0"],
      maxResolution: "4K60",
    });

    const candidate = profile({
      brand: "WyreStorm",
      sku: "WYRE-0406-MIRROR",
      domainTag: "hdmi_matrix",
      inputCount: 4,
      outputCount: 6,
      routedInputCount: 4,
      routedOutputCount: 4,
      mirroredOutputCount: 2,
      inputTypes: ["HDMI 2.0"],
      outputTypes: ["HDMI 2.0"],
      maxResolution: "4K60",
    });

    const result = compareProfiles(competitor, candidate);

    expect(result.decision.gaps.some((gap) => gap.attribute === "ioCountMatch")).toBe(true);
  });

  it("caps sku-only candidates at zero confidence", () => {
    const competitor = profile({
      brand: "Competitor",
      sku: "COMP-AVOIP",
      domainTag: "avoip_decoder",
      networkInterface: ["1GbE"],
      outputCount: 1,
      maxResolution: "4K60",
    });

    const candidate = profile({
      brand: "WyreStorm",
      sku: "NHD-120-RX",
      domainTag: "avoip_decoder",
      readiness: "sku-only",
      networkInterface: ["1GbE"],
      outputCount: 1,
      maxResolution: "4K60",
    });

    const result = compareProfiles(competitor, candidate);

    expect(result.decision.confidence).toBe(0);
    expect(result.decision.verify.join(" ")).toContain("SKU is recognised");
  });

  it("offers an architecture alternative for large fixed matrix requirements", () => {
    const competitor = profile({
      brand: "Competitor",
      sku: "COMP-1616-HDMI",
      domainTag: "hdmi_matrix",
      inputCount: 16,
      outputCount: 16,
      routedInputCount: 16,
      routedOutputCount: 16,
    });

    const alternative = getArchitectureAlternative(competitor, []);

    expect(alternative?.toDomain).toBe("avoip_decoder");
    expect(alternative?.skus).toContain("NHD-CTL-PRO");
  });

  it("builds a result with rejected candidates and a 10G architecture note", () => {
    const competitor = profile({
      brand: "Competitor",
      sku: "COMP-10G-RX",
      domainTag: "avoip_decoder",
      networkInterface: ["10GbE"],
      outputCount: 1,
      maxResolution: "4K60",
    });

    const candidate = profile({
      brand: "WyreStorm",
      sku: "NHD-500-RX",
      name: "NetworkHD 500 Receiver",
      domainTag: "avoip_decoder",
      networkInterface: ["1GbE"],
      outputCount: 1,
      maxResolution: "4K60",
    });

    const result = buildCompareResult(competitor, [candidate]);

    expect(result.matches).toHaveLength(0);
    expect(result.rejected).toHaveLength(1);
    expect(result.networkNote).toContain("NetworkHD 600");
  });
});