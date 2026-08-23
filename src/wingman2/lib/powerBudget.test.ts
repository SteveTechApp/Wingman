import { describe, expect, it } from "vitest";
import { buildPowerBudgetAssurance, powerBudgetSummary, wattsFromPowerLine } from "./powerBudget";

describe("power budget", () => {
  it("parses explicit max wattage from governed power lines", () => {
    expect(wattsFromPowerLine("Max 3.5W")).toBe(3.5);
    expect(wattsFromPowerLine("Max 24W, average 10W")).toBe(24);
    expect(wattsFromPowerLine("Max 105.4W")).toBe(105.4);
    expect(wattsFromPowerLine("Max power consumption listed as TBD on the product page")).toBeNull();
  });

  it("parses bare watt figures and volt-amp ratings", () => {
    expect(wattsFromPowerLine("240W mono")).toBe(240);
    expect(wattsFromPowerLine("12V 2A DC PSU")).toBe(24);
    expect(wattsFromPowerLine("18V DC 1A")).toBe(18);
  });

  it("returns null for lines with no consumption figure", () => {
    expect(wattsFromPowerLine("Local mains power")).toBeNull();
    expect(wattsFromPowerLine("IEEE 802.3af PoE")).toBeNull();
    expect(wattsFromPowerLine("")).toBeNull();
  });

  it("sums the BOM's stated maximum consumption", () => {
    const summary = powerBudgetSummary([
      { sku: "EXP-SW-0401-8K", quantity: 1 },
      { sku: "NHD-600-TRX", quantity: 2 },
    ]);

    const switcher = summary.find((item) => item.sku === "EXP-SW-0401-8K");
    const trx = summary.find((item) => item.sku === "NHD-600-TRX");

    // The profile lists both a PSU rating (12V DC 1A -> 12W) and a stated
    // max (3.5W); the conservative figure is the higher of the two.
    expect(switcher?.watts).toBe(12);
    expect(switcher?.totalWatts).toBe(12);
    expect(trx?.watts).toBe(24);
    expect(trx?.totalWatts).toBe(48);
  });

  it("flags a product with no proven consumption figure", () => {
    const items = buildPowerBudgetAssurance({
      products: [{ sku: "APO-VX20-UC-V2", quantity: 1 }],
    });

    expect(items.some((item) => item.id === "power-unknown-APOVX20UCV2" && item.severity === "warning")).toBe(true);
  });

  it("flags remote power requirements that the governed profiles do not prove", () => {
    const items = buildPowerBudgetAssurance({
      products: [{ sku: "EXP-SW-0401-8K", quantity: 1 }],
      requirementText: "The displays are powered remotely over PoH from the matrix.",
    });

    expect(items.some((item) => item.id === "power-remote-unproven" && item.severity === "blocker")).toBe(true);
  });

  it("passes remote power requirements that the governed profiles prove", () => {
    const items = buildPowerBudgetAssurance({
      products: [{ sku: "EX-70-H2", quantity: 1 }],
      requirementText: "Remote power over PoH is required to the receiver.",
    });

    expect(items.some((item) => item.id === "power-remote-unproven")).toBe(false);
  });
});
