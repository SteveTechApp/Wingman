import { describe, expect, it } from "vitest";
import type { ProductIntelligenceRecord } from "../data/productIntelligenceRepository";
import { matchesProductFilters, productQualityIssues, qualityCounts, recordConfidence } from "./productDataQuality";

const base: ProductIntelligenceRecord = { vendorType: "wyrestorm", brand: "WyreStorm", sku: "MX-1", name: "Matrix", family: "Matrix", category: "Matrix", summary: "", status: "approved", lifecycle: "live", inputs: [{ type: "HDMI", count: 2 }], outputs: [{ type: "HDMI", count: 1 }], mirroredOutputs: [{ type: "HDMI", count: 1 }], features: [], evidence: [] };

describe("governed product data quality", () => {
  it("keeps routed and mirrored quantities separate and unknown booleans unknown", () => {
    const record = { ...base, productTruth: { videoOutput: { routedQuantity: 1, mirroredHdmiQuantity: 1 }, videoCapability: { multiview: null } } };
    expect(record.productTruth.videoOutput).toEqual({ routedQuantity: 1, mirroredHdmiQuantity: 1 });
    expect(record.productTruth.videoCapability?.multiview).toBeNull();
  });
  it("detects quality issues and filters across identity and governance", () => {
    expect(productQualityIssues(base)).toEqual(expect.arrayContaining(["missing-video-capability", "never-verified"]));
    expect(qualityCounts([base])["missing-io-topology"]).toBeUndefined();
    expect(matchesProductFilters(base, { query: "mx-1", confidence: "requires-review" })).toBe(true);
    expect(recordConfidence({ ...base, confidence: .2 })).toBe("low");
  });
});
