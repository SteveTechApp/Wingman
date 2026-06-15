import { describe, expect, it } from "vitest";
import { mapCompetitorToNetworkHdAvoip } from "./networkHdAvoipEquivalence";

function hasPlainTxSku(sku: string): boolean {
  return /-TX\b/.test(sku) && !/-TRX\b/.test(sku);
}

function hasPlainRxSku(sku: string): boolean {
  return /-RX\b/.test(sku) && !/-TRX\b/.test(sku);
}

describe("NetworkHD AVoIP role gate", () => {
  it("maps Atlona AT-OMNI-111 as an encoder and blocks decoder candidates", () => {
    const result = mapCompetitorToNetworkHdAvoip("Atlona AT-OMNI-111");

    expect(result.classification.role).toBe("encoder");
    expect(result.recommendation.candidateSkus.length).toBeGreaterThan(0);
    expect(result.recommendation.candidateSkus.some(hasPlainTxSku)).toBe(true);
    expect(result.recommendation.candidateSkus.some(hasPlainRxSku)).toBe(false);
  });

  it("maps Atlona AT-OMNI-121 as a decoder and blocks encoder candidates", () => {
    const result = mapCompetitorToNetworkHdAvoip("Atlona AT-OMNI-121");

    expect(result.classification.role).toBe("decoder");
    expect(result.recommendation.candidateSkus.length).toBeGreaterThan(0);
    expect(result.recommendation.candidateSkus.some(hasPlainRxSku)).toBe(true);
    expect(result.recommendation.candidateSkus.some(hasPlainTxSku)).toBe(false);
  });

  it("maps Blustream IP250UHD-TX as a 1G encoder and blocks decoder candidates", () => {
    const result = mapCompetitorToNetworkHdAvoip("Blustream IP250UHD-TX");

    expect(result.classification.isAvoip).toBe(true);
    expect(result.classification.networkClass).toBe("1g");
    expect(result.classification.role).toBe("encoder");
    expect(result.recommendation.candidateSkus.some(hasPlainTxSku)).toBe(true);
    expect(result.recommendation.candidateSkus.some(hasPlainRxSku)).toBe(false);
  });

  it("maps Blustream IP250UHD-RX as a 1G decoder and blocks encoder candidates", () => {
    const result = mapCompetitorToNetworkHdAvoip("Blustream IP250UHD-RX");

    expect(result.classification.isAvoip).toBe(true);
    expect(result.classification.networkClass).toBe("1g");
    expect(result.classification.role).toBe("decoder");
    expect(result.recommendation.candidateSkus.some(hasPlainRxSku)).toBe(true);
    expect(result.recommendation.candidateSkus.some(hasPlainTxSku)).toBe(false);
  });
});