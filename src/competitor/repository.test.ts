import { describe, expect, it } from "vitest";

import { classifyCatalogProduct } from "@/catalog/classification";
import { findCompetitorBySku, getCompetitorProducts } from "@/competitor/repository";

function countByBrand(): Record<string, number> {
  return getCompetitorProducts().reduce<Record<string, number>>((acc, product) => {
    const brand = String(product.brand || "").trim();
    if (!brand) return acc;
    acc[brand] = (acc[brand] || 0) + 1;
    return acc;
  }, {});
}

describe("competitor repository", () => {
  it("ships expanded seeded coverage across the active competitor manufacturers", () => {
    const products = getCompetitorProducts();
    const counts = countByBrand();

    expect(products.length).toBeGreaterThanOrEqual(46);
    expect(counts.Atlona).toBeGreaterThanOrEqual(6);
    expect(counts.Barco).toBeGreaterThanOrEqual(5);
    expect(counts.Blustream).toBeGreaterThanOrEqual(7);
    expect(counts.Crestron).toBeGreaterThanOrEqual(8);
    expect(counts.Extron).toBeGreaterThanOrEqual(6);
    expect(counts.Kramer).toBeGreaterThanOrEqual(6);
    expect(counts.Lightware).toBeGreaterThanOrEqual(4);
    expect(counts.ZeeVee).toBeGreaterThanOrEqual(4);
    expect(products.every((product) => typeof product.sourceUrl === "string" && product.sourceUrl.length > 0)).toBe(true);

    const keys = new Set(
      products.map((product) => `${String(product.brand || "").trim().toLowerCase()}::${product.sku}`),
    );
    expect(keys.size).toBe(products.length);
  });

  it("stores richer source-backed I/O detail for seeded competitor products", () => {
    const matrix = findCompetitorBySku("VS-88H2A");
    const switcher = findCompetitorBySku("AT-OME-MS52W");
    const dongle = findCompetitorBySku("CLICKSHARE-BUTTON-5TH-GEN");
    const controller = findCompetitorBySku("NAVIGATOR");
    const splitter = findCompetitorBySku("HD-DA2-4KZ-E");
    const soundbar = findCompetitorBySku("CLICKSHARE-BAR-PRO");

    expect(matrix?.outputs?.some((port) => port.type === "HDMI" && port.count === 8)).toBe(true);
    expect(matrix?.sourceUrl).toContain("kramerav.com");
    expect(switcher?.features).toContain("Wireless presentation");
    expect(switcher?.inputs?.some((port) => port.type === "USB-C" && port.count === 1)).toBe(true);
    expect(classifyCatalogProduct(dongle || {}).label).toBe("USB Casting Dongle");
    expect(classifyCatalogProduct(controller || {}).label).toBe("AVoIP Controller");
    expect(classifyCatalogProduct(splitter || {}).label).toBe("Splitter");
    expect(classifyCatalogProduct(soundbar || {}).label).toBe("UC Soundbar");
  });
});
