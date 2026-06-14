import { describe, expect, it } from "vitest";
import {
  buildWyreStormDirectCandidateMap,
  type DirectCandidateProduct,
} from "./wyrestormCompareDirectCandidateMap";

const products: DirectCandidateProduct[] = [
  { sku: "NHD-500-TX", name: "NetworkHD 500 transmitter", description: "NetworkHD AVoIP TX" },
  { sku: "NHD-124-TX", name: "NetworkHD 100 transmitter", description: "NetworkHD AVoIP TX" },
  { sku: "NHD-500-RX", name: "NetworkHD 500 receiver", description: "NetworkHD AVoIP RX" },
  { sku: "NHD-150-RX", name: "NetworkHD 100 multiview receiver", description: "NetworkHD AVoIP RX multiview" },
  { sku: "NHD-600-TRX", name: "NetworkHD 600 transceiver", description: "10G SDVoE AVoIP" },
  { sku: "EXF-300-H2", name: "HDBaseT extender", description: "HDBaseT extender kit" },
  { sku: "EX-100-H2", name: "HDBaseT extender", description: "HDBaseT extender kit" },
  { sku: "NHD-CTL-PRO", name: "NetworkHD controller", description: "controller" },
];

describe("wyrestormCompareDirectCandidateMap", () => {
  it("maps a 1G AVoIP transmitter (codec unknown) to the NetworkHD 500 series only, not 100-series or extenders", () => {
    const result = buildWyreStormDirectCandidateMap({
      competitorText: "Blustream IP350UHD-TX AVoIP Transmitter 4K60",
      wyrestormProducts: products,
    });

    expect(result.didApply).toBe(true);
    expect(result.intent).toBe("avoip_encoder");
    expect(result.candidateSkus).toContain("NHD-500-TX");
    // codec is unknown -> default to 500, never mix in the 100 series
    expect(result.candidateSkus).not.toContain("NHD-124-TX");
    expect(result.candidateSkus).not.toContain("EXF-300-H2");
    expect(result.candidateSkus).not.toContain("EX-100-H2");
    expect(result.candidateSkus).not.toContain("NHD-CTL-PRO");
  });

  it("maps an H.264/H.265 1G transmitter to the NetworkHD 100 series", () => {
    const result = buildWyreStormDirectCandidateMap({
      competitorText: "Competitor AVoIP H.265 HEVC encoder 1GbE",
      wyrestormProducts: products,
    });

    expect(result.didApply).toBe(true);
    expect(result.intent).toBe("avoip_encoder");
    expect(result.candidateSkus).toContain("NHD-124-TX");
    expect(result.candidateSkus).not.toContain("NHD-500-TX");
    expect(result.candidateSkus).not.toContain("NHD-600-TRX");
  });

  it("maps a 1G AVoIP receiver (codec unknown) to NetworkHD 500 receivers only", () => {
    const result = buildWyreStormDirectCandidateMap({
      competitorText: "Blustream IP350UHD-RX AVoIP Receiver 4K60",
      wyrestormProducts: products,
    });

    expect(result.didApply).toBe(true);
    expect(result.intent).toBe("avoip_decoder");
    expect(result.candidateSkus).toContain("NHD-500-RX");
    expect(result.candidateSkus).not.toContain("NHD-150-RX");
    expect(result.candidateSkus).not.toContain("NHD-500-TX");
    expect(result.candidateSkus).not.toContain("NHD-600-TRX");
  });

  it("maps 10G AVoIP to NetworkHD 600 only", () => {
    const result = buildWyreStormDirectCandidateMap({
      competitorText: "Competitor 10G SDVoE AVoIP transceiver",
      wyrestormProducts: products,
    });

    expect(result.didApply).toBe(true);
    expect(result.intent).toBe("avoip_10g");
    expect(result.candidateSkus).toContain("NHD-600-TRX");
    expect(result.candidateSkus).not.toContain("NHD-500-TX");
    expect(result.candidateSkus).not.toContain("NHD-500-RX");
  });

  it("adds rich fallback candidates when catalogue data is incomplete", () => {
    const result = buildWyreStormDirectCandidateMap({
      competitorText: "Blustream IP350UHD-TX AVoIP Transmitter",
      wyrestormProducts: [],
    });

    expect(result.didApply).toBe(true);
    expect(result.candidateSkus).toContain("NHD-500-TX");
    expect(result.candidates[0]?.technology).toContain("AVoIP");
  });

  it("does not apply to unrelated text", () => {
    const result = buildWyreStormDirectCandidateMap({
      competitorText: "generic HDMI splitter",
      wyrestormProducts: products,
    });

    expect(result.didApply).toBe(false);
    expect(result.candidateSkus).toHaveLength(0);
  });

  it("maps Blustream IP300UHD-RX to NetworkHD receiver candidates", () => {
    const result = buildWyreStormDirectCandidateMap({
      competitorText: "Blustream IP300UHD-RX AVoIP receiver decoder 4K60",
      wyrestormProducts: [],
      maxCandidates: 10,
    });

    expect(result.didApply).toBe(true);
    expect(result.candidates.map((candidate) => candidate.sku)).toContain("NHD-500-RX");
    expect(result.candidates.map((candidate) => candidate.sku)).not.toContain("NHD-150-RX");
    expect(result.candidates.map((candidate) => candidate.sku)).not.toContain("EX-100-KVM-IP");
  });

  it("maps compact Blustream IP300UHDRX text to NetworkHD receiver candidates", () => {
    const result = buildWyreStormDirectCandidateMap({
      competitorText: "Blustream IP300UHDRX",
      wyrestormProducts: [],
      maxCandidates: 10,
    });

    expect(result.didApply).toBe(true);
    expect(result.candidates.map((candidate) => candidate.sku)).toContain("NHD-500-RX");
    expect(result.candidates.map((candidate) => candidate.sku)).not.toContain("EX-100-KVM-IP");
  });

  it("maps Blustream IP300UHD-TX to NetworkHD transmitter candidates", () => {
    const result = buildWyreStormDirectCandidateMap({
      competitorText: "Blustream IP300UHD-TX AVoIP transmitter encoder 4K60",
      wyrestormProducts: [],
      maxCandidates: 10,
    });

    expect(result.didApply).toBe(true);
    expect(result.candidates.map((candidate) => candidate.sku)).toContain("NHD-500-TX");
    expect(result.candidates.map((candidate) => candidate.sku)).not.toContain("EX-100-KVM-IP");
  });

  it("never returns a banned legacy SKU even if it is in the product index", () => {
    const withLegacy = [
      ...products,
      { sku: "NHD-100-TX", name: "Legacy NetworkHD 100 encoder" },
      { sku: "NHD-400-TX", name: "Legacy NetworkHD 400 encoder" },
    ];

    const result = buildWyreStormDirectCandidateMap({
      competitorText: "Blustream IP300UHD-TX AVoIP transmitter",
      wyrestormProducts: withLegacy,
    });

    expect(result.candidateSkus).not.toContain("NHD-100-TX");
    expect(result.candidateSkus).not.toContain("NHD-400-TX");
  });
});