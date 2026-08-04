import { describe, expect, it } from "vitest";
import { applyCompareEligibilityRanking, classifyCompareIntent } from "./compareEligibilityEngine";

const acm210 = {
  sku: "ACM210",
  name: "ACM210",
  brand: "Blustream",
  category: "CONTROL",
  role: "controller",
  technology: "CONTROL",
  summary: "Advanced Control Module for Blustream multicast AVoIP systems with TCP/IP, RS-232, IR and GPIO.",
};

const controller = {
  sku: "NHD-CTL-PRO-V2",
  name: "Pro Controller for NetworkHD Series",
  category: "AVoIP",
  productRole: "system-controller",
  catalogVisibility: "conditional-default",
  lifecycleStatus: "active",
  description: "NetworkHD system controller with dual NIC, web setup, endpoint discovery, routing and control integration.",
};

const encoder = {
  sku: "NHD-500-TX",
  name: "4K60 encoder",
  category: "AVoIP",
  lifecycleStatus: "active",
  description: "NetworkHD 500 video encoder.",
};

const genericControlProcessor = {
  sku: "NX-1200",
  name: "NX-1200 Integrated Controller",
  domain: "CONTROL",
  category: "Control",
  role: "controller",
  summary: "Programmable automation processor for room control, touch panels and peripherals.",
};

const avoipEncoderWithAudioFeatures = {
  sku: "IP250UHD-TX",
  name: "IP250UHD-TX",
  domain: "AVOIP",
  category: "AVoIP",
  role: "encoder",
  summary: "4K AV over IP encoder with Dante audio, USB and control integration.",
};

describe("controller-role compare eligibility", () => {
  it("lets an explicit controller role win over descriptive AVoIP wording", () => {
    expect(classifyCompareIntent(acm210)).toBe("controller-accessory");
  });

  it("recommends NHD-CTL-PRO-V2 for ACM210 instead of a NetworkHD encoder", () => {
    const ranked = applyCompareEligibilityRanking(
      { competitor: acm210, matches: [encoder] as Array<Record<string, any>>, rejected: [] as Array<Record<string, any>> },
      [controller, encoder],
      "Blustream ACM210",
    );

    expect(ranked.matches?.[0]?.sku).toBe("NHD-CTL-PRO-V2");
    expect(ranked.matches?.some((match) => match.sku === "NHD-500-TX")).toBe(false);
    expect(ranked.matches?.[0]?.compareEligibility?.intent).toBe("controller-accessory");
    expect(ranked.rejected?.some((match) => match.sku === "NHD-500-TX")).toBe(true);
  });

  it("uses governed AVoIP direction before descriptive audio features", () => {
    expect(classifyCompareIntent(avoipEncoderWithAudioFeatures)).toBe("av-over-ip-encoder");
  });

  it("fails closed for a generic automation processor instead of recommending AV transport", () => {
    expect(classifyCompareIntent(genericControlProcessor)).toBe("control-system");

    const ranked = applyCompareEligibilityRanking(
      { competitor: genericControlProcessor, matches: [encoder] as Array<Record<string, any>>, rejected: [] as Array<Record<string, any>> },
      [controller, encoder],
      "NX-1200 automation processor with HDMI monitoring and USB peripherals",
    );

    expect(ranked.matches).toEqual([]);
    expect(ranked.rejected?.some((match) => match.sku === "NHD-500-TX")).toBe(true);
  });

  it("preserves an explicit software-only role before wireless-family inference", () => {
    expect(classifyCompareIntent(
      { sku: "Solstice Gen3", domain: "WIRELESS_PRESENTATION", role: "wireless presentation" },
      "Solstice Gen3 | Software Platform | platform / software generation | wireless collaboration",
    )).toBe("control-system");
  });
});
