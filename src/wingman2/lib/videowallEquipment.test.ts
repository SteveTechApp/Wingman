import { beforeEach, describe, expect, it } from "vitest";
import { productSelectionsFromVideowallSummary, readProjectStore, resetProjectStore, saveVideowallToProject } from "../data/projectStore";

describe("videowall equipment quantities", () => {
  beforeEach(() => resetProjectStore());
  it("retains quantities and ignores invalid allowances", () => {
    const products = productSelectionsFromVideowallSummary({ recommendation: { products: ["NHD-500-TX", "NHD-500-RX", "NHD-CTL-PRO-V2"], equipment: [{ sku: "NHD-500-TX", quantity: 4 }, { sku: "NHD-500-RX", quantity: 9 }, { sku: "NHD-CTL-PRO-V2", quantity: -1 }] } });
    expect(products.map(p => p.quantity)).toEqual([4, 9, undefined]);
  });
  it("replaces a previous builder architecture on the same project", () => {
    const first = saveVideowallToProject({ wallType: "lcd", summary: { recommendation: { products: ["MX-0404-SCL"] } } });
    const second = saveVideowallToProject({ wallType: "lcd", summary: { recommendation: { products: ["NHD-500-RX"], equipment: [{ sku: "NHD-500-RX", quantity: 9 }] } } });
    expect(second.id).toBe(first.id);
    const saved = readProjectStore().projects.find(p => p.id === second.id)!;
    expect(saved.productSelections?.map(p => p.sku)).toEqual(["NHD-500-RX"]);
    expect(saved.productSelections?.[0].quantity).toBe(9);
  });
});
