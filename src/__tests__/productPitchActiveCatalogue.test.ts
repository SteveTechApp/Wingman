import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const pageSource = readFileSync(
  resolve(process.cwd(), "src/wingman2/pages/ProductPitchPage.tsx"),
  "utf8",
);

const excludedSkus = [
  "SW-0X01-8K",
  "SW-120-TX3-US",
  "SW-130-TX-US",
  "SW-540-TX-W",
] as const;

describe("Product Pitch active catalogue", () => {
  it("keeps manually rejected red-X products in the explicit blocklist", () => {
    for (const sku of excludedSkus) {
      expect(pageSource).toContain(`"${sku}"`);
    }
  });

  it("filters rejected products from active catalogue results", () => {
    expect(pageSource).toContain(
      "if (!isVisibleProductPitchProduct(product)) return false;",
    );
  });

  it("filters rejected products from current project suggestions", () => {
    expect(pageSource).toContain(
      "return isVisibleProductPitchProduct(product)",
    );
  });

  it("keeps the complete lifecycle catalogue loaded for recently viewed history", () => {
    expect(pageSource).not.toMatch(
      /normaliseProductRecord\(entry, index\)[\s\S]{0,180}\.filter\(isVisibleProductPitchProduct\)/,
    );
  });

  it("keeps regional US products outside the UK active catalogue", () => {
    expect(pageSource).toContain(
      'if (value.endsWith("-US")) return true;',
    );
  });
});