import { describe, expect, it } from "vitest";
import { bomPricingTotals, unitPriceValue } from "./proposalPricing";
import type { SalesBomRow } from "./salesReadiness";

function row(sku: string, qty = 1): SalesBomRow {
  return {
    item: 1,
    sku,
    description: `${sku} description`,
    role: "Switching",
    qty,
    type: "Required",
    status: "included",
    evidence: "Selected for the room",
    notes: "",
  };
}

describe("unitPriceValue", () => {
  it("reads a price the rep typed", () => {
    expect(unitPriceValue("1250.00")).toBe(1250);
    expect(unitPriceValue(" 80 ")).toBe(80);
    expect(unitPriceValue("0")).toBe(0);
  });

  it("treats an unanswered cell as no price, not as zero", () => {
    expect(unitPriceValue(undefined)).toBeNull();
    expect(unitPriceValue("")).toBeNull();
    expect(unitPriceValue("   ")).toBeNull();
    // A minus sign and a non-number are not prices either.
    expect(unitPriceValue("-5")).toBeNull();
    expect(unitPriceValue("1,250")).toBeNull();
    expect(unitPriceValue("quote on request")).toBeNull();
  });
});

describe("bomPricingTotals", () => {
  it("prices every row at its own rate and quantity", () => {
    const totals = bomPricingTotals([row("NHD-1", 2), row("NHD-2", 3)], {
      "NHD-1": "100",
      "NHD-2": "20.50",
    });

    expect(totals.lines.map((line) => [line.unit, line.total])).toEqual([
      [100, 200],
      [20.5, 61.5],
    ]);
    expect(totals.priced).toBe(2);
    expect(totals.complete).toBe(true);
    expect(totals.total).toBe(261.5);
  });

  it("leaves an unpriced row out of the total and marks the set incomplete", () => {
    const totals = bomPricingTotals([row("NHD-1", 2), row("NHD-2")], { "NHD-1": "100" });

    expect(totals.lines[1]).toMatchObject({ sku: "NHD-2", unit: null, total: null });
    // The priced rows still sum, so a draft can show what is already known.
    expect(totals.total).toBe(200);
    expect(totals.priced).toBe(1);
    expect(totals.complete).toBe(false);
  });

  it("is never complete without any rows to price", () => {
    expect(bomPricingTotals([], { "NHD-1": "100" })).toMatchObject({ complete: false, total: 0, priced: 0 });
  });
});
