import { describe, expect, it } from "vitest";
import {
  buildRuntimeCompareSummary,
  coerceCompareProductToProfile,
  compareLooseProfiles,
} from "./compareEngineRuntimeAdapter";

describe("compareEngineRuntimeAdapter", () => {
  it("coerces a loose AVoIP receiver object into a governed product profile", () => {
    const profile = coerceCompareProductToProfile({
      manufacturer: "Blustream",
      sku: "IP200UHD-RX",
      technology: "AVoIP",
      role: "Receiver",
      outputs: 1,
      resolution: "4K60",
      network: "1GbE",
      evidenceTier: "verified-profile",
    });

    expect(profile.domainTag).toBe("avoip_decoder");
    expect(profile.sku).toBe("IP200UHD-RX");
    expect(profile.outputCount).toBe(1);
    expect(profile.networkInterface).toContain("1GbE");
    expect(profile.readiness).toBe("approved");
  });

  it("blocks a loose 10G AVoIP competitor from directly matching a loose NetworkHD 500 candidate", () => {
    const result = compareLooseProfiles(
      {
        manufacturer: "Competitor",
        sku: "COMP-10G-RX",
        technology: "AVoIP",
        role: "Receiver",
        network: "10GbE",
        outputs: 1,
        resolution: "4K60",
      },
      {
        manufacturer: "WyreStorm",
        sku: "NHD-500-RX",
        technology: "NetworkHD AVoIP",
        role: "Receiver",
        network: "1GbE",
        outputs: 1,
        resolution: "4K60",
        readiness: "approved",
      },
    );

    expect(result.decision.outcome).toBe("NO MATCH");
    expect(result.decision.blockers.join(" ")).toContain("10G");
  });

  it("shortlists NetworkHD 600 before scoring a 10G AVoIP competitor", () => {
    const summary = buildRuntimeCompareSummary({
      competitor: {
        manufacturer: "Competitor",
        sku: "COMP-10G-TX",
        technology: "AVoIP",
        role: "Transmitter",
        network: "10GbE",
        inputs: 1,
        resolution: "4K60",
      },
      candidates: [
        {
          manufacturer: "WyreStorm",
          sku: "NHD-500-TX",
          technology: "NetworkHD AVoIP",
          role: "Transmitter",
          network: "1GbE",
          inputs: 1,
          resolution: "4K60",
          readiness: "approved",
        },
        {
          manufacturer: "WyreStorm",
          sku: "NHD-600-TRX",
          technology: "NetworkHD 600 10G SDVoE AVoIP transceiver",
          role: "Transmitter",
          network: "10GbE",
          inputs: 1,
          resolution: "4K60",
          compressionLatency: "zero-frame",
          readiness: "approved",
        },
      ],
    });

    expect(summary.shortlist.intent).toBe("avoip_10g");
    expect(summary.shortlist.candidateSkus).toContain("NHD-600-TRX");
    expect(summary.shortlist.candidateSkus).not.toContain("NHD-500-TX");
    expect(summary.matches[0]?.sku).toBe("NHD-600-TRX");
  });

  it("uses fallback shortlist candidates when the product list is incomplete", () => {
    const summary = buildRuntimeCompareSummary({
      competitor: {
        manufacturer: "Competitor",
        sku: "COMP-10G-RX",
        technology: "10G SDVoE AVoIP receiver",
        role: "Receiver",
        network: "10GbE",
        outputs: 1,
        resolution: "4K60",
      },
      candidates: [
        {
          manufacturer: "WyreStorm",
          sku: "NHD-500-RX",
          technology: "NetworkHD 500 1G receiver",
          role: "Receiver",
          network: "1GbE",
          outputs: 1,
          resolution: "4K60",
          readiness: "approved",
        },
      ],
    });

    expect(summary.shortlist.intent).toBe("avoip_10g");
    expect(summary.shortlist.candidateSkus).toContain("NHD-600-TRX");
    expect(summary.shortlist.candidateSkus).not.toContain("NHD-500-RX");
  });

  it("caps sku-only runtime candidates and requests evidence", () => {
    const summary = buildRuntimeCompareSummary({
      competitor: {
        manufacturer: "Competitor",
        sku: "COMP-1G-RX",
        technology: "AVoIP",
        role: "Receiver",
        network: "1GbE",
        outputs: 1,
        resolution: "4K60",
      },
      candidates: [
        {
          manufacturer: "WyreStorm",
          sku: "NHD-120-RX",
          technology: "NetworkHD AVoIP",
          role: "Receiver",
          network: "1GbE",
          outputs: 1,
          resolution: "4K60",
          readiness: "sku-only",
        },
      ],
    });

    expect(summary.shortlist.intent).toBe("avoip_1g_decoder");
        const skuOnlyResult =
      summary.rejected.find((item) => item.sku === "NHD-120-RX") ??
      summary.matches.find((item) => item.sku === "NHD-120-RX");

    expect(skuOnlyResult?.decision.confidence).toBe(0);
    expect(summary.verify.join(" ")).toContain("SKU is recognised");
  });
});