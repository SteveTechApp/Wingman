import { describe, expect, it } from "vitest";

import { buildAvDecisionEvidence } from "../wingman2/lib/avDecisionEvidence";
import { buildRecommendationEvidence } from "../wingman2/lib/recommendationEvidence";
import { wyrestormCapabilityVerdict } from "../wingman2/lib/wyrestormCapabilityProfiles";

describe("WyreStorm workflow capability truth", () => {
  it("keeps MST, multiview, wireless casting and wall capabilities distinct", () => {
    expect(wyrestormCapabilityVerdict("MX-0402-MST", "mst")).toBe(true);
    expect(wyrestormCapabilityVerdict("MX-0402-MST", "multiview")).toBe(false);
    expect(wyrestormCapabilityVerdict("SW-640L-TX-W", "chromecast")).toBe(true);
    expect(wyrestormCapabilityVerdict("SW-620L-TX-W", "chromecast")).toBe(false);
    expect(wyrestormCapabilityVerdict("NHD-600-TRX", "multiview")).toBe(true);
    expect(wyrestormCapabilityVerdict("NHD-600-TRX", "mosaicVideoWall")).toBe(false);
    expect(wyrestormCapabilityVerdict("SW-0206-VW", "videoWall")).toBe(true);
    expect(wyrestormCapabilityVerdict("SW-0206-VW", "multiview")).toBe(false);
  });
});

describe("Wingman workflow decision validation", () => {
  it("does not treat multiview or dual routing as USB-C MST", () => {
    const mst = buildAvDecisionEvidence({
      requirementText: "A USB-C laptop must run two independent extended desktops using MST.",
      productSku: "MX-0402-MST",
      productText: "Conference room matrix with two display outputs.",
    });

    const multiviewOnly = buildAvDecisionEvidence({
      requirementText: "A USB-C laptop must run two independent extended desktops using MST.",
      productSku: "NHD-600-TRX",
      productText: "Native multiview AV-over-IP transceiver.",
    });

    expect(mst.issues.some((issue) => issue.id === "mst-capability-not-evidenced")).toBe(false);
    expect(mst.requiredDependencies.join(" ")).toContain("Multi-Stream Transport");
    expect(multiviewOnly.issues.some((issue) => issue.id === "mst-capability-not-evidenced")).toBe(true);
  });

  it("requires actual multiview processing rather than inferring it from multi-display hardware", () => {
    const evidence = buildAvDecisionEvidence({
      requirementText: "Show four laptop sources at the same time in a multiview layout on one display.",
      productSku: "MX-0402-MST",
      productText: "Dual-display MST presentation switcher.",
    });

    expect(evidence.issues.some((issue) => issue.id === "multiview-capability-not-evidenced")).toBe(true);
  });

  it("checks named wireless casting protocols instead of assuming all wireless products are equivalent", () => {
    const evidence = buildAvDecisionEvidence({
      requirementText: "The room must support Chromecast wireless presentation for guest devices.",
      productSku: "APO-VX20-UC",
      productText: "Apollo wireless conferencing video bar.",
    });

    expect(evidence.issues.some((issue) => issue.id === "wireless-protocol-chromecast-not-evidenced")).toBe(true);
  });

  it("flags a mosaic wall brief when a NetworkHD 600 native-wall product is proposed", () => {
    const evidence = buildAvDecisionEvidence({
      requirementText: "A retail mosaic video wall with rotated portrait displays is required.",
      productSku: "NHD-600-TRX",
      productText: "10G SDVoE transceiver with native video wall processing.",
    });

    expect(evidence.issues.some((issue) => issue.id === "mosaic-wall-capability-not-evidenced")).toBe(true);
  });

  it("raises the presentation path for a wireless MST room while keeping the workflow checks visible", () => {
    const evidence = buildRecommendationEvidence({
      source: "capability-decision-test",
      query: "Small meeting room with USB-C MST extended desktops, AirPlay, Miracast, Chromecast and four-source multiview.",
      product: {
        sku: "SW-640L-TX-W",
        title: "Wireless presentation switcher",
        family: "Presentation / UC",
        category: "Presentation switching",
      },
    });

    expect(evidence.productFamilyScores?.[0]?.family).toBe("Presentation / UC");
    expect(evidence.productFamilyScores?.[0]?.reasons.join(" ")).toContain("MST");
    expect(evidence.productFamilyScores?.[0]?.reasons.join(" ")).toContain("Wireless casting");
    expect(evidence.quoteSafetyStatus).not.toBe("quote-ready");
  });
});
