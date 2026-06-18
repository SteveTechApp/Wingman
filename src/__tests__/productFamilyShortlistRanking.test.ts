import { describe, expect, it } from "vitest";

import { rankProductsByFamilyScores, scoreProductForFamilyPath , getProductFamilyRankingReason} from "../wingman2/lib/productFamilyShortlistRanking";

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

describe("product-family path ordering scenarios", () => {
  const scenarioProducts = [
    {
      sku: "MX-0808-KIT",
      title: "Fixed 8x8 matrix kit",
      family: "Matrix switching",
      category: "Matrix",
      technology: "HDBaseT matrix switching",
      description: "Fixed source-to-display routing for local or structured AV rooms.",
    },
    {
      sku: "SW-640-TX-W",
      title: "Wireless presentation switcher",
      family: "Presentation / UC",
      category: "Presentation switcher",
      technology: "USB-C wireless presentation BYOD",
      description: "Meeting-room presentation, wireless sharing, USB-C and collaboration workflow.",
    },
    {
      sku: "NHD-500-TX",
      title: "NetworkHD 500 encoder",
      family: "NetworkHD 500",
      category: "AV-over-IP",
      technology: "JPEG XS AV-over-IP encoder",
      description: "Premium 4K60 AV-over-IP source encoding for distributed systems.",
    },
  ];

  it("changes product order when the customer path changes", () => {
    const presentationPath = rankProductsByFamilyScores(scenarioProducts, [
      {
        family: "Presentation / UC",
        score: 92,
        reasons: ["Meeting-room workflow", "USB-C presentation", "BYOD"],
      },
      {
        family: "Matrix switching",
        score: 45,
        reasons: ["Some fixed routing"],
      },
      {
        family: "NetworkHD 500",
        score: 30,
        reasons: ["Limited distributed AV requirement"],
      },
    ]);

    const avoipPath = rankProductsByFamilyScores(scenarioProducts, [
      {
        family: "NetworkHD 500",
        score: 94,
        reasons: ["Distributed AV", "scalable routing", "premium AV-over-IP"],
      },
      {
        family: "Matrix switching",
        score: 50,
        reasons: ["Some fixed routing"],
      },
      {
        family: "Presentation / UC",
        score: 25,
        reasons: ["No meeting-room workflow"],
      },
    ]);

    expect(presentationPath[0]?.sku).toBe("SW-640-TX-W");
    expect(avoipPath[0]?.sku).toBe("NHD-500-TX");
    expect(presentationPath[0]?.sku).not.toBe(avoipPath[0]?.sku);
  });

  it("keeps fixed matrix products ahead when the matrix path is strongest", () => {
    const matrixPath = rankProductsByFamilyScores(scenarioProducts, [
      {
        family: "Matrix switching",
        score: 90,
        reasons: ["Fixed source-to-display routing", "local switching", "defined I/O"],
      },
      {
        family: "Presentation / UC",
        score: 35,
        reasons: ["No UC-led requirement"],
      },
      {
        family: "NetworkHD 500",
        score: 30,
        reasons: ["No distributed AV requirement"],
      },
    ]);

    expect(matrixPath[0]?.sku).toBe("MX-0808-KIT");
  });
});

describe("product-family ranking explanation", () => {
  it("explains which family score moved a product upward", () => {
    const reason = getProductFamilyRankingReason(
      {
        sku: "SW-640-TX-W",
        title: "Wireless presentation switcher",
        family: "Presentation / UC",
        category: "Presentation switcher",
        technology: "USB-C wireless presentation BYOD",
      },
      [
        {
          family: "Presentation / UC",
          score: 91,
          reasons: ["Meeting-room workflow", "BYOD presentation"],
        },
      ],
    );

    expect(reason).toContain("Presentation / UC");
    expect(reason).toContain("91");
    expect(reason).toContain("Meeting-room workflow");
  });
});

