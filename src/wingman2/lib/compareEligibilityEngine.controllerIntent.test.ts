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

describe("controller-role compare eligibility", () => {
  it("lets an explicit controller role win over descriptive AVoIP wording", () => {
    expect(classifyCompareIntent(acm210)).toBe("controller-accessory");
  });

  it("recommends NHD-CTL-PRO-V2 for ACM210 instead of a NetworkHD encoder", () => {
    const ranked = applyCompareEligibilityRanking(
      { competitor: acm210, matches: [] as Array<Record<string, any>> },
      [controller, encoder],
      "Blustream ACM210",
    );

    expect(ranked.matches?.[0]?.sku).toBe("NHD-CTL-PRO-V2");
    expect(ranked.matches?.some((match) => match.sku === "NHD-500-TX")).toBe(false);
    expect(ranked.matches?.[0]?.compareEligibility?.intent).toBe("controller-accessory");
  });
});
