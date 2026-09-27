import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { roomTemplates } from "./roomTemplates";
import { getTemplateApplicationProfile } from "./templateApplicationProfiles";

const emergency = roomTemplates.filter((template) => template.vertical === "Emergency Services");

describe("Emergency Services room designs", () => {
  it("offers four distinct spaces and transport architectures", () => {
    expect(emergency).toHaveLength(4);
    expect(new Set(emergency.map((template) => template.scale)).size).toBe(4);
    expect(emergency.filter((template) => template.bom.some((row) => row.sku === "NHD-600-TRX"))).toHaveLength(1);
    expect(new Set(emergency.map((template) => getTemplateApplicationProfile(template).architectureFamily)).size).toBe(3);
    expect(emergency.map((template) => template.bom.filter((row) => row.type === "Required" && !row.sku.startsWith("BY-OTHERS")).map((row) => row.sku))).toEqual([
      ["SW-130-TX-UK", "RX-700"],
      ["MX-1007-HYB", "NHD-500-TX", "NHD-CTL-PRO-V2"],
      ["NHD-600-TRX", "NHD-600-TRX", "NHD-CTL-PRO-V2"],
      ["NHD-CTL-PRO-V2", "NHD-120-TX", "NHD-120-RX", "NHD-150-RX"],
    ]);
  });

  it("uses currently governed WyreStorm SKUs and includes delivery scope", () => {
    // Vitest global setup generates the catalog; type checking needs no generated files.
    const productStore = JSON.parse(readFileSync("data/wingman-canonical-product-store.json", "utf8")) as {
      products: Array<{ sku: string; doNotSpec?: boolean }>;
    };
    for (const template of emergency) {
      for (const row of template.bom.filter((candidate) => !candidate.sku.startsWith("BY-OTHERS"))) {
        const product = productStore.products.find((candidate) => candidate.sku === row.sku);
        expect(product, `${template.id}: ${row.sku} absent from product store`).toBeDefined();
        expect(product?.doNotSpec, `${template.id}: ${row.sku} not spec-ready`).toBe(false);
      }
      expect(template.bom.some((row) => row.sku.startsWith("BY-OTHERS") && /display|projector/i.test(row.description))).toBe(true);
      expect(template.bom.some((row) => row.sku.startsWith("BY-OTHERS") && /installation labour/i.test(row.description))).toBe(true);
      expect(template.validationItems.length).toBeGreaterThanOrEqual(4);
    }
  });
});
