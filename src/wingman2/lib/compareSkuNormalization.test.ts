import { describe, expect, it } from "vitest";
import { normalizeCompetitorSku } from "./competitorProductIntelligence";
import { resolveCompetitorSpecProfile } from "./competitorSpecRegistry";
import { rigorousCompare } from "./rigorousCompare";
import type { WyrestormProduct } from "./competitorMatchEngine";

const products: WyrestormProduct[] = [
  {
    sku: "NHD-600-TRX",
    name: "NetworkHD 600 Series 4K60 AVoIP Transceiver",
    family: "NetworkHD",
    category: "AVoIP",
    role: "transceiver",
    features: ["AV over IP", "4K60", "USB", "10G"],
  },
  {
    sku: "NHD-500-TX",
    name: "NetworkHD 500 Series AVoIP Encoder",
    family: "NetworkHD",
    category: "AVoIP",
    role: "encoder",
    features: ["AV over IP", "4K60"],
  },
  {
    sku: "NHD-500-RX",
    name: "NetworkHD 500 Series AVoIP Decoder",
    family: "NetworkHD",
    category: "AVoIP",
    role: "decoder",
    features: ["AV over IP", "4K60"],
  },
  {
    sku: "MX-0808-SCL",
    name: "8x8 HDMI Matrix with Scaling",
    family: "Matrix",
    category: "Matrix",
    role: "matrix",
    features: ["HDMI", "4K60", "matrix"],
  },
  {
    sku: "SW-130-TX-UK",
    name: "USB-C Presentation Switcher Transmitter",
    family: "Presentation",
    category: "Presentation",
    role: "switcher",
    features: ["USB-C", "HDMI", "presentation switcher", "4K60"],
  },
  {
    sku: "EX-100-KVM",
    name: "100m HDBaseT KVM Extender",
    family: "HDBaseT",
    category: "HDBaseT",
    role: "transmitter",
    features: ["HDBaseT", "KVM", "4K60", "USB"],
  },
];

const scenarios = [
  { brand: "Crestron", typed: "dmnvx350", expectedSku: "DM-NVX-350", expectedBrand: "Crestron" },
  { brand: "Extron", typed: "navd121", expectedSku: "NAV D 121", expectedBrand: "Extron" },
  { brand: "Kramer", typed: "vs88h2a", expectedSku: "VS-88H2A", expectedBrand: "Kramer" },
  { brand: "Blustream", typed: "hmx4418gkit", expectedSku: "HMX44-18G-KIT", expectedBrand: "Blustream" },
  { brand: "Lightware", typed: "ucx4x2hc40", expectedSku: "UCX-4x2-HC40", expectedBrand: "Lightware" },
  { brand: "AVPro Edge", typed: "acex70444r3", expectedSku: "AC-EX70-444-R3", expectedBrand: "AVPro Edge" },
  { brand: "", typed: "mxnet10gtcvr", expectedSku: "MXNet-10G-TCVR", expectedBrand: "AVPro Edge" },
];

describe("competitor compare SKU normalization", () => {
  it.each(scenarios)("normalizes $typed and still reaches WyreStorm candidates", (scenario) => {
    const normalised = normalizeCompetitorSku(scenario.typed, scenario.brand);

    expect(normalised).toMatchObject({
      brand: scenario.expectedBrand,
      sku: scenario.expectedSku,
      corrected: true,
    });

    const profile = resolveCompetitorSpecProfile(scenario.typed, scenario.brand || undefined);

    expect(profile.brand).toBe(scenario.expectedBrand);
    expect(profile.sku).toBe(scenario.expectedSku);
    expect(profile.specTier).not.toBe("sku-only");

    const result = rigorousCompare(scenario.typed, products, scenario.brand || undefined, 8);

    expect(result.competitor.brand).toBe(scenario.expectedBrand);
    expect(result.competitor.sku).toBe(scenario.expectedSku);
    expect(result.matches.length + result.rejected.length).toBeGreaterThan(0);
  });
});
