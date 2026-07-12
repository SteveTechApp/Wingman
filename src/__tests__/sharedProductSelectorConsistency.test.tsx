import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { selectWingmanProducts } from "../wingman2/lib/productSelectorEngine";

const repoRoot = process.cwd();

const products = [
  {
    sku: "NHD-500-TX",
    name: "NetworkHD 500 encoder",
    family: "NetworkHD 500",
    category: "AV over IP",
    description: "Source-side encoder transmitter endpoint.",
    tags: ["NetworkHD", "500", "encoder", "transmitter"],
  },
  {
    sku: "NHD-500-RX",
    name: "NetworkHD 500 decoder",
    family: "NetworkHD 500",
    category: "AV over IP",
    description: "Display-side decoder receiver endpoint.",
    tags: ["NetworkHD", "500", "decoder", "receiver"],
  },
  {
    sku: "CAB-HAOC-15",
    name: "15m HDMI active optical cable",
    family: "Cable",
    category: "Cable",
    description: "HDMI cable accessory.",
    tags: ["cable"],
  },
];

function readSource(path: string) {
  return readFileSync(join(repoRoot, path), "utf8");
}

describe("shared product selector consistency", () => {
  it("uses the same allowed lead products across the primary selector surfaces", () => {
    const request = {
      query: "NetworkHD 500",
      technicalRequirement: "Need a source-side encoder transmitter for NetworkHD 500",
    };
    const modes = ["finder", "product-pitch", "call-card", "compare", "embedded"] as const;

    const leadSets = modes.map((mode) =>
      selectWingmanProducts(products, { mode, ...request })
        .filter((decision) => decision.eligible)
        .map((decision) => decision.sku),
    );

    leadSets.forEach((skus) => {
      expect(skus).toContain("NHD-500-TX");
      expect(skus).not.toContain("NHD-500-RX");
      expect(skus).not.toContain("CAB-HAOC-15");
    });
  });

  it("keeps the primary selector consumers wired to the shared engine", () => {
    expect(readSource("src/wingman2/pages/ProductPitchPage.tsx")).toMatch(/productSelectorEngine/);
    expect(readSource("src/wingman2/pages/ProductCallCardsPage.tsx")).toMatch(/productSelectorEngine/);
    expect(readSource("src/wingman2/pages/FinderPage.tsx")).toMatch(/productSelectorEngine/);
    expect(readSource("src/wingman2/pages/CatalogBrowserPage.tsx")).toMatch(/productSelectorEngine/);
    expect(readSource("src/wingman2/lib/compareEligibilityEngine.ts")).toMatch(/productSelectorEngine/);
  });
});
