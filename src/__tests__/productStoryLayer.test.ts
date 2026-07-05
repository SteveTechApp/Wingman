import { describe, expect, it } from "vitest";
import { PRODUCT_STORIES, getProductStory, productStoryRelatedText } from "../wingman2/data/productStories";
import { applyProductStoryToSpec, buildProductNarrative, type ProductSpec } from "../wingman2/lib/productStoryEngine";

const prioritySkus = [
  "NHD-0401-MV",
  "NHD-150-RX",
  "NHD-124-TX",
  "NHD-CTL-PRO-V2",
  "NHD-500-TX",
  "NHD-500-RX",
  "NHD-600-TRX",
  "APO-VX20-UC-V2",
  "APO-DG2",
  "SYN-TOUCH10-V2",
  "SW-0206-VW",
  "SW-0204-VW",
  "SW-620-TX-W",
  "SW-640-TX-W",
];

function baseProduct(sku: string): ProductSpec {
  return {
    sku,
    name: sku,
    family: "WyreStorm",
    category: "Product",
    productType: "Product",
    description: "Generic product description.",
    purpose: "Generic product purpose.",
    summary: "Generic product summary.",
    keyFeatures: ["Generic feature"],
    applications: ["Generic application"],
    ioSummary: ["Generic I/O"],
    video: ["Video path to confirm"],
    audio: ["Audio path to confirm"],
    usb: ["USB path to confirm"],
    network: ["Network path to confirm"],
    control: ["Control path to confirm"],
    power: ["Power path to confirm"],
    physical: ["Physical details to confirm"],
    checks: ["Generic check"],
    related: [],
  };
}

describe("product story layer", () => {
  it("covers the priority sales-positioning SKUs", () => {
    expect(PRODUCT_STORIES.length).toBeGreaterThanOrEqual(prioritySkus.length);

    for (const sku of prioritySkus) {
      const story = getProductStory(sku);

      expect(story, `${sku} should have a product story`).toBeTruthy();
      expect(story?.oneLinePosition.length, `${sku} one-line position`).toBeGreaterThan(40);
      expect(story?.whatItIs.length, `${sku} whatItIs`).toBeGreaterThan(60);
      expect(story?.whatItDoes.length, `${sku} whatItDoes`).toBeGreaterThan(60);
      expect(story?.salesTalkTrack.length, `${sku} salesTalkTrack`).toBeGreaterThan(60);
      expect(story?.worksWith.length, `${sku} worksWith`).toBeGreaterThan(0);
      expect(story?.discoveryQuestions.length, `${sku} discoveryQuestions`).toBeGreaterThanOrEqual(3);
      expect(story?.quoteChecks.length, `${sku} quoteChecks`).toBeGreaterThanOrEqual(3);
    }
  });

  it("captures partner-product relationships that sales users need", () => {
    expect(productStoryRelatedText(getProductStory("APO-VX20-UC-V2")!).join(" ")).toContain("APO-DG2");
    expect(productStoryRelatedText(getProductStory("NHD-150-RX")!).join(" ")).toContain("NHD-124-TX");
    expect(productStoryRelatedText(getProductStory("NHD-150-RX")!).join(" ")).toContain("NHD-CTL-PRO");
    expect(productStoryRelatedText(getProductStory("SW-620-TX-W")!).join(" ")).toContain("SYN-TOUCH10");
    expect(productStoryRelatedText(getProductStory("NHD-500-TX")!).join(" ")).toContain("NHD-0401-MV");
    expect(productStoryRelatedText(getProductStory("NHD-600-TRX")!).join(" ")).toContain("NHD-CTL-PRO");
  });

  it("overrides generic Product Pitch narrative with product-specific sales wording", () => {
    const enriched = applyProductStoryToSpec(baseProduct("NHD-600-TRX"));
    const narrative = buildProductNarrative(enriched);

    expect(enriched.family).toBe("NetworkHD 600");
    expect(enriched.related.join(" ")).toContain("NHD-CTL-PRO");
    expect(narrative.headline).toContain("high-performance 10G NetworkHD");
    expect(narrative.suggestedWording).toContain("10G high-performance AV-over-IP");
    expect(narrative.avoidIf).toContain("Do not lead with 600");
  });

  it("positions NetworkHD 500 as premium 1GbE rather than generic AVoIP", () => {
    const enriched = applyProductStoryToSpec(baseProduct("NHD-500-TX"));
    const narrative = buildProductNarrative(enriched);

    expect(enriched.family).toBe("NetworkHD 500");
    expect(narrative.headline).toContain("premium 1GbE");
    expect(narrative.whyCustomerCares).toContain("NetworkHD 500 is the premium 1GbE");
    expect(narrative.avoidIf).toContain("Do not use it for a simple one-source one-display extension job");
  });

  it("resolves active SKU aliases to the same product story", () => {
    expect(getProductStory("APO-VX20-UC")?.sku).toBe("APO-VX20-UC-V2");
  });
});
