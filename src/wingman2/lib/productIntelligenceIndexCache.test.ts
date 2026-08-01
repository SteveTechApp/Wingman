import { describe, expect, it } from "vitest";
import { applyRuntimeAdminRecords } from "./productIntelligenceIndexCache";

describe("runtime ADMIN product overlays", () => {
  it("applies edits, adds missing runtime SKUs, and omits administratively removed products", () => {
    const result = applyRuntimeAdminRecords(
      { products: [
        { sku: "KEEP-1", name: "Old name", summary: "Old summary" },
        { sku: "REMOVE-1", name: "Remove me" },
      ] },
      [
        { sku: "KEEP-1", name: "Corrected name", summary: "Corrected summary", status: "approved" },
        { sku: "REMOVE-1", status: "expired" },
        { sku: "NEW-1", name: "Testing SKU", status: "draft" },
      ],
    ) as { products: Array<Record<string, unknown>> };

    expect(result.products.map((product) => product.sku)).toEqual(["KEEP-1", "NEW-1"]);
    expect(result.products[0]).toMatchObject({
      name: "Corrected name",
      summary: "Corrected summary",
      testingAdminStatus: "approved",
    });
  });
});
