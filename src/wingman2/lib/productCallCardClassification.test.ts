import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  classifyProductCallCard,
  PRODUCT_CALL_CARD_HEADINGS,
  type ProductCallCardClassificationInput,
} from "./productCallCardClassification";

type ProductIndex = {
  products: Array<ProductCallCardClassificationInput & { sku: string }>;
};

const productIndex = JSON.parse(
  readFileSync(join(process.cwd(), "public/product-intelligence-index.json"), "utf8"),
) as ProductIndex;

function headingsFor(sku: string) {
  const product = productIndex.products.find((candidate) => candidate.sku === sku);
  expect(product, `${sku} should be present in the product index`).toBeTruthy();
  return classifyProductCallCard(product!);
}

describe("Product Call Cards classification", () => {
  it("uses the governed major product headings", () => {
    expect(PRODUCT_CALL_CARD_HEADINGS).toEqual([
      "All",
      "Audio",
      "Extender Kits",
      "DA / Splitters",
      "Presentation Switchers",
      "Matrix Switchers",
      "Wireless Casting",
      "Unified Comms",
      "AVoIP",
      "Video Wall",
      "Control",
    ]);
  });

  it("classifies representative products from the real product index", () => {
    expect(headingsFor("AMP-2120")).toContain("Audio");
    expect(headingsFor("AMP-260-DNT")).toContain("Audio");
    expect(headingsFor("EXP-MX-0808-KIT")).toContain("Extender Kits");
    expect(headingsFor("SP-0104-H2")).toContain("DA / Splitters");
    expect(headingsFor("SW-0401-H2")).toContain("Presentation Switchers");
    expect(headingsFor("MX-0402-MST")).toEqual(expect.arrayContaining(["Presentation Switchers", "Matrix Switchers"]));
    expect(headingsFor("APO-DG2-PRO")).toContain("Wireless Casting");
    expect(headingsFor("APO-VX20-UC-V2")).toContain("Unified Comms");
    expect(headingsFor("CAM-210-NDI-PTZ")).toContain("Unified Comms");
    expect(headingsFor("NHD-0401-MV")).toEqual(expect.arrayContaining(["AVoIP", "Video Wall"]));
    expect(headingsFor("SW-0204-VW")).toContain("Video Wall");
    expect(headingsFor("SW-0206-VW")).toContain("Video Wall");
    expect(headingsFor("NHD-CTL-PRO")).toEqual(expect.arrayContaining(["AVoIP", "Control"]));
    expect(headingsFor("SYN-TOUCH10")).toContain("Control");
  });

  it("allows genuinely relevant products in more than one heading", () => {
    const headings = classifyProductCallCard({
      sku: "MX-0808-KIT-V2",
      name: "8x8 HDBaseT matrix kit",
      category: "Matrix",
      productType: "HDBaseT extender kit",
      summary: "Fixed I/O matrix supplied as a transmitter and receiver kit.",
    });

    expect(headings).toEqual(expect.arrayContaining(["Extender Kits", "Matrix Switchers"]));
  });
});
