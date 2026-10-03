import { readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";

const summaryPath = "public/product-intelligence-summary.json";
const detailsPath = "public/product-intelligence-details.json";

describe("product intelligence delivery artifacts", () => {
  it("keeps the initial catalogue summary below 3.5 MB and defers heavyweight fields", () => {
    const summary = JSON.parse(readFileSync(summaryPath, "utf8"));
    expect(statSync(summaryPath).size).toBeLessThan(3_500_000);
    expect(summary.products.length).toBeGreaterThan(300);
    expect(summary.products.every((product: Record<string, unknown>) =>
      !("technicalProfile" in product) && !("salesLanguage" in product)
    )).toBe(true);
  });

  it("retains deferred detail records keyed by normalized SKU", () => {
    const manifest = JSON.parse(readFileSync(detailsPath, "utf8"));
    const entries = Object.entries(manifest.products) as Array<[string, { path: string; bytes: number }]>;
    expect(entries.length).toBeGreaterThan(300);
    expect(statSync(detailsPath).size).toBeLessThan(100_000);
    for (const [key, entry] of entries) {
      expect(key).toMatch(/^[A-Z0-9]+$/);
      expect(entry.path).toBe(`/product-intelligence-details/${key.toLowerCase()}.json`);
      expect(entry.bytes).toBeLessThan(100_000);
      const record = JSON.parse(readFileSync(`public${entry.path}`, "utf8"));
      expect(record._quality.completenessPercent).toBeGreaterThan(0);
      expect(record._quality.presentSections.length + record._quality.missingSections.length).toBe(4);
    }
  });
});
