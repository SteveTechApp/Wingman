import index from "../../../public/product-intelligence-index.json";
import { describe, expect, it, vi } from "vitest";

vi.mock("./productIntelligenceIndexCache", () => ({
  loadProductIntelligenceIndex: vi.fn().mockResolvedValue(index),
}));

import { runSpecShowdown } from "./compareSpecEngine";

function expectFound(
  result: Awaited<ReturnType<typeof runSpecShowdown>>,
): asserts result is Extract<typeof result, { coverage: "found" }> {
  expect(result.coverage).toBe("found");
  if (result.coverage !== "found") {
    throw new Error("Expected competitor coverage.");
  }

  if (result.matches.length === 0) {
    const rejected = result.rejected
      .slice(0, 12)
      .map(
        (item) =>
          `${item.sku}: ${item.blockers.join(" | ") || "no blocker text"}`,
      )
      .join("\n");

    throw new Error(
      [
        `Expected at least one WyreStorm match for ${result.competitor.brand} ${result.competitor.sku}.`,
        `Competitor normalised as class=${result.competitor.specClass}, role=${result.competitor.role}, hdmiOut=${result.competitor.hdmiOut}, resolution=${result.competitor.maxResolutionLabel}.`,
        "Top rejected candidates:",
        rejected || "(none)",
      ].join("\n"),
    );
  }
}

describe("spec-engine distribution right-sizing", () => {
  it("keeps a 4K 1x2 brief in the 4K 1x2 lane rather than promoting the 8K model", async () => {
    const result = await runSpecShowdown("Atlona", "AT-HDDA-2");
    expectFound(result);

    expect(result.competitor.specClass).toBe("DISTRIBUTION");
    expect(result.competitor.hdmiOut).toBe(2);
    expect(result.matches[0].sheet.hdmiOut).toBe(2);
    expect(result.matches[0].sheet.sku).toBe("EXP-SP-0102-H2");
  });

  it("uses the 8K 1x2 product when the competitor genuinely requires the higher video class", async () => {
    const result = await runSpecShowdown("Extron", "DA2 HD 8K L");
    expectFound(result);

    expect(result.competitor.specClass).toBe("DISTRIBUTION");
    expect(result.competitor.hdmiOut).toBe(2);
    expect(result.matches[0].sheet.hdmiOut).toBe(2);
    expect(result.matches[0].sheet.sku).toBe("EXP-SP-0102-8K");
  });

  it("does not lead a 1x4 requirement with an oversized 1x8 splitter when a suitable 1x4 exists", async () => {
    const result = await runSpecShowdown("Atlona", "AT-HDDA-4");
    expectFound(result);

    expect(result.competitor.specClass).toBe("DISTRIBUTION");
    expect(result.competitor.hdmiOut).toBe(4);
    expect(result.matches[0].sheet.hdmiOut).toBe(4);
    expect(["EXP-SP-0104-H2", "SP-0104-H2"]).toContain(
      result.matches[0].sheet.sku,
    );
  });

  it("allows the 1x8 splitter to lead an 8-output distribution requirement", async () => {
    const result = await runSpecShowdown("Atlona", "AT-HDDA-8");
    expectFound(result);

    expect(result.competitor.specClass).toBe("DISTRIBUTION");
    expect(result.competitor.hdmiOut).toBe(8);
    expect(result.matches[0].sheet.hdmiOut).toBe(8);
    expect(result.matches[0].sheet.sku).toBe("SP-0108-SCL");
  });
});
