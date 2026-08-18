import { describe, expect, it } from "vitest";
import {
  normaliseProductTechnology,
  technologyProfilesAreDirectlyComparable,
} from "./technologyNormalizer";

describe("cross-vendor technology normalisation", () => {
  it("preserves Crestron DM 8G+ while recognising its HDBaseT standards relationship", () => {
    const result = normaliseProductTechnology({
      manufacturer: "Crestron",
      sku: "DM-TX-401-C",
      technology: "DigitalMedia 8G+",
      summary: "DM 8G+ is HDBaseT Certified and interoperable with HDBaseT devices.",
    });

    expect(result.vendorTechnology).toBe("Crestron DigitalMedia 8G+");
    expect(result.canonicalTransport).toBe("HDBaseT");
    expect(result.standardRelationship).toBe("certified");
    expect(result.interoperability).toBe("third-party-compatible");
  });

  it("does not flatten Crestron DigitalMedia fiber into HDBaseT", () => {
    const result = normaliseProductTechnology({
      manufacturer: "Crestron",
      sku: "DMB-4K-O-S",
      technology: "DM 8G Single-Mode Fiber",
    });

    expect(result.transportFamily).toBe("fiber");
    expect(result.canonicalTransport).toBe("DigitalMedia fiber");
    expect(result.standardRelationship).toBe("proprietary");
  });

  it("keeps generic Extron DTP proprietary until HDBaseT compatibility is evidenced", () => {
    const result = normaliseProductTechnology({
      manufacturer: "Extron",
      sku: "DTP T USW 233",
      technology: "DTP",
    });

    expect(result.vendorTechnology).toBe("Extron DTP");
    expect(result.canonicalTransport).toBe("Extron DTP twisted-pair AV");
    expect(result.standardRelationship).toBe("proprietary");
  });

  it("recognises an Extron DTP3 product explicitly listed as HDBaseT compatible", () => {
    const result = normaliseProductTechnology({
      manufacturer: "Extron",
      sku: "DTP3 T 202",
      technology: "DTP3",
      summary: "Configurable for compatibility with HDBaseT displays.",
    });

    expect(result.vendorTechnology).toBe("Extron DTP");
    expect(result.canonicalTransport).toBe("HDBaseT");
    expect(result.standardRelationship).toBe("selectable-mode");
  });

  it("normalises Lightware TPS to HDBaseT while preserving the TPS name", () => {
    const result = normaliseProductTechnology({
      manufacturer: "Lightware",
      sku: "HDMI-TPS-TX220",
      technology: "TPS",
      summary: "TPS interface uses HDBaseT technology.",
    });

    expect(result.vendorTechnology).toBe("Lightware TPS");
    expect(result.canonicalTransport).toBe("HDBaseT");
    expect(result.standardRelationship).toBe("based-on");
  });

  it("does not map AMX DXLink Fiber to HDBaseT", () => {
    const result = normaliseProductTechnology({
      manufacturer: "AMX",
      sku: "DXFP-TX-4K60",
      technology: "DXLink Fiber",
    });

    expect(result.transportFamily).toBe("fiber");
    expect(result.canonicalTransport).toBe("DXLink Fiber");
  });

  it("differentiates Extron NAV 1G and 10G endpoints", () => {
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
    expect(oneGig.codecName).toBe("PURE3");
    expect(tenGig.codecName).toBe("PURE3");
    expect(technologyProfilesAreDirectlyComparable(oneGig, tenGig)).toBe(false);
  });

  it("normalises Crestron DM NVX as proprietary 1GbE AVoIP without pretending JPEG2000 equivalence", () => {
    const result = normaliseProductTechnology({
      manufacturer: "Crestron",
      sku: "DM-NVX-350",
      technology: "DM NVX",
    });

    expect(result.canonicalTransport).toBe("AV-over-IP");
    expect(result.networkClass).toBe("1GbE");
    expect(result.codecName).toBe("Pixel Perfect Processing");
    expect(result.codecStandard).toBe("Crestron proprietary");
  });

  it("normalises Atlona OmniStream codec as VC-2 / SMPTE ST 2042", () => {
    const result = normaliseProductTechnology({
      manufacturer: "Atlona",
      sku: "AT-OMNI-111",
      technology: "OmniStream",
    });

    expect(result.networkClass).toBe("1GbE");
    expect(result.codecStandard).toBe("SMPTE ST 2042 / VC-2");
  });

  it("normalises ZeeVee ZyPer4K to the same 10GbE SDVoE architecture class as NetworkHD 600", () => {
    const zyper = normaliseProductTechnology({
      manufacturer: "ZeeVee",
      sku: "ZYPER4K-ENC",
      technology: "ZyPer4K",
    });
    const nhd600 = normaliseProductTechnology({
      manufacturer: "WyreStorm",
      sku: "NHD-600-TRX",
      technology: "NetworkHD 600",
    });

    expect(zyper.networkClass).toBe("10GbE");
    expect(zyper.codecStandard).toBe("SDVoE");
    expect(nhd600.codecStandard).toBe("SDVoE");
    expect(technologyProfilesAreDirectlyComparable(zyper, nhd600)).toBe(true);
  });

  it("normalises NetworkHD 500 as 1GbE JPEG2000", () => {
    const result = normaliseProductTechnology({
      manufacturer: "WyreStorm",
      sku: "NHD-500-TX",
      technology: "NetworkHD 500",
    });

    expect(result.canonicalTransport).toBe("AV-over-IP");
    expect(result.networkClass).toBe("1GbE");
    expect(result.codecStandard).toBe("JPEG2000");
  });

  it("allows application-level AVoIP comparison across proprietary codecs when network class aligns", () => {
    const nvx = normaliseProductTechnology({
      manufacturer: "Crestron",
      sku: "DM-NVX-350",
    });
    const nhd500 = normaliseProductTechnology({
      manufacturer: "WyreStorm",
      sku: "NHD-500-TX",
    });

    expect(nvx.codecName).not.toBe(nhd500.codecName);
    expect(technologyProfilesAreDirectlyComparable(nvx, nhd500)).toBe(true);
  });
});