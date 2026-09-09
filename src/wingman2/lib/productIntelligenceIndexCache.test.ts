import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyRuntimeAdminRecords, clearProductIntelligenceIndexCache, loadProductIntelligenceDetail, loadProductIntelligenceSummary } from "./productIntelligenceIndexCache";

beforeEach(() => clearProductIntelligenceIndexCache());

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

  it("loads the lightweight summary before fetching deferred SKU detail", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const payload = url.includes("summary")
        ? { products: [{ sku: "MX-1", name: "Matrix" }] }
        : url.endsWith("product-intelligence-details.json")
          ? { products: { MX1: { path: "/product-intelligence-details/mx1.json" } } }
          : url.endsWith("/product-intelligence-details/mx1.json")
            ? { technicalProfile: { inputs: 4 } }
          : { records: [] };
      return { ok: true, json: async () => payload } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);

    await loadProductIntelligenceSummary();
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("details"))).toBe(false);

    await expect(loadProductIntelligenceDetail("MX-1")).resolves.toMatchObject({
      sku: "MX-1",
      technicalProfile: { inputs: 4 },
    });
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("details"))).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith("/product-intelligence-details/mx1.json", { cache: "force-cache" });
    vi.unstubAllGlobals();
  });
});
