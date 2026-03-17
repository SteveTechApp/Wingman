import { describe, expect, it } from "vitest";

import { designRoom } from "./roomDesignerService";

describe("roomDesignerService", () => {
  it("uses current bronze AVoIP SKUs from the shared recommendation profile", async () => {
    const result = await designRoom({
      targetTier: "Bronze",
      discovery: {
        applicationType: "Distributed AV",
        sourceCount: "2",
        displayCount: "2",
        recommendedFamilies: ["AVoIP"],
      },
    });

    expect(result.recommendedFamilies).toContain("AVoIP");
    expect(result.suggestedSkus).toEqual(
      expect.arrayContaining(["NHD-120-TX", "NHD-120-RX"]),
    );
  });

  it("uses the shared gold Apollo bundle for premium presentation rooms", async () => {
    const result = await designRoom({
      targetTier: "Gold",
      discovery: {
        applicationType: "Executive boardroom",
        usbNeeds: "USB-C / BYOD",
        recommendedFamilies: ["Apollo"],
      },
    });

    expect(result.recommendedFamilies).toContain("Apollo");
    expect(result.suggestedSkus).toEqual(
      expect.arrayContaining(["SW-640L-TX-W", "APO-DG2"]),
    );
  });
});
