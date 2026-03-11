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

  it("classifies key WyreStorm SKUs into specific product types", () => {
    const expectType = (sku: string, category: string, subcategory: string) => {
      const product = findCatalogProductBySku(sku);
      expect(product?.category).toBe(category);
      expect(product?.subcategory).toBe(subcategory);
      return product;
    };

    expectType("EXP-SP-0102-8K", "Distribution", "Splitter");
    expectType("EX-100-H2", "Extender", "Extender Kit");
    expectType("EXP-MX-0402-H2", "Matrix", "Matrix Switch");
    expectType("NHD-510-TX", "AVoIP", "AVoIP Encoder");
    expectType("NHD-610-RX", "AVoIP", "AVoIP Decoder");
    expectType("NHD-CTL-PRO-V2", "Control", "AVoIP Controller");
    expectType("APO-COM-MIC", "Audio", "USB Microphone");
    expectType("AMP-260-DNT", "Audio", "Dante Amplifier");
    expectType("CAM-210-PTZ", "Camera", "PTZ Camera");
    expectType("CAM-210-NDI-PTZ", "Camera", "NDI Camera");
    expectType("HALO-VX10-V2", "UC", "UC Soundbar");
    expectType("SW-640L-TX-W", "Switcher", "Multi Format Presentation Switcher");
    expectType("APO-DG2", "Accessories", "USB Casting Dongle");
    expectType("FOCUS 200 PRO", "Camera", "Webcam");
  });

  it("adds normalized type tags used by search and matching", () => {
    expect(findCatalogProductBySku("SW-640L-TX-W")?.normalizedTags).toContain("wireless-casting");
    expect(findCatalogProductBySku("CAM-210-PTZ")?.normalizedTags).toContain("streaming-camera");
    expect(findCatalogProductBySku("CAM-210-NDI-PTZ")?.normalizedTags).toContain("ndi-camera");
  });
});
