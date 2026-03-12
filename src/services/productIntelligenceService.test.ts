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

  it("builds richer fallback evidence for seeded competitor records", async () => {
    const result = await fetchProductIntelligenceRecords({
      vendorType: "competitor",
      limit: 5000,
    });

    const kramer = result.records.find((record) => record.brand === "Kramer" && record.sku === "KDS-EN7");
    const atlona = result.records.find((record) => record.brand === "Atlona" && record.sku === "AT-OME-MS52W");
    const extron = result.records.find((record) => record.brand === "Extron" && record.sku === "NAV-E-121");
    const zeevee = result.records.find((record) => record.brand === "ZeeVee" && record.sku === "ZY-4K-ENC");

    expect(result.records.length).toBeGreaterThanOrEqual(46);
    expect(kramer).toBeTruthy();
    expect(kramer?.sourceUrls[0]).toContain("kramerav.com");
    expect(kramer?.evidence.length).toBeGreaterThanOrEqual(4);
    expect(kramer?.inputs.some((port) => port.type === "USB 2.0" && port.count === 1)).toBe(true);

    expect(atlona).toBeTruthy();
    expect(atlona?.inputs.some((port) => port.type === "USB-C" && port.count === 1)).toBe(true);
    expect(atlona?.features).toContain("Wireless presentation");
    expect(atlona?.sourceUrls[0]).toContain("atlona.com");

    expect(extron).toBeTruthy();
    expect(extron?.video?.hdmi).toBe("2.0b");
    expect(extron?.video?.bandwidthGbps).toBe(18);
    expect(extron?.latency).toBe("subframe");
    expect(extron?.evidence.some((entry) => entry.label === "Catalog Video Profile")).toBe(true);
    expect(extron?.evidence.some((entry) => entry.label === "Catalog Latency Class")).toBe(true);

    expect(zeevee).toBeTruthy();
    expect(zeevee?.latency).toContain("zero");
    expect(zeevee?.sourceUrls[0]).toContain("zeevee.com");
  });
});
