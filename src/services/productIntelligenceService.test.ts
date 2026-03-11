import { describe, expect, it } from "vitest";

import { fetchProductIntelligenceRecords } from "@/services/productIntelligenceService";

describe("product intelligence service", () => {
  it("uses the expanded fallback seed when no live endpoint is configured", async () => {
    const result = await fetchProductIntelligenceRecords({
      vendorType: "wyrestorm",
      limit: 5000,
    });

    expect(result.records.length).toBeGreaterThan(100);
    expect(result.records.some((record) => record.sku === "APO-VX20-UC")).toBe(true);
  });
});
