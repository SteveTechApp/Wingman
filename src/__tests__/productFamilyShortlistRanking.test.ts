import { describe, expect, it } from "vitest";

import { rankProductsByFamilyScores, scoreProductForFamilyPath } from "../wingman2/lib/productFamilyShortlistRanking";

describe("product-family shortlist ranking", () => {
  it("moves NetworkHD products ahead when NetworkHD has the strongest family score", () => {
    const products = [
      { sku: "SW-0206-VW", family: "Video wall processor" },
      { sku: "NHD-500-TX", family: "NetworkHD" },
      { sku: "MX-0808-KIT", family: "Matrix / HDBaseT" },
    ];

    const ranked = rankProductsByFamilyScores(products, [
      { family: "NetworkHD", score: 92 },
      { family: "Matrix / HDBaseT", score: 44 },
      { family: "Video wall processor", score: 30 },
    ]);

    expect(ranked.map((product) => product.sku)).toEqual(["NHD-500-TX", "MX-0808-KIT", "SW-0206-VW"]);
  });

  it("uses SKU and text aliases when family metadata is incomplete", () => {
    const nhdScore = scoreProductForFamilyPath(
      { sku: "NHD-124-TX", title: "Encoder" },
      [{ family: "NetworkHD", score: 86 }],
    );

    const ucScore = scoreProductForFamilyPath(
      { sku: "APO-VX20-UC", title: "BYOD soundbar" },
      [{ family: "Presentation / UC", score: 74 }],
    );

    expect(nhdScore).toBe(86);
    expect(ucScore).toBe(74);
  });

  it("keeps original order when products have the same family score", () => {
    const products = [
      { sku: "NHD-124-TX", family: "NetworkHD" },
      { sku: "NHD-150-RX", family: "NetworkHD" },
    ];

    const ranked = rankProductsByFamilyScores(products, [{ family: "NetworkHD", score: 80 }]);

    expect(ranked.map((product) => product.sku)).toEqual(["NHD-124-TX", "NHD-150-RX"]);
  });

  it("does not mutate the original product array", () => {
    const products = [
      { sku: "MX-0808-KIT", family: "Matrix / HDBaseT" },
      { sku: "NHD-500-TX", family: "NetworkHD" },
    ];

    const ranked = rankProductsByFamilyScores(products, [
      { family: "NetworkHD", score: 90 },
      { family: "Matrix / HDBaseT", score: 30 },
    ]);

    expect(products.map((product) => product.sku)).toEqual(["MX-0808-KIT", "NHD-500-TX"]);
    expect(ranked.map((product) => product.sku)).toEqual(["NHD-500-TX", "MX-0808-KIT"]);
  });
});
