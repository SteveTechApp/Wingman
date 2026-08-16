import { describe, expect, it } from "vitest";

import {
  CURRENT_CATALOG_EXCLUDED_ROLES,
  isCurrentAndCaptured,
  isCurrentCatalogProduct,
} from "./current-catalog.mjs";

const product = (overrides) => ({
  sku: "SKU-1",
  lifecycleStatus: "active",
  doNotSpec: false,
  productRole: "primary-hardware",
  technicalProfile: {
    sourceQuality: { livePageUsed: true, officialPageStatus: 200 },
  },
  ...overrides,
});

describe("isCurrentAndCaptured", () => {
  it("accepts active lifecycle products", () => {
    expect(isCurrentAndCaptured(product({ lifecycleStatus: "active" }))).toBe(true);
  });

  it("accepts review lifecycle products only when an official page was captured", () => {
    expect(isCurrentAndCaptured(product({ lifecycleStatus: "review" }))).toBe(true);
    expect(
      isCurrentAndCaptured(
        product({
          lifecycleStatus: "review",
          technicalProfile: { sourceQuality: { livePageUsed: false, officialPageStatus: 200 } },
        }),
      ),
    ).toBe(false);
    expect(
      isCurrentAndCaptured(
        product({
          lifecycleStatus: "review",
          technicalProfile: { sourceQuality: { livePageUsed: true, officialPageStatus: 404 } },
        }),
      ),
    ).toBe(false);
  });

  it("rejects discontinued, do-not-spec and missing lifecycle products", () => {
    expect(isCurrentAndCaptured(product({ lifecycleStatus: "discontinued" }))).toBe(false);
    expect(isCurrentAndCaptured(product({ lifecycleStatus: "do-not-spec" }))).toBe(false);
    expect(isCurrentAndCaptured(product({ lifecycleStatus: undefined }))).toBe(false);
  });
});

describe("isCurrentCatalogProduct", () => {
  it("accepts a current specifiable lead product", () => {
    expect(isCurrentCatalogProduct(product())).toBe(true);
  });

  it("rejects do-not-spec products", () => {
    expect(isCurrentCatalogProduct(product({ doNotSpec: true }))).toBe(false);
  });

  it("rejects cable and accessory roles", () => {
    for (const role of CURRENT_CATALOG_EXCLUDED_ROLES) {
      expect(isCurrentCatalogProduct(product({ productRole: role }))).toBe(false);
    }
  });

  it("rejects non-current products even when specifiable", () => {
    expect(
      isCurrentCatalogProduct(product({ lifecycleStatus: "discontinued", productRole: "primary-hardware" })),
    ).toBe(false);
  });
});
