import { describe, expect, it } from "vitest";
import {
  applyReadinessCap,
  calculateWeightedConfidence,
  classifyNetworkSpeed,
  classifyWyreStormNetworkHdTier,
  createNetworkSpeedGap,
  getRoutedOutputCount,
  outcomeFromConfidence,
  type ProductProfile,
} from "./compareEngineModel";

function profile(overrides: Partial<ProductProfile>): ProductProfile {
  return {
    brand: "WyreStorm",
    sku: "TEST",
    productClass: "Test product",
    domainTag: "avoip_decoder",
    subTags: [],
    readiness: "approved",
    ...overrides,
  };
}

describe("compareEngineModel", () => {
  it("classifies NetworkHD 600 as the 10G NetworkHD architecture", () => {
    const tier = classifyWyreStormNetworkHdTier(
      profile({
        sku: "NHD-600-TRX",
        name: "NetworkHD 600 transceiver",
      }),
    );

    expect(tier).toEqual({
      family: "NetworkHD 600",
      tier: "10G zero-latency",
      networkSpeed: "10GbE",
    });
  });

  it("does not classify NetworkHD 500 as 10G", () => {
    const tier = classifyWyreStormNetworkHdTier(
      profile({
        sku: "NHD-500-TX",
        name: "NetworkHD 500 encoder",
      }),
    );

    expect(tier).toEqual({
      family: "NetworkHD 500",
      tier: "1G premium",
      networkSpeed: "1GbE",
    });
  });

  it("creates a blocking gap when a 10G AVoIP competitor is compared with a 1G candidate", () => {
    const competitor = profile({
      brand: "Competitor",
      sku: "COMP-10G-RX",
      domainTag: "avoip_decoder",
      networkInterface: ["10GbE"],
    });

    const candidate = profile({
      brand: "WyreStorm",
      sku: "NHD-500-RX",
      name: "NetworkHD 500 receiver",
      domainTag: "avoip_decoder",
      networkInterface: ["1GbE"],
    });

    const gap = createNetworkSpeedGap(competitor, candidate);

    expect(gap?.severity).toBe(5);
    expect(gap?.attribute).toBe("networkSpeed");
    expect(outcomeFromConfidence(90, gap ? [gap] : [])).toBe("NO MATCH");
  });

  it("protects against the matrix mirrored-output trap", () => {
    const routedOutputs = getRoutedOutputCount({
      outputCount: 6,
      routedOutputCount: 4,
      mirroredOutputCount: 2,
      loopOutputCount: 0,
    });

    expect(routedOutputs).toBe(4);
  });

  it("caps sku-only profile confidence at zero", () => {
    expect(applyReadinessCap(92, "sku-only")).toBe(0);
  });

  it("caps needs-evidence profile confidence at 65", () => {
    expect(applyReadinessCap(92, "needs-evidence")).toBe(65);
  });

  it("calculates weighted confidence using domain weights", () => {
    const confidence = calculateWeightedConfidence({
      domainTag: "avoip_decoder",
      matchedAttributes: ["domainMatch", "ioCountMatch", "transportMatch", "networkSpeed"],
      gapAttributes: [],
      readiness: "approved",
    });

    expect(confidence).toBeGreaterThan(0);
    expect(confidence).toBeLessThanOrEqual(100);
  });

  it("normalises basic network speed labels", () => {
    expect(classifyNetworkSpeed(["10GbE"])).toBe("10GbE");
    expect(classifyNetworkSpeed(["1GbE"])).toBe("1GbE");
    expect(classifyNetworkSpeed(["SFP+"])).toBe("SFP+");
  });
});