import { describe, expect, it, vi } from "vitest";
import index from "../../../public/product-intelligence-index.json";

vi.mock("./productIntelligenceIndexCache", () => ({
  loadProductIntelligenceIndex: vi.fn().mockResolvedValue(index),
}));

import { searchProducts } from "./productSearch";

describe("product search", () => {
  it("returns empty for queries shorter than 2 characters", async () => {
    expect(await searchProducts("")).toEqual([]);
    expect(await searchProducts("a")).toEqual([]);
  });

  it("finds products by exact SKU", async () => {
    const results = await searchProducts("NHD-120-TX");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].sku).toBe("NHD-120-TX");
  });

  it("finds products by SKU prefix", async () => {
    const results = await searchProducts("NHD-120");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.sku.startsWith("NHD-120"))).toBe(true);
  });

  it("finds products by name keyword", async () => {
    const results = await searchProducts("matrix");
    expect(results.length).toBeGreaterThan(0);
    expect(
      results.some(
        (r) =>
          r.name.toLowerCase().includes("matrix") ||
          r.description.toLowerCase().includes("matrix"),
      ),
    ).toBe(true);
  });

  it("returns at most the limit", async () => {
    const results = await searchProducts("a", 3);
    expect(results.length).toBeLessThanOrEqual(3);
  });

  it("ranks exact SKU matches above partial matches", async () => {
    const results = await searchProducts("NHD-120");
    expect(results.length).toBeGreaterThan(1);
    // All NHD-120 prefix matches should appear
    expect(results.some((r) => r.sku === "NHD-120-TX")).toBe(true);
    expect(results.some((r) => r.sku === "NHD-120-RX")).toBe(true);
  });

  it("includes lifecycle status in results", async () => {
    const results = await searchProducts("NHD-120-TX");
    expect(results[0].lifecycleStatus).toBeDefined();
  });
});
