import { describe, expect, it } from "vitest";

import { rankProductsByFamilyScores } from "../wingman2/lib/productFamilyShortlistRanking";

describe("Finder product-family ranking handoff", () => {
  it("keeps a hospitality sports-bar workflow on a matrix-led direction instead of controller or accessory products", () => {
    const ranked = rankProductsByFamilyScores(
      [
        {
          sku: "NHD-000-CTL",
          title: "NetworkHD controller",
          family: "NetworkHD control",
          category: "Controller",
        },
        {
          sku: "APO-DG2",
          title: "Wireless collaboration dongle",
          family: "Apollo / Wireless Collaboration",
          category: "Accessory",
        },
        {
          sku: "MX-0808-KIT",
          title: "8x8 matrix kit",
          family: "Matrix switching",
          category: "Matrix",
        },
      ],
      [
        {
          family: "Matrix / HDBaseT",
          score: 94,
        },
        {
          family: "Presentation / UC",
          score: 18,
        },
      ],
    );

    expect(ranked[0]?.sku).toBe("MX-0808-KIT");
    expect(ranked[0]?.sku).not.toBe("NHD-000-CTL");
    expect(ranked[0]?.sku).not.toBe("APO-DG2");
  });
});
