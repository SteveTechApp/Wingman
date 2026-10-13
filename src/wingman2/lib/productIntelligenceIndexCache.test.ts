import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applyRuntimeAdminRecords, clearProductIntelligenceIndexCache, loadProductIntelligenceDetail, loadProductIntelligenceDetailRecords, loadProductIntelligenceIndex, loadProductIntelligenceSummary } from "./productIntelligenceIndexCache";

beforeEach(() => clearProductIntelligenceIndexCache());
afterEach(() => vi.unstubAllGlobals());

describe("runtime ADMIN product overlays", () => {
  it("shares summary and legacy index loading across consumers", async () => {
    const fetchMock = vi.fn(async (url: string) => new Response(JSON.stringify(
      url.includes("summary") ? { products: [{ sku: "MX-1" }] } : { records: [] },
    )));
    vi.stubGlobal("fetch", fetchMock);
    const [summary, index] = await Promise.all([loadProductIntelligenceSummary(), loadProductIntelligenceIndex()]);
    expect(index).toBe(summary);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("shares full-catalogue hydration and limits concurrent detail requests", async () => {
    const products = Array.from({ length: 18 }, (_, index) => ({ sku: `MX-${index}` }));
    let active = 0;
    let peak = 0;
    let details = 0;
    vi.stubGlobal("fetch", vi.fn(async (input: string) => {
      if (input.includes("summary")) return new Response(JSON.stringify({ products }));
      if (input.endsWith("product-intelligence-details.json")) {
        return new Response(JSON.stringify({ products: Object.fromEntries(products.map(({ sku }) => [sku.replace("-", ""), { path: `/product-intelligence-details/${sku}.json` }])) }));
      }
      if (input.startsWith("/product-intelligence-details/")) {
        details++;
        peak = Math.max(peak, ++active);
        await new Promise((resolve) => setTimeout(resolve, 5));
        active--;
        return new Response(JSON.stringify({ technicalProfile: { evidence: "retained" } }));
      }
      return new Response(JSON.stringify({ records: [] }));
    }));
    const [first, second] = await Promise.all([loadProductIntelligenceDetailRecords(), loadProductIntelligenceDetailRecords()]);
    expect(first).toBe(second);
    expect(details).toBe(18);
    expect(peak).toBeLessThanOrEqual(6);
    expect(peak).toBeGreaterThan(1);
    expect((first as { products: Array<Record<string, unknown>> }).products.every((product) => product.technicalProfile)).toBe(true);
  });

  it("retries failed detail records instead of caching a partial full catalogue permanently", async () => {
    let attempts = 0;
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.includes("summary")) return new Response(JSON.stringify({ products: [{ sku: "MX-1" }] }));
      if (url.endsWith("product-intelligence-details.json")) return new Response(JSON.stringify({ products: { MX1: { path: "/product-intelligence-details/mx1.json" } } }));
      if (url.includes("/product-intelligence-details/")) {
        if (++attempts === 1) return new Response("unavailable", { status: 503 });
        return new Response(JSON.stringify({ technicalProfile: { verified: true } }));
      }
      return new Response(JSON.stringify({ records: [] }));
    }));
    await loadProductIntelligenceDetailRecords();
    expect(await loadProductIntelligenceDetailRecords()).toMatchObject({ products: [{ sku: "MX-1", technicalProfile: { verified: true } }] });
    expect(attempts).toBe(2);
  });
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
