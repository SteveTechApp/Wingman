import { describe, expect, it } from "vitest";

import { getGuruCatalogItems } from "./guruCatalog";
import WYRESTORM_CATALOG from "@/features/guru/guruCatalog.generated";

describe("guru catalog projection", () => {
  it("projects the canonical catalog into Guru-facing records", () => {
    const items = getGuruCatalogItems();

    expect(items.length).toBeGreaterThan(100);
    expect(items.find((item) => item.sku === "APO-DG2")?.family).toBe("Apollo");
    expect(items.find((item) => item.sku === "SW-640L-TX-W")?.summary.length).toBeGreaterThan(20);
  });

  it("keeps the Guru feature shim aligned with the canonical projection", () => {
    const canonical = getGuruCatalogItems();

    expect(WYRESTORM_CATALOG.length).toBe(canonical.length);
    expect(WYRESTORM_CATALOG[0]?.sku).toBe(canonical[0]?.sku);
  });
});
