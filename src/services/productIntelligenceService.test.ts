import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import {
  fetchProductIntelligenceRecords,
  flagProductIntelligenceRecord,
  setProductIntelligenceRecordArchived,
  upsertProductIntelligenceRecord,
} from "@/services/productIntelligenceService";

function createMemoryStorage(): Storage {
  const state = new Map<string, string>();
  return {
    get length() {
      return state.size;
    },
    clear() {
      state.clear();
    },
    getItem(key: string) {
      return state.has(key) ? state.get(key)! : null;
    },
    key(index: number) {
      return Array.from(state.keys())[index] ?? null;
    },
    removeItem(key: string) {
      state.delete(key);
    },
    setItem(key: string, value: string) {
      state.set(String(key), String(value));
    },
  };
}

describe("product intelligence service", () => {
  const localStorage = createMemoryStorage();

  beforeAll(() => {
    vi.stubGlobal("window", { localStorage });
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    localStorage.clear();
  });

  it("preserves explicit WyreStorm category and subcategory labels from the source catalog", async () => {
    const result = await fetchProductIntelligenceRecords({
      vendorType: "wyrestorm",
      sku: "RX-35-POH",
      limit: 10,
    });

    const record = result.records[0];
    expect(record).toBeTruthy();
    expect(record.category).toBe("Receiver");
    expect(record.subcategory).toBe("HDBaseT Receiver");
    expect(record.classificationSource).toBe("source");
    expect(record.group).toBe("extender");
  });

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

  it("applies local admin overrides, review flags, and archive state to the fetched records", async () => {
    localStorage.clear();

    await upsertProductIntelligenceRecord({
      vendorType: "wyrestorm",
      brand: "WyreStorm",
      sku: "RX-35-POH",
      family: "HDBaseT",
      name: "35m 4K HDBaseT Receiver",
      group: "extender",
      category: "Receiver",
      subcategory: "HDBaseT Receiver",
      summary: "Updated locally for admin review.",
      classificationSource: "manual",
    });

    await flagProductIntelligenceRecord({
      vendorType: "wyrestorm",
      brand: "WyreStorm",
      sku: "RX-35-POH",
      message: "Category should stay under receiver hardware.",
      source: "test",
      createdBy: "vitest",
    });

    let result = await fetchProductIntelligenceRecords({
      vendorType: "wyrestorm",
      sku: "RX-35-POH",
      includeArchived: true,
      limit: 10,
    });

    expect(result.records[0]?.classificationSource).toBe("manual");
    expect(result.records[0]?.reviewFlags.some((flag) => flag.message.includes("receiver hardware"))).toBe(true);

    await setProductIntelligenceRecordArchived({
      vendorType: "wyrestorm",
      brand: "WyreStorm",
      sku: "RX-35-POH",
      archived: true,
      note: "Archived in test",
      reviewedBy: "vitest",
    });

    result = await fetchProductIntelligenceRecords({
      vendorType: "wyrestorm",
      sku: "RX-35-POH",
      limit: 10,
    });
    expect(result.records).toHaveLength(0);

    result = await fetchProductIntelligenceRecords({
      vendorType: "wyrestorm",
      sku: "RX-35-POH",
      includeArchived: true,
      limit: 10,
    });
    expect(result.records[0]?.archived).toBe(true);
  });
});
