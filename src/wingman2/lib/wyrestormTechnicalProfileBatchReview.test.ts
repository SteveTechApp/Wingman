import { describe, expect, it } from "vitest";
import { buildWyrestormCompareProfile } from "./wyrestormCompareProfile";
import { buildCompetitorDecisionEvidence } from "./competitorProductIntelligence";

describe("WyreStorm technical profile batch governed review (2026-08)", () => {
  it("promoted the wireless and matrix compare leads to official-tier, compare-ready profiles", () => {
    const leads = ["SW-620-TX-W", "SW-220-TX-W", "SW-510-TX", "SW-515-RX", "SW-0401-H2", "SW-120-TX3-UK"];
    for (const sku of leads) {
      const profile = buildWyrestormCompareProfile({
        sku,
        name: sku,
        family: "SW",
        category: "Presentation",
        description: "Wireless presentation switcher",
      } as never);
      // The 2026-08-16 structured review pass human-confirmed these leads
      // (verifiedBy recorded), so they render the verified tier and stay
      // compare-ready for the engine.
      expect(profile.sourceTier, `${sku} source tier`).toBe("verified-profile");
      expect(profile.readiness, `${sku} readiness`).toBe("compare-ready");
    }
  });

  it("gives the wireless lead SW-620-TX-W decision-readable power", () => {
    const profile = buildWyrestormCompareProfile({
      sku: "SW-620-TX-W",
      name: "Wireless presentation switcher",
      family: "SW",
      category: "Presentation",
      description: "4K30 wireless presentation switcher",
    } as never);
    expect(profile.specs?.externalPsu).toBe(true);
    expect(profile.specs?.powerSupply).toBe("20V 10A DC");
  });

  it("completed the previously-held profiles to official-tier, compare-ready status", () => {
    const completed = [
      "EX-100-IW-USBC",
      "EX-60-USB2",
      "EXA-100-EARC",
      "MX-0403-H3-MST",
      "MXV-0808-H2A-MK2",
      "NHD-600-E-TXRX",
      "NHD-610-RX",
    ];
    for (const sku of completed) {
      const profile = buildWyrestormCompareProfile({
        sku,
        name: sku,
        family: "Completed",
        category: "Completed",
        description: "Completed profile",
      } as never);
      expect(profile.readiness, `${sku} readiness`).toBe("compare-ready");
      // These previously-held profiles were all confirmed by the 2026-08-16
      // review passes, so they render the verified tier.
      expect(profile.sourceTier, `${sku} tier`).toBe("verified-profile");
    }
  });

  it("elevates the 2026-08-16 human-confirmed profiles to the verified tier", () => {
    const confirmed = ["MX-0808-SCL", "MX-1616-SCL"];
    for (const sku of confirmed) {
      const profile = buildWyrestormCompareProfile({
        sku,
        name: sku,
        family: "Verified",
        category: "Verified",
        description: "Human-confirmed profile",
      } as never);
      expect(profile.sourceTier, `${sku} tier`).toBe("verified-profile");
    }
  });

  it("exempts non-video products from the maxResolution compare-ready requirement", () => {
    // EX-60-USB2 is a USB 2.0-only extender and AMP-2120 an audio amplifier:
    // neither has video I/O, so neither is blocked by the video-resolution gate.
    for (const sku of ["EX-60-USB2", "AMP-2120"]) {
      const profile = buildWyrestormCompareProfile({
        sku,
        name: sku,
        family: "Non-video",
        category: "Non-video",
        description: "No video I/O",
      } as never);
      expect(profile.readiness, `${sku} readiness`).toBe("compare-ready");
    }
  });

  it("preserves the MX-0808-H2A-MK2 no-PoE/PoH pin while adding internal PSU facts", () => {
    const profile = buildWyrestormCompareProfile({
      sku: "MX-0808-H2A-MK2",
      name: "8x8 HDMI matrix",
      family: "MX",
      category: "Matrix",
      description: "Matrix",
    } as never);
    expect(profile.specs?.poe).toBe(false);
    expect(profile.specs?.poh).toBe(false);
    expect(profile.specs?.internalPsu).toBe(true);
    expect(profile.specs?.powerSupply).toBe("Local mains power");
  });

  it("leaves the bare-SKU CX-30 intelligence lookup at family-rule tier without a fingerprint", () => {
    // The WyreStorm side of the headline compare scenario is an official-tier,
    // compare-ready, power-verified profile, and the CX-30 fingerprint now
    // carries datasheet power facts too (competitorPowerFacts.test.ts pins the
    // resulting PARTIAL MATCH). This assertion guards the raw intelligence
    // lookup itself: with only a SKU and no curated fingerprint, the evidence
    // tier must stay honestly at family-rule rather than claiming a verified
    // profile that the data does not support.
    const intelligence = buildCompetitorDecisionEvidence({
      sku: "CLICKSHARE-CX-30",
      brand: "Barco",
      domain: "WIRELESS_PRESENTATION",
      role: "wireless-conferencing-hub",
      transport: "Local",
      maxResolution: "4K",
    } as never);
    expect(intelligence.tier).toBe("family-rule");
  });
});
