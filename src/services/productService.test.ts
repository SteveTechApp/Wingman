import { describe, expect, it } from "vitest";

import { suggestProducts } from "./productService";

describe("productService", () => {
  it("returns real prompt-only suggestions when topology has not been captured yet", async () => {
    const result = await suggestProducts(
      "Need a distributed AVoIP encoder and decoder system for multiple displays with multicast routing.",
    );

    expect(result.recommendations[0]?.sku).not.toBe("UNKNOWN");
    expect(result.recommendations.some((item) => item.family === "AVoIP")).toBe(true);
    expect(result.recommendations.map((item) => item.sku)).toEqual(
      expect.arrayContaining(["NHD-500-TX", "NHD-500-E-RX"]),
    );
  });

  it("keeps the unknown fallback when neither prompt signals nor topology data are available", async () => {
    const result = await suggestProducts("");

    expect(result.recommendations).toHaveLength(1);
    expect(result.recommendations[0]?.sku).toBe("UNKNOWN");
  });
});
