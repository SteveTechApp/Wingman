import { describe, expect, it } from "vitest";

import { buildProductNarrative, type ProductSpec } from "./productStoryEngine";

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

describe("narrative provenance and headline honesty", () => {
  it("flags a thin, unclassified record as low confidence with a verify-before-quoting note", () => {
    const narrative = buildProductNarrative(spec({ sku: "ZZZ-UNKNOWN-1" }));

    expect(narrative.confidence).toBe("low");
    expect(narrative.reviewNote).toMatch(/before quoting/i);
  });

  it("does not echo an empty placeholder purpose or use banned scripted wording", () => {
    const narrative = buildProductNarrative(spec({ sku: "ZZZ-UNKNOWN-2" }));

    // The old fallback repeated "Product description not yet available" back as if
    // it were a requirement, and leaned on a scripted line the style guide bans.
    expect(narrative.whatItIs).not.toMatch(/not yet available/i);
    expect(narrative.customerChallenge).not.toMatch(/not yet available/i);
    expect(narrative.whyCustomerCares).not.toMatch(/buy outcomes, not boxes/i);
  });

  it("builds the lead headline from structured specs, not specs scraped from prose", () => {
    // The description prose names 4K60 (belonging to a companion product), but the
    // product's own structured spec is 1080p60. The headline must not front 4K60.
    const narrative = buildProductNarrative(
      spec({
        sku: "ZZZ-AVOIP-1",
        description: "Cost-effective encoder. Pairs with our 4K60 4:4:4 decoder for premium walls.",
        keyFeatures: ["1080p60 encoding"],
        video: ["1080p60"],
        applications: ["Signage distribution"],
        purpose: "Encode a source onto a cost-effective AV-over-IP network.",
      }),
    );

    expect(narrative.headline).toMatch(/1080p60/);
    expect(narrative.headline).not.toMatch(/4K60/);
  });

  it("marks a well-described but ungoverned product as medium confidence", () => {
    const narrative = buildProductNarrative(
      spec({
        sku: "CAM-999-XYZ",
        description: "4K PTZ conference camera with optical zoom.",
        productType: "PTZ camera",
        purpose: "Controllable room camera with more reach than a fixed webcam.",
        keyFeatures: ["4K30", "Optical zoom"],
        video: ["4K30"],
        applications: ["Meeting room / UC"],
      }),
    );

    expect(narrative.confidence).toBe("medium");
    expect(narrative.reviewNote).toMatch(/datasheet/i);
  });

  it("treats a governed product story as high confidence with no review note", () => {
    const narrative = buildProductNarrative(spec({ sku: "NHD-500-TX" }));

    expect(narrative.confidence).toBe("high");
    expect(narrative.reviewNote).toBeUndefined();
  });
});
