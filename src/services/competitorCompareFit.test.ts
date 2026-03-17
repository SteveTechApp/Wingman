import { describe, expect, it, vi } from "vitest";

import type { CompetitorComparisonRecord } from "@/services/competitorComparisonService";

const competitorProduct = {
  brand: "TestBrand",
  sku: "COMP-100",
  name: "Competitor Encoder",
  family: "AVoIP",
  category: "Encoder",
  subcategory: "Networked AV",
  transport: "AVoIP",
  summary: "Competitor reference product.",
  features: ["1Gb AVoIP", "USB routing"],
  control: ["RS232"],
  audio: ["Analog audio"],
  inputs: [{ type: "HDMI", count: 1 }],
  outputs: [{ type: "HDMI", count: 1 }],
  normalizedTags: ["avoip", "encoder"],
  video: {
    maxResolution: "4K60 4:4:4",
    hdmi: "2.0",
    bandwidthGbps: 18,
    hdr: true,
  },
  latency: "low",
  distance: { meters: 70 },
};

const wyrestormProduct = {
  sku: "NHD-600-TX",
  name: "WyreStorm Encoder",
  family: "AVoIP",
  category: "Encoder",
  subcategory: "Networked AV",
  transport: "AVoIP",
  summary: "WyreStorm comparison candidate.",
  features: ["1Gb AVoIP", "USB routing", "PoE"],
  control: ["RS232", "LAN"],
  audio: ["Analog audio"],
  inputs: [{ type: "HDMI", count: 2 }],
  outputs: [{ type: "HDMI", count: 2 }],
  normalizedTags: ["avoip", "encoder", "poe"],
  video: {
    maxResolution: "4K60 4:4:4",
    hdmi: "2.0",
    bandwidthGbps: 18,
    hdr: true,
  },
  latency: "low",
  distance: { meters: 100 },
};

vi.mock("@/catalog", () => ({
  areProductTypesCompatible: vi.fn(() => true),
  classifyCatalogProduct: vi.fn((product: { category?: string }) => ({
    label: product.category || "Unknown",
  })),
  enrichCatalogProduct: vi.fn((product) => product),
  findCatalogProductBySku: vi.fn((sku: string) =>
    sku === wyrestormProduct.sku ? wyrestormProduct : undefined,
  ),
  getCatalogProducts: vi.fn(() => [wyrestormProduct]),
  normalizeCatalogProduct: vi.fn((product) => product),
}));

vi.mock("@/competitor/positioning", () => ({
  explainWyreStormAdvantage: vi.fn(() => ({
    summary: "WyreStorm covers the required workflow with extra flexibility.",
    reasons: ["extra control interfaces"],
  })),
}));

vi.mock("@/competitor/repository", () => ({
  getCompetitorProducts: vi.fn(() => [competitorProduct]),
}));

vi.mock("@/services/avLogicEngine", () => ({
  buildAvSignalProfile: vi.fn((product) => product),
  evaluateAvCompatibility: vi.fn(() => ({
    compatible: true,
    scoreDelta: 12,
    reasons: ["Signal path compatible."],
    warnings: [],
    blockers: [],
  })),
}));

import { buildComparisonOptions } from "@/services/competitorCompareFit";

describe("competitor compare fit", () => {
  it("surfaces better matrix statuses when WyreStorm exceeds the captured competitor profile", () => {
    const record: CompetitorComparisonRecord = {
      brand: "TestBrand",
      competitorSku: "COMP-100",
      competitorName: "Competitor Encoder",
      category: "Encoder",
      summary: "Reference compare record.",
      features: ["1Gb AVoIP", "USB routing"],
      wyrestormSku: "NHD-600-TX",
      wyrestormName: "WyreStorm Encoder",
      wyrestormCategory: "AVoIP / Encoder",
      confidence: "High",
      matchScore: 88,
      rationale: "Strong workflow fit.",
      recommendedFamilies: ["AVoIP"],
      notes: ["Verify network design before quoting."],
    };

    const [option] = buildComparisonOptions(record, "curated");

    expect(option.wyrestormSku).toBe("NHD-600-TX");
    expect(option.matrix.find((row) => row.id === "inputs")?.status).toBe("better");
    expect(option.matrix.find((row) => row.id === "outputs")?.status).toBe("better");
    expect(option.matrix.find((row) => row.id === "control")?.status).toBe("better");
    expect(option.matrix.find((row) => row.id === "distance")?.status).toBe("better");
  });
});
