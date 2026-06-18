import { describe, expect, it } from "vitest";

import { getProductFamilyRankingReason } from "../wingman2/lib/productFamilyShortlistRanking";

describe("Finder product-family ranking reason", () => {
  it("explains the NDI camera workflow using the matched family reasons", () => {
    const reason = getProductFamilyRankingReason(
      {
        sku: "NHD-128-NDI-TRX",
        title: "NDI to NetworkHD bridge",
        family: "NetworkHD 100 / NDI",
        category: "NDI / camera",
      },
      [
        {
          family: "NetworkHD",
          score: 88,
          reasons: ["NDI camera workflow", "Bridge path into the wider AV system"],
        },
      ],
    );

    expect(reason).toContain("NetworkHD");
    expect(reason).toContain("NDI camera workflow");
    expect(reason).toContain("Bridge path into the wider AV system");
  });
});
