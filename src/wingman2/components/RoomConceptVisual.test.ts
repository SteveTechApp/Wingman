import { describe, expect, it } from "vitest";
import { buildRoomConceptSvg } from "./RoomConceptVisual";

describe("RoomConceptVisual", () => {
  it("generates a real project-derived SVG with a concept disclaimer", () => {
    const svg = buildRoomConceptSvg({
      id: "project-1", name: "Boardroom", owner: "Wingman user", stage: "Discovery", status: "recommended",
      updated: "Now", resumeTo: "/wingman", createdAt: "2026-08-13", updatedAt: "2026-08-13",
      productSelections: [{ sku: "NHD-500-TX" }],
    });
    expect(svg).toContain("<svg");
    expect(svg).toContain("Boardroom");
    expect(svg).toContain("NHD-500-TX");
    expect(svg).toContain("CONCEPT ONLY");
  });
});
