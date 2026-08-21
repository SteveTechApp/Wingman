import { describe, expect, it } from "vitest";

import { __liveLookupTest } from "./live-lookup.mjs";

const { extractCandidateLinks, normalizeAllowedProductUrl, sourceAuthority } = __liveLookupTest;

describe("competitor live lookup evidence boundaries", () => {
  it("unwraps an exact-SKU DuckDuckGo result into an allowed reseller page", () => {
    const destination = "https://www.bhphotovideo.com/c/product/123/blustream-sw41ab-v2.html";
    const html = `<a href="https://duckduckgo.com/l/?uddg=${encodeURIComponent(destination)}">SW41AB-V2</a>`;

    expect(extractCandidateLinks(html, "https://html.duckduckgo.com/html/", "SW41AB-V2"))
      .toContain(destination);
  });

  it("rejects unapproved destinations even when a search result names the SKU", () => {
    expect(normalizeAllowedProductUrl("https://example.invalid/products/TP-580T", "TP-580T"))
      .toBe("");
  });

  it("keeps discovery and community pages below specification evidence", () => {
    expect(sourceAuthority("https://www.bing.com/search?q=TP-580T", "bing-search").tier).toBe(5);
    expect(sourceAuthority("https://www.reddit.com/r/CommercialAV/comments/example", "reddit-search").tier).toBe(4);
    expect(sourceAuthority("https://www.manualslib.com/manual/123/Kramer-TP-580T.html", "discovered-product-link").tier).toBe(2);
  });
});
