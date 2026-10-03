import { describe, expect, it } from "vitest";
import { resolveCompetitorSpecProfile } from "./competitorSpecRegistry";
import { normaliseProductTechnology } from "./technologyNormalizer";

describe("Compare technology normalization integration", () => {
  it("adds normalized technology to a stored Crestron DM NVX profile", () => {
    const profile = resolveCompetitorSpecProfile("DM-NVX-350", "Crestron");

    expect(profile.domain).toBe("AVOIP");
    expect(profile.technology?.vendorTechnology).toBe("Crestron DM NVX");
    expect(profile.technology?.canonicalTransport).toBe("AV-over-IP");
    expect(profile.technology?.networkClass).toBe("1GbE");
    expect(profile.technology?.codecName).toBe("Pixel Perfect Processing");
  });

  it("does not describe generic Extron DTP as native HDBaseT", () => {
    const profile = resolveCompetitorSpecProfile("DTP T USW 233", "Extron");

    expect(profile.technology?.vendorTechnology).toBe("Extron DTP");
    expect(profile.technology?.standardRelationship).not.toBe("native");
  });

  it("treats different proprietary 1GbE AVoIP codecs as architecture-comparable rather than identical", () => {
    const nvx = normaliseProductTechnology({
      manufacturer: "Crestron",
      sku: "DM-NVX-350",
    });
    const nhd500 = normaliseProductTechnology({
      manufacturer: "WyreStorm",
      sku: "NHD-500-TX",
    });

    expect(nvx.canonicalTransport).toBe("AV-over-IP");
    expect(nhd500.canonicalTransport).toBe("AV-over-IP");
    expect(nvx.networkClass).toBe("1GbE");
    expect(nhd500.networkClass).toBe("1GbE");
    expect(nvx.codecName).not.toBe(nhd500.codecName);
  });
});