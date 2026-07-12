import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { selectWingmanProducts } from "../wingman2/lib/productSelectorEngine";

const pageSource = readFileSync(
  resolve(process.cwd(), "src/wingman2/pages/ProductPitchPage.tsx"),
  "utf8",
);

const blockedProducts = [
  { sku: "SW-0X01-8K", name: "Rejected switch", family: "Switching", category: "Switch" },
  { sku: "SW-120-TX3-US", name: "Regional US transmitter", family: "Presentation", category: "Transmitter" },
  { sku: "SW-130-TX-US", name: "Regional US transmitter", family: "Presentation", category: "Transmitter" },
  { sku: "SW-540-TX-W", name: "Rejected wireless transmitter", family: "Presentation", category: "Wireless" },
  { sku: "NHD-400-TX", name: "Legacy NetworkHD 400 transmitter", family: "NetworkHD", category: "AV over IP" },
];

const activeProduct = {
  sku: "NHD-500-TX",
  name: "NetworkHD 500 encoder",
  family: "NetworkHD 500",
  category: "AV over IP",
  description: "Source-side encoder transmitter endpoint.",
};

function productPitchDecisions() {
  return selectWingmanProducts([...blockedProducts, activeProduct], {
    mode: "product-pitch",
    includeBrowseOnly: true,
  });
}

describe("Product Pitch active catalogue", () => {
  it("keeps legacy, rejected and regional SKUs out of active catalogue results through the shared engine", () => {
    const eligibleSkus = productPitchDecisions()
      .filter((decision) => decision.eligible)
      .map((decision) => decision.sku);

    for (const product of blockedProducts) {
      expect(eligibleSkus).not.toContain(product.sku);
    }

    expect(eligibleSkus).toContain("NHD-500-TX");
  });

  it("keeps rejected products from current project suggestions by only accepting compatible engine decisions", () => {
    const blocked = productPitchDecisions().find((decision) => decision.sku === "SW-0X01-8K");
    const active = productPitchDecisions().find((decision) => decision.sku === "NHD-500-TX");

    expect(blocked?.eligible).toBe(false);
    expect(blocked?.rejectionReasons.join(" ")).toMatch(/selector policy/i);
    expect(active?.eligible).toBe(true);
    expect(active?.status).toBe("compatible");
  });

  it("keeps the complete lifecycle catalogue loaded for recently viewed history", () => {
    expect(pageSource).not.toMatch(
      /normaliseProductRecord\(entry, index\)[\s\S]{0,180}\.filter\(isVisibleProductPitchProduct\)/,
    );
  });

  it("uses the shared selector engine rather than a Product Pitch local blocklist", () => {
    expect(pageSource).toMatch(/selectWingmanProducts/);
    expect(pageSource).not.toMatch(/PRODUCT_PITCH_BLOCKED_SKUS|isVisibleProductPitchProduct|productSelectorScore/);
  });
});
