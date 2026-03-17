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

    expect(products.length).toBeGreaterThanOrEqual(56);
    expect(counts.Atlona).toBeGreaterThanOrEqual(7);
    expect(counts.Barco).toBeGreaterThanOrEqual(5);
    expect(counts.Blustream).toBeGreaterThanOrEqual(8);
    expect(counts.Crestron).toBeGreaterThanOrEqual(10);
    expect(counts.Extron).toBeGreaterThanOrEqual(11);
    expect(counts.Kramer).toBeGreaterThanOrEqual(6);
    expect(counts.Lightware).toBeGreaterThanOrEqual(5);
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
    const avoipDecoder = findCompetitorBySku("IP300UHD-RX");
    const legacyMatrix = findCompetitorBySku("DM-MD8X8");
    const seedSwitcher = findCompetitorBySku("DTP T USW 233");
    const legacyEndpoint = findCompetitorBySku("NAV SD 501");

    expect(matrix?.outputs?.some((port) => port.type === "HDMI" && port.count === 8)).toBe(true);
    expect(matrix?.sourceUrl).toContain("kramerav.com");
    expect(switcher?.features).toContain("Wireless presentation");
    expect(switcher?.inputs?.some((port) => port.type === "USB-C" && port.count === 1)).toBe(true);
    expect(classifyCatalogProduct(dongle || {}).label).toBe("USB Casting Dongle");
    expect(classifyCatalogProduct(controller || {}).label).toBe("AVoIP Controller");
    expect(classifyCatalogProduct(splitter || {}).label).toBe("Splitter");
    expect(classifyCatalogProduct(soundbar || {}).label).toBe("UC Soundbar");
    expect(classifyCatalogProduct(avoipDecoder || {}).label).toBe("AVoIP Decoder");
    expect(legacyMatrix?.sourceUrl).toContain("crestron.com");
    expect(seedSwitcher?.sourceUrl).toContain("extron.com");
    expect(legacyEndpoint?.video?.maxResolution).toBe("4K60");
  });
});
