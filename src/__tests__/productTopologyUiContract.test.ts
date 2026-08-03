import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const productPitchSource = readFileSync(
  resolve(process.cwd(), "src/wingman2/pages/ProductPitchPage.tsx"),
  "utf8",
);

const schematicSource = readFileSync(
  resolve(process.cwd(), "src/wingman2/components/RoomSchematicDiagram.tsx"),
  "utf8",
);

describe("Product Pitch topology UI contract", () => {
  it("delegates the schematic to the Visual Design Studio rather than embedding a diagram", () => {
    // The Product Pitch page routes the rep into the Visual Design Studio to
    // build the real signal path, instead of embedding an auto-generated
    // topology diagram inline. The governed topology profile still backs the
    // exported cheat sheet (productCheatSheet.ts) and the RoomSchematicDiagram
    // component keeps its safeguards (asserted below).
    expect(productPitchSource).toContain("routeCatalogByKey.visualDesign.path");
    expect(productPitchSource).toMatch(/schematic/i);
    // The old inline topology profile / raw diagram markup is no longer here.
    expect(productPitchSource).not.toContain("buildProductTopologyProfile");
    expect(productPitchSource).not.toContain(
      '<strong className="mt-2 block text-lg text-white">{narrative.diagramSource}</strong>',
    );
  });

  it("surfaces topology confidence and safeguards", () => {
    expect(schematicSource).toContain("data-product-topology-confidence");
    expect(schematicSource).toContain("Diagram safeguards");
    expect(schematicSource).toContain(
      "Checks before this diagram is used in a proposal",
    );
  });
});
