import { describe, expect, it } from "vitest";

import { findCatalogProductBySku, getCatalogProducts } from "@/catalog";
import { buildWyrestormSeedCatalogProducts } from "@/catalog/seedCatalog";

describe("wyrestorm seed catalog", () => {
  it("expands the local fallback catalog from the SKU master list", () => {
    const products = buildWyrestormSeedCatalogProducts();

    expect(products.length).toBeGreaterThan(100);

    const apollo = products.find((item) => item.sku === "APO-VX20-UC");
    expect(apollo).toBeDefined();
    expect(apollo?.family).toBe("Apollo");
    expect(apollo?.video?.maxResolution).toContain("4K");
  });

  it("surfaces expanded seed products through the main catalog repository", () => {
    const products = getCatalogProducts();

    expect(products.length).toBeGreaterThan(100);
    expect(findCatalogProductBySku("AMP-260-DNT")?.sku).toBe("AMP-260-DNT");
  });
});
