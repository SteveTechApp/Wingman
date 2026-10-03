import { afterEach, describe, expect, it, vi } from "vitest";

import { loadWyrestormMediaIndex, resolveWyrestormMediaIndexUrl } from "./compareSpecEngine";

describe("WyreStorm media-index URL resolution", () => {
  afterEach(() => {
    delete process.env.TEST_BASE_URL;
    vi.unstubAllGlobals();
  });

  it("keeps absolute URLs unchanged", () => {
    expect(resolveWyrestormMediaIndexUrl("https://assets.example.test/index.json"))
      .toBe("https://assets.example.test/index.json");
  });

  it("resolves site-relative assets against a configured test origin", () => {
    expect(resolveWyrestormMediaIndexUrl("/product-media-index.json", "https://wingman.example.test/app/"))
      .toBe("https://wingman.example.test/product-media-index.json");
  });

  it("rejects an invalid configured origin", () => {
    expect(resolveWyrestormMediaIndexUrl("/product-media-index.json", "not a URL")).toBeNull();
  });

  it("does not attempt an optional network request in an unconfigured unit test", async () => {
    await expect(loadWyrestormMediaIndex()).resolves.toEqual(new Map());
  });

  it("loads and normalizes media records when a test origin is configured", async () => {
    process.env.TEST_BASE_URL = "https://wingman.example.test";
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      products: [
        { sku: " mx-test-01 ", front: { url: "https://cdn.example.test/mx-test-01.png" } },
        { sku: "NO-IMAGE", front: {} },
      ],
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const media = await loadWyrestormMediaIndex();

    expect(fetchMock).toHaveBeenCalledWith("https://wingman.example.test/product-media-index.json");
    expect(media.get("mxtest01")).toBe("https://cdn.example.test/mx-test-01.png");
    expect(media.has("noimage")).toBe(false);
  });
});
