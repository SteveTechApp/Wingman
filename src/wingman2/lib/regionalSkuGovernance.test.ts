import { describe, expect, it } from "vitest";
import {
  buildRegionalSkuAssurance,
  regionToSkuSuffix,
  regionalVariantFamilies,
} from "./regionalSkuGovernance";

describe("regional SKU governance", () => {
  it("discovers SW-130-TX as a regional variant family from the governed data", () => {
    const families = regionalVariantFamilies();
    const sw130 = families.find((family) => family.baseSku === "SW-130-TX");

    expect(sw130).toBeDefined();
    expect(sw130?.variants.UK).toContain("SW-130-TX-UK");
    expect(sw130?.variants.US).toContain("SW-130-TX-US");
  });

  it("blocks a family/range base SKU from being quoted directly", () => {
    const items = buildRegionalSkuAssurance({
      products: [{ sku: "SW-130-TX", quantity: 1 }],
      region: "United Kingdom",
    });

    const blocker = items.find((item) => item.id === "regional-base-sku-SW130TX");
    expect(blocker).toBeDefined();
    expect(blocker?.severity).toBe("blocker");
    expect(blocker?.message).toContain("family/range reference");
    expect(blocker?.message).toContain("SW-130-TX-UK");
  });

  it("warns when a regional variant does not match the rep's market", () => {
    const items = buildRegionalSkuAssurance({
      products: [{ sku: "SW-130-TX-UK", quantity: 1 }],
      region: "United States",
    });

    const mismatch = items.find((item) => item.id === "regional-mismatch-SW130TXUK");
    expect(mismatch).toBeDefined();
    expect(mismatch?.severity).toBe("warning");
    expect(mismatch?.message).toContain("United States");
  });

  it("passes a regional variant that matches the rep's market", () => {
    const items = buildRegionalSkuAssurance({
      products: [{ sku: "SW-130-TX-UK", quantity: 1 }],
      region: "United Kingdom",
    });

    expect(items.some((item) => item.id.startsWith("regional-"))).toBe(false);
  });

  it("maps common market strings to the right suffix", () => {
    expect(regionToSkuSuffix("United Kingdom")).toBe("UK");
    expect(regionToSkuSuffix("Europe / EMEA")).toBe("UK");
    expect(regionToSkuSuffix("United States")).toBe("US");
    expect(regionToSkuSuffix("North America")).toBe("US");
    expect(regionToSkuSuffix("Australia")).toBeNull();
    expect(regionToSkuSuffix("")).toBeNull();
    expect(regionToSkuSuffix(undefined)).toBeNull();
  });
});
