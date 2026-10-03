import { describe, expect, it } from "vitest";
import { classifyCompetitorCompareDecision } from "./competitorCompareDecision";
import { parseSpecFacts } from "./competitorSpecRegistry";

const baseProfile = {
  domain: "AVOIP",
  role: "encoder",
  transport: "AVoIP",
  maxResolution: "4K60",
  features: {},
  sourceTier: "verified-profile" as const,
  specTier: "verified-profile",
  readiness: "compare-ready",
};

describe("AVoIP network class confidence", () => {
  it("hard-blocks only a confirmed 1GbE versus confirmed 10GbE mismatch", () => {
    const result = classifyCompetitorCompareDecision({
      competitor: {
        ...baseProfile,
        sku: "COMP-1G",
        specs: {
          networkSpeed: "1GbE",
          networkSpeedConfidence: "confirmed",
        },
      },
      wyrestorm: {
        ...baseProfile,
        sku: "NHD-600-TRX",
        specs: {
          networkSpeed: "10GbE",
          networkSpeedConfidence: "confirmed",
        },
      },
      score: 95,
    });

    expect(result.outcome).toBe("NO MATCH");
    expect(result.blockers.join(" ")).toMatch(/Network class mismatch/i);
  });

  it("keeps an inferred mismatch in review rather than rejecting automatically", () => {
    const result = classifyCompetitorCompareDecision({
      competitor: {
        ...baseProfile,
        sku: "COMP-JPEG2000",
        specs: {
          networkSpeed: "1GbE",
          networkSpeedConfidence: "inferred",
          networkSpeedEvidence: "Inferred from JPEG2000.",
          avoipCodec: "JPEG2000",
        },
      },
      wyrestorm: {
        ...baseProfile,
        sku: "NHD-600-TRX",
        specs: {
          networkSpeed: "10GbE",
          networkSpeedConfidence: "confirmed",
        },
      },
      score: 95,
    });

    expect(result.outcome).not.toBe("NO MATCH");
    expect(result.blockers.join(" ")).not.toMatch(/Network class mismatch/i);
    expect([...result.gaps, ...result.verify].join(" ")).toMatch(/inferred|Potential network class mismatch/i);
  });

  it("infers likely 1GbE for JPEG2000, JPEG XS, H.264 and H.265", () => {
    for (const codec of ["JPEG2000", "JPEG XS", "H.264", "H.265"]) {
      const specs = parseSpecFacts(`AV-over-IP encoder using ${codec}`);
      expect(specs.networkSpeed).toBe("1GbE");
      expect(specs.networkSpeedConfidence).toBe("inferred");
      expect(specs.avoipCodec).toBe(codec);
    }
  });

  it("infers 10GbE for SDVoE but leaves IPMX for verification", () => {
    const sdvoe = parseSpecFacts("SDVoE AV-over-IP endpoint");
    expect(sdvoe.networkSpeed).toBe("10GbE");
    expect(sdvoe.networkSpeedConfidence).toBe("inferred");
    expect(sdvoe.avoipCodec).toBe("SDVoE");

    const ipmx = parseSpecFacts("IPMX AV-over-IP endpoint");
    expect(ipmx.networkSpeed).toBeUndefined();
    expect(ipmx.networkSpeedConfidence).toBe("verify");
  });

  it("treats an explicit network value as confirmed even when a codec is also stated", () => {
    const specs = parseSpecFacts("JPEG2000 AVoIP encoder over a managed 10GbE network");
    expect(specs.networkSpeed).toBe("10GbE");
    expect(specs.networkSpeedConfidence).toBe("confirmed");
  });
});
