import { describe, expect, it } from "vitest";

import { buildCatalogIntelligence } from "@/features/catalog/catalogIntelligence";

describe("buildCatalogIntelligence", () => {
  it("uses the shared recommendation engine to choose the primary family", () => {
    const result = buildCatalogIntelligence({
      name: "Project",
      stage: "Discovery",
      roomType: "Boardroom",
      application: "Meeting room refresh",
      displayCount: 2,
      sourceCount: 3,
      distanceM: 20,
      avGuide: {
        usb: "USB-C BYOD",
        audio: "",
        control: "",
      },
      bom: [],
    });

    expect(result.primaryFamily).toBe("Apollo");
    expect(result.reasoning).toContain("Apollo");
    expect(result.shortlist.length).toBeGreaterThan(0);
  });
});
