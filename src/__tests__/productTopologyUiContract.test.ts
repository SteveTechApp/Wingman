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
  it("uses the governed topology profile for the visual and connection summary", () => {
    expect(productPitchSource).toContain("buildProductTopologyProfile");
    expect(productPitchSource).toContain("topology.source.title");
    expect(productPitchSource).toContain("topology.output.title");
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
