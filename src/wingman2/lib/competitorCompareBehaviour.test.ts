import { describe, expect, it } from "vitest";
import rawProductIndex from "../../../public/product-intelligence-index.json";
import { normaliseCompareProducts, runCompareRuntimePipeline } from "./compareRuntimePipeline";

type AnyRecord = Record<string, any>;

const products: AnyRecord[] = normaliseCompareProducts(rawProductIndex);

function sku(value: AnyRecord | undefined): string {
  return String(value?.sku ?? value?.wyrestorm?.sku ?? "").toUpperCase();
}

function skus(items: AnyRecord[] | undefined): string[] {
  return (items ?? []).map((item) => sku(item)).filter(Boolean);
}

function expectNoSupportItemsInLeadResults(result: AnyRecord): void {
  const leadSkus = skus(result.matches).slice(0, 5);

  expect(leadSkus.some((item) => /^CAB-/.test(item))).toBe(false);
  expect(leadSkus.some((item) => /^CAM-/.test(item))).toBe(false);
  expect(leadSkus.some((item) => /^APO-/.test(item))).toBe(false);
  expect(leadSkus.some((item) => item.includes("RACK"))).toBe(false);
  expect(leadSkus.some((item) => item.includes("CTL"))).toBe(false);
}

describe("competitor compare runtime behaviour", () => {
  it("loads real product records from the public product intelligence index", () => {
    const loadedSkus = skus(products);

    expect(products.length).toBeGreaterThan(250);
    expect(loadedSkus).toContain("NHD-0401-MV");
    expect(loadedSkus).toContain("NHD-150-RX");
    expect(loadedSkus).toContain("SW-0206-VW");
  });

  it("keeps exact Crestron DM-NVX input as verified-profile and returns NetworkHD-style candidates", () => {
    const result = runCompareRuntimePipeline("DMNVX350", products, "Crestron", 12);

    expect(result.competitor.brand).toBe("Crestron");
    expect(result.competitor.specTier).toBe("verified-profile");
    expect(result.matches.length).toBeGreaterThan(0);
    expect(sku(result.matches[0])).toMatch(/^NHD-/);
    expectNoSupportItemsInLeadResults(result);
  });

  it("keeps family-level Crestron DM-NVX input as family-rule rather than false verified-profile", () => {
    const result = runCompareRuntimePipeline("DMNVX", products, "Crestron", 12);

    expect(result.competitor.brand).toBe("Crestron");
    expect(result.competitor.specTier).toBe("family-rule");
    expect(["PARTIAL MATCH", "VERIFY"]).toContain(result.topOutcome);
    expect(result.nextSteps.some((step: string) => step.toLowerCase().includes("datasheet"))).toBe(true);
  });

  it("keeps decoder requests away from transmitter-only or support-item lead candidates", () => {
    const result = runCompareRuntimePipeline("NAV D 121", products, "Extron", 12);
    const leadSkus = skus(result.matches).slice(0, 5);

    expect(result.competitor.brand).toBe("Extron");
    expect(leadSkus.length).toBeGreaterThan(0);
    expectNoSupportItemsInLeadResults(result);
    expect(leadSkus.some((item) => /-RX\b|TRX\b/.test(item))).toBe(true);
    expect(leadSkus[0]).not.toMatch(/-TX\b/);
  });

  it("keeps compact 4x2 matrix requests ahead of oversized 8x8 matrix package options", () => {
    const result = runCompareRuntimePipeline("MMX4x2-HDMI", products, "Lightware", 12);
    const leadSkus = skus(result.matches).slice(0, 4);

    expect(result.competitor.brand).toBe("Lightware");
    expect(result.competitor.inputCount).toBe(4);
    expect(result.competitor.outputCount).toBe(2);
    expect(leadSkus[0]).not.toBe("MX-0808-KIT-V2");
    expect(leadSkus.some((item) => item.includes("0402") || item.includes("4X2"))).toBe(true);
  });

  it("keeps Lightware MMX6x2 requests as 6x2 matrix jobs and does not lead with undersized 4x2 products", () => {
    const result = runCompareRuntimePipeline("MMX6x2-HT200", products, "Lightware", 12);
    const leadSkus = skus(result.matches).slice(0, 4);

    expect(result.competitor.brand).toBe("Lightware");
    expect(result.competitor.sku).toBe("MMX6x2-HT200");
    expect(result.competitor.inputCount).toBe(6);
    expect(result.competitor.outputCount).toBe(2);
    expect(leadSkus.length).toBeGreaterThan(0);
    expect(leadSkus[0]).not.toMatch(/0402|0403/);
  });

  it("returns WyreStorm 4x4 matrix options for Blustream HMX44 instead of a no-matrix dead end", () => {
    const result = runCompareRuntimePipeline("HMX44-18G-KIT", products, "Blustream", 12);
    const leadSkus = skus(result.matches).slice(0, 4);

    expect(result.competitor.brand).toBe("Blustream");
    expect(result.competitor.sku).toBe("HMX44-18G-KIT");
    expect(result.topOutcome).not.toBe("NONE");
    expect(leadSkus.length).toBeGreaterThan(0);
    expect(leadSkus.some((item) => item.includes("0404"))).toBe(true);
    expect(String(result.recommendation)).not.toMatch(/No safe direct WyreStorm equivalent/i);
  });

  it("leads dedicated video wall processor requests with dedicated wall processors before generic AVoIP products", () => {
    const result = runCompareRuntimePipeline("dedicated LCD video wall processor", products, undefined, 12);
    const leadSkus = skus(result.matches).slice(0, 4);

    expect(leadSkus.length).toBeGreaterThan(0);
    expect(leadSkus[0]).toMatch(/^SW-020[46]-VW$/);
    expect(leadSkus.some((item) => item === "NHD-000-CTL" || item.includes("RACK"))).toBe(false);
  });

  it("treats multiview as single-output multi-source canvas, not just multiple outputs", () => {
    const result = runCompareRuntimePipeline("4 source multiview processor single output canvas", products, undefined, 12);
    const leadSkus = skus(result.matches).slice(0, 5);

    expect(leadSkus.length).toBeGreaterThan(0);
    expect(leadSkus.some((item) => item === "NHD-0401-MV" || item === "NHD-150-RX")).toBe(true);
    expectNoSupportItemsInLeadResults(result);
  });
});
