import { describe, expect, it } from "vitest";

import { findCatalogProductBySku } from "@/catalog";

import { EMPTY_CATALOGUE_FILTER_STATE, SOLUTION_FAMILIES, type CatalogueProductRecord } from "./catalogFamilyFilterModel";
import { toFamilyFilterProductRecord } from "./catalogueFamilyAdapter";
import {
  filterCatalogueProducts,
  hasActiveFamilyFilters,
  productMatchesGroup
} from "./catalogFamilyFilterUtils";

function requireProduct(sku: string) {
  const product = findCatalogProductBySku(sku);
  expect(product, `${sku} should exist in the WyreStorm catalog seed`).toBeDefined();
  return product!;
}

describe("toFamilyFilterProductRecord", () => {
  it("maps known products into solution families and subtype fields", () => {
    const avoip = toFamilyFilterProductRecord(requireProduct("NHD-500-TX"));
    const matrix = toFamilyFilterProductRecord(requireProduct("MX-0404-HDMI"));
    const presentation = toFamilyFilterProductRecord(requireProduct("APO-210-UC"));

    expect(avoip.family).toBe("avoip");
    expect(avoip.series).toBe("nhd-500");
    expect(avoip.role).toBe("encoder");

    expect(matrix.family).toBe("matrix");
    expect(matrix.matrixType).toBe("hdmi-matrix");

    expect(presentation.family).toBe("presentation");
    expect(presentation.presentationType).toBe("conference-switcher");
  });

  it("filters adapted catalog rows by solution family", () => {
    const records = [
      toFamilyFilterProductRecord(requireProduct("NHD-500-TX")),
      toFamilyFilterProductRecord(requireProduct("MX-0404-HDMI")),
      toFamilyFilterProductRecord(requireProduct("APO-210-UC"))
    ];

    const filtered = filterCatalogueProducts(records, {
      ...EMPTY_CATALOGUE_FILTER_STATE,
      family: "avoip"
    });

    expect(filtered.map(product => product.sku)).toEqual(["NHD-500-TX"]);
  });
});

describe("catalogue family filter utils", () => {
  it("matches option aliases when evaluating group chips", () => {
    const avoipFeatures = SOLUTION_FAMILIES.find(family => family.id === "avoip")?.groups.find(
      group => group.id === "features"
    );

    expect(avoipFeatures).toBeDefined();

    const product: CatalogueProductRecord = {
      sku: "TEST-1",
      name: "Dante-ready endpoint",
      family: "avoip",
      featureTags: ["aes67"]
    };

    expect(productMatchesGroup(product, avoipFeatures!, ["dante"])).toBe(true);
  });

  it("treats hidden stale chip selections as inactive once no family is selected", () => {
    expect(
      hasActiveFamilyFilters({
        family: null,
        search: "",
        selected: {
          role: ["encoder"]
        }
      })
    ).toBe(false);

    expect(
      hasActiveFamilyFilters({
        family: "avoip",
        search: "",
        selected: {}
      })
    ).toBe(true);
  });
});
