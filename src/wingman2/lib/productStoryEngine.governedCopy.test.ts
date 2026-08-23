import { describe, expect, it } from "vitest";
import index from "../../../public/product-intelligence-index.json";
import {
  buildProductNarrative,
  buildProductFeatureBenefits,
  normaliseProductRecord,
  type ProductSpec,
  type ProductTechnicalDataSummary,
} from "./productStoryEngine";
import { hydrateProductSpecWithTechnicalData } from "./governedProductTechnicalData";

function governedTechnicalData(overrides: Partial<ProductTechnicalDataSummary> = {}): ProductTechnicalDataSummary {
  return {
    status: "verified",
    statusLabel: "Verified governed profile",
    completeness: 100,
    compareReady: true,
    sourceTier: "verified-profile",
    transport: ["HDMI"],
    dependencies: [],
    compatibleFamilies: [],
    evidence: ["Official source: https://www.wyrestorm.com/"],
    missingFields: [],
    warnings: [],
    ...overrides,
  };
}

function spec(overrides: Partial<ProductSpec>): ProductSpec {
  return {
    sku: "ZZZ-TEST-1",
    name: "Test product",
    family: "WyreStorm",
    category: "Product",
    productType: "Product",
    description: "Product description not yet available.",
    purpose: "Product description not yet available.",
    summary: "Product description not yet available.",
    keyFeatures: ["Key features not yet fully confirmed in the product intelligence record."],
    applications: ["Application fit not yet classified."],
    ioSummary: ["I/O details are not yet confirmed in the product intelligence record."],
    video: ["Video specification not yet confirmed in the product intelligence record."],
    audio: ["Audio specification not yet confirmed or not applicable."],
    usb: ["USB requirement not yet confirmed or not applicable."],
    network: ["Network requirement not yet confirmed or not applicable."],
    control: ["Control requirement not yet confirmed or not applicable."],
    power: ["Power detail must be confirmed from current datasheet."],
    physical: ["Physical details must be confirmed from current datasheet."],
    checks: ["Confirm source count, display count, signal type, distance, USB, audio, control, network and power requirements."],
    related: [],
    ...overrides,
  };
}

function findRaw(sku: string): unknown {
  const root = index as { products?: unknown[] };
  const products = Array.isArray(root.products) ? root.products : [];
  return products.find((p) => (p as { sku?: string }).sku === sku);
}

