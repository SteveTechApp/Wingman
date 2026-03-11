import { describe, expect, it } from "vitest";

import {
  applyPricingModel,
  getBomLineCoverage,
  getTierCoverageSummary,
  normalizePriceTier,
} from "@/proposal/bom/pricing";
import type { Proposal } from "@/proposal/bom/types";

function makeProposal(overrides?: Partial<Proposal>): Proposal {
  return {
    meta: {
      projectName: "Boardroom Refresh",
      currency: "USD",
      priceTier: "Silver",
      ...(overrides?.meta ?? {}),
    },
    lines: overrides?.lines ?? [],
  };
}

describe("proposal bom pricing", () => {
  it("maps legacy tiers onto the current commercial tier set", () => {
    expect(normalizePriceTier("Dealer")).toBe("Silver");
    expect(normalizePriceTier("Distributor")).toBe("Gold");
    expect(normalizePriceTier("MSRP")).toBe("Gold");
    expect(normalizePriceTier(undefined)).toBe("Silver");
  });

  it("normalizes lines around offer tiers instead of carrying legacy price values", () => {
    const proposal = applyPricingModel(
      makeProposal({
        meta: {
          projectName: "Boardroom Refresh",
          currency: "USD",
          priceTier: "Bronze",
        },
        lines: [
          {
            id: "line-1",
            sku: "CAB-HDMI-2M",
            description: "HDMI cable 2m",
            qty: 0,
            category: "Core",
            unitCost: { currency: "USD", value: 125 },
            unitSell: { currency: "USD", value: 210 },
          },
        ],
      }),
    );

    expect(proposal.meta.priceTier).toBe("Bronze");
    expect(proposal.lines[0]?.qty).toBe(1);
    expect(proposal.lines[0]?.category).toBe("Cabling");
    expect(proposal.lines[0]?.unitCost?.value).toBe(0);
    expect(proposal.lines[0]?.unitSell?.value).toBe(0);
  });

  it("keeps Bronze leaner than Silver and Gold when summarizing the BOM", () => {
    const proposal = makeProposal({
      lines: [
        {
          id: "line-core",
          sku: "SW-210",
          description: "Presentation Switcher",
          qty: 1,
          category: "Core",
        },
        {
          id: "line-endpoint",
          sku: "RX-1",
          description: "Decoder receiver",
          qty: 1,
          category: "Endpoints",
        },
        {
          id: "line-accessory",
          sku: "MNT-1",
          description: "Rack mount kit",
          qty: 1,
          category: "Accessories",
        },
        {
          id: "line-service",
          sku: "SRV-1",
          description: "Commissioning service",
          qty: 1,
          category: "Services",
        },
        {
          id: "line-cable",
          sku: "CAB-1",
          description: "Cat6 cable",
          qty: 2,
          category: "Cabling",
        },
      ],
    });

    const bronze = getTierCoverageSummary(proposal.lines, "Bronze");
    const silver = getTierCoverageSummary(proposal.lines, "Silver");
    const gold = getTierCoverageSummary(proposal.lines, "Gold");

    expect(bronze.costBand).toBe("Low");
    expect(bronze.includedLines).toBe(2);
    expect(bronze.optionalLines).toBe(1);
    expect(bronze.heldBackLines).toBe(2);

    expect(silver.costBand).toBe("Medium");
    expect(silver.includedLines).toBe(4);
    expect(silver.optionalLines).toBe(0);
    expect(silver.heldBackLines).toBe(1);

    expect(gold.costBand).toBe("High");
    expect(gold.includedLines).toBe(5);
    expect(gold.heldBackLines).toBe(0);
  });

  it("explains when a line moves from included to optional or held back", () => {
    const bronzeCoverage = getBomLineCoverage(
      {
        id: "line-endpoint",
        sku: "RX-1",
        description: "Decoder receiver",
        qty: 1,
        category: "Endpoints",
      },
      "Bronze",
    );

    const silverCoverage = getBomLineCoverage(
      {
        id: "line-service",
        sku: "SRV-1",
        description: "Commissioning service",
        qty: 1,
        category: "Services",
      },
      "Silver",
    );

    expect(bronzeCoverage.label).toBe("Optional");
    expect(bronzeCoverage.reason).toContain("step the offer up");
    expect(silverCoverage.label).toBe("Held back");
    expect(silverCoverage.reason).toContain("high-cost offer");
  });
});
