import { describe, expect, it } from "vitest";
import index from "../../../public/product-intelligence-summary.json";
import { applyCatalogOverrides, buildFacetIndex, createDefaultCatalogFilterState, filterCatalogProducts } from "../../features/catalog/catalogIntelligence";

const catalog = applyCatalogOverrides(index.products);
const state = { ...createDefaultCatalogFilterState(), includeAccessories: true, excludeEolSoon: false };
const skus = (patch: Partial<typeof state>) => filterCatalogProducts(catalog, { ...state, ...patch }).map((p) => p.sku);

describe("catalogue filter accuracy", () => {
  it("finds exact SKUs with spaces or punctuation without returning compatible hosts", () => {
    for (const search of ["APO-DG2", "apo dg2", "APODG2"]) {
      expect(skus({ search })).toEqual(["APO-DG2"]);
      expect(skus({ search, matchMode: "find" })).toEqual(["APO-DG2"]);
    }
    expect(skus({ search: "APO-DG2", families: ["Matrix Switching"] })).toEqual([]);
  });

  it("never treats enabled accessories or selected facets as a search match", () => {
    expect(skus({ search: "no-such-product-xyz", matchMode: "find" })).toEqual([]);
    expect(skus({ search: "no-such-product-xyz", families: ["Audio"], matchMode: "find" })).toEqual([]);
    expect(skus({ search: "NHD 500" })).toContain("NHD-500-E-TX");
    expect(skus({ search: "NHD 500" })).not.toContain("APO-DG2");
    expect(skus({ search: "NHD 500" })).not.toContain("NHD-500");
    expect(skus({ search: "SW 130" })).not.toContain("SW-130-TX");
  });

  it("makes extenders discoverable and separates camera, audio and controller roles", () => {
    expect(buildFacetIndex(catalog).families).toContain("Extenders");
    expect(skus({ families: ["Extenders"] })).toContain("EX-70-H2");
    expect(skus({ roles: ["camera"] })).toContain("CAM-420-PTZ");
    expect(skus({ roles: ["camera"] })).not.toContain("APO-COM-MIC");
    expect(skus({ roles: ["av-over-ip-encoder"] })).toContain("NHD-500-E-TX");
    expect(skus({ roles: ["av-over-ip-encoder"] })).not.toContain("NHD-000-CTL");
    expect(skus({ families: ["Control"] })).not.toContain("EX-70-H2");
    expect(skus({ technologies: ["networkhd"] })).toContain("NHD-600-TRX");
    expect(skus({ standaloneOnly: true })).not.toContain("NHD-600-TRX");
  });

  it("includes actual presentation switchers and excludes their peripherals", () => {
    const expected = ["SW-120-TX3", "SW-130-TX-UK", "SW-220-TX-W", "SW-510-TX", "SW-515-RX", "SW-620-TX-W", "SW-640L-TX-W", "MX-0402-MST", "MX-0403-H3-MST", "MX-1007-HYB", "APO-210-UC", "SYN-KIT-130-EU"];
    for (const patch of [{ families: ["Presentation Switching"] as const }, { roles: ["presentation-switcher"] as const }]) {
      const results = skus(JSON.parse(JSON.stringify(patch)));
      for (const sku of expected) expect(results, sku).toContain(sku);
      for (const sku of ["APO-COM-MIC", "APO-SKY-MIC", "APO-DG1", "APO-DG2", "APO-DG-DOCK", "APO-DG-HDMI", "CAM-420-PTZ", "SW-0206-VW", "EX-70-H2", "SYN-TOUCH10"]) {
        expect(results, sku).not.toContain(sku);
      }
    }
  });

  it("keeps application metadata from assigning hardware roles or technologies", () => {
    const products = applyCatalogOverrides([{ sku: "EX-TEST", name: "HDMI extender", category: "Extension",
      summary: "HDBaseT transmitter and receiver set", tags: ["UC", "Video wall", "Multiview", "USB", "Dante"],
      applications: ["Wireless presentation", "KVM"] }]);
    expect(products[0].families).toEqual(["Extenders"]);
    expect(products[0].roles).toEqual(["extender"]);
    expect(products[0].technologies).toEqual(["hdmi", "hdbaset"]);
    const kvm = applyCatalogOverrides([{ sku: "EX-KVM", name: "USB KVM extender" }]);
    expect(kvm[0].families).toContain("KVM");
  });

  it("combines alternatives within a facet and requirements across facets", () => {
    const matches = filterCatalogProducts(catalog, { ...state, families: ["Extenders", "Matrix Switching"], technologies: ["hdbaset"] });
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.every((p) => p.technologies.includes("hdbaset") && p.families.some((f) => f === "Extenders" || f === "Matrix Switching"))).toBe(true);
  });
});
