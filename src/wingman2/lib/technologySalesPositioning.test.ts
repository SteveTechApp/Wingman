import { describe, expect, it } from "vitest";
import type { ProductSpec } from "./productStoryEngine";
import { buildTechnologySalesPositioning, buildTechnologySpeakingCues } from "./technologySalesPositioning";

function product(overrides: Partial<ProductSpec>): ProductSpec {
  return {
    sku: "TEST",
    name: "Test product",
    family: "WyreStorm",
    category: "AV",
    productType: "Product",
    description: "",
    purpose: "",
    summary: "",
    keyFeatures: [], applications: [], ioSummary: [], video: [], audio: [], usb: [], network: [], control: [], power: [], physical: [], checks: [], related: [],
    ...overrides,
  };
}

describe("technology sales positioning", () => {
  it("frames SDVoE around application consequences and honest 10G trade-offs", () => {
    const result = buildTechnologySalesPositioning(product({ sku: "NHD-600-TRX", productType: "10GbE SDVoE transceiver" }));
    expect(result?.kind).toBe("sdvoe");
    expect(result?.tradeOff).toContain("10GbE");
    expect(result?.prompts.some((prompt) => prompt.customerSays.includes("IPMX"))).toBe(true);
  });

  it("distinguishes JPEG 2000 positioning from long-GOP bandwidth positioning", () => {
    expect(buildTechnologySalesPositioning(product({ productType: "NetworkHD 500 JPEG 2000 encoder" }))?.kind).toBe("jpeg2000");
    expect(buildTechnologySalesPositioning(product({ productType: "H.265 AV-over-IP encoder" }))?.kind).toBe("long-gop");
  });

  it("stays out of unrelated product workspaces", () => {
    expect(buildTechnologySalesPositioning(product({ productType: "HDMI matrix" }))).toBeNull();
  });

  it("turns scripted objection copy into glanceable speaking cues", () => {
    const cues = buildTechnologySpeakingCues({
      customerSays: "Why 10G?",
      response: "That is a fair question. The choice is about user experience. Use 10G only when delay affects the work.",
      askNext: "How much delay is acceptable?",
    });
    expect(cues.map((cue) => cue.label)).toEqual(["Acknowledge", "Reframe", "Position"]);
    expect(cues[0]?.text).toBe("That is a fair question.");
  });
});