describe("governed-first pitch and call-card copy", () => {
  it("never lets family-level capability tags drive the headline when governed spec evidence exists", () => {
    // A 4K presentation switcher whose family tags claim "Video Wall"/"8K" -
    // the exact tag soup that previously fronted generated copy.
    const governed = spec({
      sku: "SW-XXXX-TEST",
      name: "Test presentation switcher",
      productType: "presentation switcher",
      description: "Presentation switcher | 4K60 4:4:4 | HDMI | USB-C",
      capabilityTags: ["Video Wall", "Processing", "Unified Comms", "8K", "Seamless Switching"],
      keyFeatures: ["8K", "Video Wall"],
      video: ["4K60 4:4:4", "Seamless switching"],
      usb: ["USB 3.x"],
      ioSummary: ["2 x HDMI input", "1 x HDMI output"],
      technicalData: governedTechnicalData({ maxResolution: "4K60 4:4:4" }),
    });

    const narrative = buildProductNarrative(governed);

    expect(narrative.headline).toMatch(/4:4:4|4K60/);
    expect(narrative.headline).not.toMatch(/Video Wall|8K|Unified/);
    expect(narrative.whatItIs).not.toMatch(/Video Wall|Unified/);
    // The governed maximum is respected: nothing claims above 4K.
    expect(narrative.whatItIs).not.toMatch(/\b8K\b/);
  });

  it("keeps the legacy tag behaviour for specs with no governed evidence", () => {
    // No technicalData -> no governed authority -> tags remain the only signal.
    const ungoverned = spec({
      sku: "SW-XXXX-TEST",
      name: "Test presentation switcher",
      productType: "presentation switcher",
      description: "Test description.",
      capabilityTags: ["Video Wall", "8K"],
      keyFeatures: ["8K", "Video Wall"],
      video: ["4K60 4:4:4"],
    });

    const narrative = buildProductNarrative(ungoverned);

    expect(narrative.headline).toMatch(/Video Wall|8K/);
  });

  it("caps resolution claims at the governed maximum resolution", () => {
    // The family tags and prose mention 8K/4K, but the governed max is 1080p.
    const governed = spec({
      sku: "ENC-XXXX-TEST",
      name: "Test encoder",
      productType: "encoder",
      description: "Cost-effective encoder | Pairs with our 4K60 decoder | 8K ready walls",
      capabilityTags: ["8K", "4K60"],
      keyFeatures: ["8K", "4K60"],
      video: ["Maximum stated format: 1080p60", "4K60 4:4:4"],
      technicalData: governedTechnicalData({ maxResolution: "1080p60" }),
    });

    const narrative = buildProductNarrative(governed);
    const benefits = buildProductFeatureBenefits(governed, 5);

    expect(narrative.headline).toMatch(/1080p/);
    expect(narrative.headline).not.toMatch(/\b8K\b|\b4K60?\b/);
    expect(benefits.join(" ")).not.toMatch(/\b8K\b|\b4K60?\b/);
  });

  it("keeps a genuine governed 4K token while still dropping 8K claims above it", () => {
    const governed = spec({
      sku: "MAT-XXXX-TEST",
      name: "Test matrix",
      productType: "matrix switcher",
      description: "Matrix switcher | 8K-ready HDMI",
      capabilityTags: ["8K"],
      keyFeatures: ["8K"],
      video: ["Maximum stated format: 4K60 4:4:4"],
      technicalData: governedTechnicalData({ maxResolution: "4K60 4:4:4" }),
    });

    const narrative = buildProductNarrative(governed);
    const benefits = buildProductFeatureBenefits(governed, 5);

    expect(narrative.headline).toMatch(/4K60/);
    expect(narrative.headline).not.toMatch(/\b8K\b/);
    expect(benefits.join(" ")).not.toMatch(/\b8K\b/);
  });

  it("surfaces USB benefits from the governed USB spec, not marketing tags", () => {
    const governed = spec({
      sku: "SW-USB-TEST",
      name: "Test switcher",
      productType: "presentation switcher",
      description: "Presentation switcher | HDMI",
      capabilityTags: ["USB 3.x"],
      video: ["4K60"],
      usb: ["3 x USB 3.0 Type A device ports", "USB 3.x", "USB-C"],
      technicalData: governedTechnicalData({ maxResolution: "4K60" }),
    });

    const benefits = buildProductFeatureBenefits(governed, 5).join(" ");

    expect(benefits).toMatch(/fast USB/i);
    expect(benefits).toMatch(/USB-C/i);
  });

  it("call-card path: governed index seed pitches the real 8K switcher, not a video wall", () => {
    // EXP-SW-0201-8K is the 2x1 variant of the 8K60 HDMI switcher family. Its
    // verified governed profile (SWITCHER, 2 in / 1 out, 8K60 4:4:4) must drive
    // the copy - never family-level "Video Wall"/"Processing" tag soup. The
    // call-card path mirrors narrativeForSeed: normalise + hydrate with the
    // seed's governed technicalProfile, then build.
    const raw = findRaw("EXP-SW-0201-8K");
    expect(raw).toBeTruthy();

    const seed = {
      sku: (raw as { sku: string }).sku,
      name: (raw as { name: string }).name,
      family: (raw as { family?: string }).family,
      category: (raw as { category: string }).category,
      productType: (raw as { category: string }).category,
      description: (raw as { description: string }).description,
      features: (raw as { features?: string[] }).features,
      technicalProfile: (raw as { technicalProfile?: unknown }).technicalProfile,
      sourceCatalog: (raw as { sourceCatalog?: unknown }).sourceCatalog,
    };

    const spec = normaliseProductRecord(seed, 0);
    expect(spec).not.toBeNull();
    const narrative = buildProductNarrative(hydrateProductSpecWithTechnicalData(spec!, seed));
    const benefits = buildProductFeatureBenefits(hydrateProductSpecWithTechnicalData(spec!, seed), 5).join(" ");

    // Governed headline: real 8K60 switcher, not the family tag soup.
    expect(narrative.headline).toMatch(/8K60|8K/);
    expect(narrative.headline).not.toMatch(/Video Wall/);
    expect(narrative.whatItIs).not.toMatch(/Video Wall/);
    // Benefits are grounded in the governed spec, never empty tag-derived hooks.
    expect(benefits).toMatch(/4:4:4/);
  });

  it("range page SW-0X01-8K carries no saleable spec of its own after the variant split", () => {
    // The user correction: SW-0X01-8K is a family page covering the two real
    // SKUs (EXP-SW-0201-8K 2x1, EXP-SW-0401-8K 4x1), not a product. It must not
    // present phantom claims (USB 3.x, a single HDMI-out spec, video-wall
    // processing) as if it were a saleable unit.
    const raw = findRaw("SW-0X01-8K");
    expect(raw).toBeTruthy();

    const record = raw as {
      lifecycleStatus?: string;
      commercialRole?: string;
      features?: string[];
      tags?: string[];
      technicalProfile?: {
        io?: { ports?: Array<{ count: number; connector: string; direction: string; category: string }> };
        usb?: { present?: boolean; versions?: string[] };
        transports?: string[];
        governedSpecification?: { status?: string; productClass?: string } | null;
      };
    };

    // Lifecycle: review-required range placeholder, not a lead product.
    expect(record.lifecycleStatus).toBe("review");
    expect(record.commercialRole).toBe("review-required");

    // Phantom spec claims stripped: no USB 3.x, no video-wall processing, no ports.
    const profile = record.technicalProfile ?? {};
    expect(profile.usb?.present ?? false).toBe(false);
    expect((profile.io?.ports ?? []).length).toBe(0);
    expect(profile.transports ?? []).not.toContain("USB 3.x");
    expect((record.features ?? []).join(" ")).not.toMatch(/Video Wall|USB 3\.x|Processing/);

    // The real variants carry the actual governed I/O.
    const twoIn = findRaw("EXP-SW-0201-8K") as { technicalProfile?: { io?: { ports?: unknown[] }; governedSpecification?: { inputCount?: number; outputCount?: number } } };
    const fourIn = findRaw("EXP-SW-0401-8K") as { technicalProfile?: { io?: { ports?: unknown[] }; governedSpecification?: { inputCount?: number; outputCount?: number } } };
    expect(twoIn.technicalProfile?.governedSpecification?.inputCount).toBe(2);
    expect(fourIn.technicalProfile?.governedSpecification?.inputCount).toBe(4);
    expect((twoIn.technicalProfile?.io?.ports ?? []).length).toBeGreaterThan(0);
    expect((fourIn.technicalProfile?.io?.ports ?? []).length).toBeGreaterThan(0);
  });

  it("index generator force-demotes every detected range/family page to review-required with no spec claims", () => {
    // The generator (tools/generate-product-intelligence-index.mjs) must detect
    // range/family pages - by SKU placeholder token (0X) or explicit
    // family/range wording - and strip their spec claims even if a source
    // record ever regresses to active/primary-hardware. check-classification-
    // consistency.mjs hard-fails regeneration if any detected range page
    // presents ports, features, connectors or a non-review lifecycle.
    const root = index as { products?: Array<Record<string, unknown>> };
    const products = Array.isArray(root.products) ? root.products : [];
    const rangePages = products.filter((product) => {
      const sku = String(product.sku ?? "").toUpperCase();
      if (/\b0X\d/i.test(sku)) return true;
      const text = [product.name, product.title, product.description, product.summary].map(String).join(" ");
      return /(\(family\)|family reference|range page|range reference|family page|not an orderable sku|shared family page|range placeholder)/i.test(text);
    });

    expect(rangePages.map((p) => p.sku).sort()).toEqual(["SW-0X01-8K", "SW-130-TX"]);

    for (const product of rangePages) {
      expect(product.lifecycleStatus).toBe("review");
      expect(product.commercialRole).toBe("review-required");
      expect((product.features ?? [])).toEqual([]);
      expect((product.connectors ?? [])).toEqual([]);
      expect((product.technologies ?? [])).toEqual([]);
      expect((product.applications ?? [])).toEqual([]);
      const profile = (product.technicalProfile ?? {}) as {
        io?: { ports?: unknown[] };
        usb?: { present?: boolean };
        transports?: string[];
        governedSpecification?: { status?: string } | null;
      };
      expect((profile.io?.ports ?? []).length).toBe(0);
      expect(profile.usb?.present ?? false).toBe(false);
      expect(profile.transports ?? []).toEqual([]);
      expect(profile.governedSpecification?.status).toBe("review-required");
      // No variant-specific claims may leak into search terms either.
      const searchTerms = ((product.searchTerms as string[] | undefined) ?? []).map(String).join(" ");
      expect(searchTerms).not.toMatch(/USB 3\.x|Video Wall|Dolby|RX-500/);
    }
  });
});
