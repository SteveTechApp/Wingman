import { describe, expect, it } from "vitest";

import {
  normaliseProductTechnology,
  technologyProfilesAreDirectlyComparable,
} from "./technology-normalizer.mjs";

describe("server technology normalizer", () => {
  it("Crestron DM 8G+ retains the vendor name while normalizing to HDBaseT", () => {
    const result = normaliseProductTechnology({
      manufacturer: "Crestron",
      sku: "DM-TX-401-C",
      technology: "DigitalMedia 8G+",
      summary: "HDBaseT Certified",
    });

    expect(result.vendorTechnology).toBe("Crestron DigitalMedia 8G+");
    expect(result.canonicalTransport).toBe("HDBaseT");
    expect(result.standardRelationship).toBe("certified");
  });

  it("Crestron DigitalMedia fiber is not flattened into HDBaseT", () => {
    const result = normaliseProductTechnology({
      manufacturer: "Crestron",
      sku: "DMB-4K-O-S",
      technology: "DM 8G Single-Mode Fiber",
    });

    expect(result.transportFamily).toBe("fiber");
    expect(result.canonicalTransport).toBe("DigitalMedia fiber");
  });

  it("generic Extron DTP stays proprietary unless compatibility is proven", () => {
    const result = normaliseProductTechnology({
      manufacturer: "Extron",
      sku: "DTP T USW 233",
      technology: "DTP",
    });

    expect(result.canonicalTransport).toBe("Extron DTP twisted-pair AV");
    expect(result.standardRelationship).toBe("proprietary");
  });

  it("DTP3 T 202 is normalized as selectable HDBaseT operation", () => {
    const result = normaliseProductTechnology({
      manufacturer: "Extron",
      sku: "DTP3 T 202",
      technology: "DTP3",
    });

    expect(result.canonicalTransport).toBe("HDBaseT");
    expect(result.standardRelationship).toBe("selectable-mode");
  });

  it("Extron NAV 1G and NAV 10G remain different network architecture classes", () => {
    const oneGig = normaliseProductTechnology({
      manufacturer: "Extron",
      sku: "NAV E 501",
      technology: "NAV",
    });
    const tenGig = normaliseProductTechnology({
      manufacturer: "Extron",
      sku: "NAV 10E 501",
      technology: "NAV",
    });

    expect(oneGig.networkClass).toBe("1GbE");
    expect(tenGig.networkClass).toBe("10GbE");
    expect(technologyProfilesAreDirectlyComparable(oneGig, tenGig)).toBe(false);
  });

  it("ZyPer4K and NetworkHD 600 share the 10GbE SDVoE architecture class", () => {
    const zyper = normaliseProductTechnology({
      manufacturer: "ZeeVee",
      sku: "ZYPER4K-ENC",
      technology: "ZyPer4K",
    });
    const nhd = normaliseProductTechnology({
      manufacturer: "WyreStorm",
      sku: "NHD-600-TRX",
      technology: "NetworkHD 600",
    });

    expect(zyper.networkClass).toBe("10GbE");
    expect(nhd.networkClass).toBe("10GbE");
    expect(zyper.codecStandard).toBe("SDVoE");
    expect(nhd.codecStandard).toBe("SDVoE");
    expect(technologyProfilesAreDirectlyComparable(zyper, nhd)).toBe(true);
  });
});