import { describe, expect, it } from "vitest";
import {
  applyCompareEligibilityRanking,
  classifyCompareIntent,
  evaluateProductEligibility,
} from "./compareEligibilityEngine";

const products = [
  { sku: "NHD-000-CTL", name: "NetworkHD controller", role: "system-controller / conditional-default" },
  { sku: "NHD-000-RACK4", name: "NetworkHD rack mount", role: "rack-mount / request-only" },
  { sku: "NHD-110-TX", name: "NetworkHD encoder transmitter", role: "endpoint-hardware / default" },
  { sku: "NHD-110-RX", name: "NetworkHD decoder receiver", role: "endpoint-hardware / default" },
  { sku: "NHD-600-TRX", name: "NetworkHD 600 transceiver SDVoE 10G", role: "endpoint-hardware / default" },
  { sku: "NHD-0401-MV", name: "4 input multiview processor for NetworkHD", role: "primary-hardware / default" },
  { sku: "MX-0402-MST", name: "4x2 matrix switcher", role: "primary-hardware / default" },
  { sku: "MX-0808-KIT-V2", name: "8x8 HDBaseT matrix kit", role: "primary-hardware / default" },
  { sku: "SW-0206-VW", name: "Dedicated 4K video wall processor", role: "primary-hardware / default" },
];

describe("compare eligibility engine", () => {
  it("classifies common competitor intents", () => {
    expect(classifyCompareIntent({ sku: "VS-88H2A", role: "8x8 HDMI matrix" })).toBe("matrix");
    expect(classifyCompareIntent({ sku: "NAV D 121", role: "AV over IP decoder" })).toBe("av-over-ip-decoder");
    expect(classifyCompareIntent({ sku: "LCD video wall processor" })).toBe("video-wall-processor");
  });

  it("prevents accessories and controllers from becoming lead replacements", () => {
    const eligibility = evaluateProductEligibility({
      intent: "av-over-ip-decoder",
      competitorText: "NAV D 121 AV over IP decoder",
      match: { sku: "NHD-000-CTL" },
      product: products[0],
    });

    expect(eligibility.eligibility).toBe("blocked");
    expect(eligibility.blockers.join(" ")).toMatch(/cannot be a lead replacement/i);
  });

  it("prefers decoder or transceiver candidates for decoder competitor requests", () => {
    const result = applyCompareEligibilityRanking(
      {
        competitor: { sku: "NAV D 121", role: "AV over IP decoder receiver" },
        matches: [
          { sku: "NHD-000-CTL" },
          { sku: "NHD-110-TX" },
          { sku: "NHD-110-RX" },
          { sku: "NHD-600-TRX" },
        ],
        rejected: [] as Array<{ sku?: string }>,
      },
      products,
      "NAV D 121 decoder receiver endpoint",
    );

    expect(result.matches?.[0]?.sku).toMatch(/NHD-110-RX|NHD-600-TRX/);
    expect(result.rejected?.some((item) => item.sku === "NHD-000-CTL")).toBe(true);
  });

  it("prefers correctly sized matrix candidates over oversized or unrelated products", () => {
    const result = applyCompareEligibilityRanking(
      {
        competitor: { sku: "MMX4x2-HDMI", role: "4x2 HDMI matrix" },
        matches: [
          { sku: "NHD-000-CTL" },
          { sku: "MX-0808-KIT-V2" },
          { sku: "MX-0402-MST" },
        ],
        rejected: [] as Array<{ sku?: string }>,
      },
      products,
      "4x2 HDMI matrix",
    );

    expect(result.matches?.[0]?.sku).toBe("MX-0402-MST");
    expect(result.rejected?.some((item) => item.sku === "NHD-000-CTL")).toBe(true);
  });

  it("keeps dedicated video wall processors ahead of AV-over-IP wall alternatives", () => {
    const result = applyCompareEligibilityRanking(
      {
        competitor: { sku: "LCD video wall processor", role: "dedicated video wall processor" },
        matches: [
          { sku: "NHD-000-RACK4" },
          { sku: "NHD-0401-MV" },
          { sku: "SW-0206-VW" },
        ],
        rejected: [] as Array<{ sku?: string }>,
      },
      products,
      "dedicated LCD video wall processor",
    );

    expect(result.matches?.[0]?.sku).toBe("SW-0206-VW");
    expect(result.rejected?.some((item) => item.sku === "NHD-000-RACK4")).toBe(true);
  });
});