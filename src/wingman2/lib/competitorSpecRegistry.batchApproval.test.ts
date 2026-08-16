import { describe, expect, it } from "vitest";
import { resolveCompetitorSpecProfile } from "./competitorSpecRegistry";

describe("competitor catalogue batch approval (audit P1-1)", () => {
  it.each([
    ["CLICKSHARE-CX-30", "Barco"],
    ["SHARELINK-PRO-1100", "Extron"],
    ["CX-50 Gen2", "Barco"],
    ["Rally Bar Mini", "Logitech"],
    ["Solstice Active Learning", "Mersive"],
  ])("promotes %s to verified-profile", (sku, brand) => {
    const profile = resolveCompetitorSpecProfile(sku, brand);
    expect(profile.specTier, `${sku} tier`).toBe("verified-profile");
    expect(profile.readiness, `${sku} readiness`).toBe("approved");
  });

  it("keeps family-level Crestron DMNVX input at family-rule", () => {
    const profile = resolveCompetitorSpecProfile("DMNVX", "Crestron");
    expect(profile.specTier).toBe("family-rule");
  });

  it("keeps the draft manufacturer row out of verified-profile", () => {
    const profile = resolveCompetitorSpecProfile("DTP3 R 201", "Extron");
    expect(profile.readiness).toBe("needs-evidence");
    expect(profile.specTier).not.toBe("verified-profile");
  });

  it("keeps weak-provenance sku-seed rows in review", () => {
    const profile = resolveCompetitorSpecProfile("Eyes HDMI", "BirdDog");
    expect(profile.specTier).not.toBe("verified-profile");
  });

  it("keeps the ClickShare Button accessory out of verified-profile", () => {
    const profile = resolveCompetitorSpecProfile("CLICKSHARE-BUTTON-5TH-GEN", "Barco");
    expect(profile.specTier).not.toBe("verified-profile");
  });
});
