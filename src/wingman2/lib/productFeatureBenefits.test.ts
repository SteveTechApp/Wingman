import { describe, expect, it } from "vitest";
import { buildProductFeatureBenefits, type ProductSpec } from "./productStoryEngine";

function spec(overrides: Partial<ProductSpec>): ProductSpec {
  return {
    sku: "TEST-SKU",
    name: "Test product",
    family: "WyreStorm",
    category: "AV product",
    productType: "AV product",
    description: "",
    purpose: "",
    summary: "",
    keyFeatures: [],
    applications: [],
    ioSummary: [],
    video: [],
    audio: [],
    usb: [],
    network: [],
    control: [],
    power: [],
    physical: [],
    checks: [],
    related: [],
    capabilityTags: [],
    ...overrides,
  } as ProductSpec;
}

describe("buildProductFeatureBenefits - per-SKU accuracy", () => {
  it("translates real per-SKU capabilities into plain customer benefits", () => {
    const benefits = buildProductFeatureBenefits(
      spec({ video: ["Maximum presentation format: 4K60 4:4:4", "HDR10 and Dolby Vision", "ARC on all HDMI outputs"] }),
    );
    const joined = benefits.join(" ");
    expect(joined).toMatch(/4K60 - a sharp/);
    expect(joined).toMatch(/4:4:4 - crisp text/);
    expect(joined).toMatch(/Dolby Vision - richer contrast/i);
    // Benefit, not a spec token echo.
    expect(joined).not.toMatch(/Headline capability|practical hooks/i);
  });

  it("does NOT invent capabilities from the family-level capabilityTags soup", () => {
    // A 4K30 NetworkHD encoder whose capabilityTags carry family tags it does not
    // itself have (8K / Video Wall / USB-C power delivery). Benefits must come
    // only from the resolved per-SKU video/audio spec.
    const benefits = buildProductFeatureBenefits(
      spec({
        video: ["Maximum 3840x2160p @ 30Hz, 4:2:0 8-bit", "H.264/H.265 encoding"],
        capabilityTags: ["HDMI 2.1 / 8K", "Video Wall", "USB-C power delivery", "DSP audio processing"],
      }),
    );
    const joined = benefits.join(" ");
    expect(joined).not.toMatch(/8K/);
    expect(joined).not.toMatch(/spread across a group of screens/); // no phantom video wall
    expect(joined).not.toMatch(/walk up and connect/); // no phantom USB-C input
  });

  it("never sells USB-C power delivery / PoC as a USB-C video-and-data input", () => {
    const benefits = buildProductFeatureBenefits(
      spec({ video: ["HDBaseT 4K60", "USB-C power delivery", "Bi-directional PoC"] }),
    );
    expect(benefits.join(" ")).not.toMatch(/walk up and connect/);
  });

  it("does surface a genuine USB-C video input as a benefit", () => {
    const benefits = buildProductFeatureBenefits(
      spec({ video: ["USB-C video input", "Maximum stated format: 4K60 4:4:4"] }),
    );
    expect(benefits.join(" ")).toMatch(/USB-C - one cable for video/);
  });
});
