import { describe, expect, it } from "vitest";
import {
  applyCompareEligibilityRanking,
  classifyCompareIntent,
  evaluateProductEligibility,
} from "./compareEligibilityEngine";

const products = [
  { sku: "NHD-000-CTL", name: "NetworkHD controller", role: "system-controller / conditional-default" },
  { sku: "NHD-000-RACK4", name: "NetworkHD rack mount", role: "rack-mount / request-only" },
  { sku: "NHD-500-TX", name: "NetworkHD 500 encoder transmitter", role: "endpoint-hardware / default" },
  { sku: "NHD-500-RX", name: "NetworkHD 500 decoder receiver", role: "endpoint-hardware / default" },
  { sku: "NHD-600-TRX", name: "NetworkHD 600 transceiver SDVoE 10G", role: "endpoint-hardware / default" },
  { sku: "NHD-0401-MV", name: "4 input multiview processor for NetworkHD", role: "primary-hardware / default" },
  { sku: "MX-0404-HDMI", name: "4x4 HDMI matrix switcher", role: "primary-hardware / default" },
  { sku: "MX-0402-MST", name: "4x2 matrix switcher", role: "primary-hardware / default" },
  { sku: "MX-0808-KIT-V2", name: "8x8 HDBaseT matrix kit", role: "primary-hardware / default" },
  { sku: "SW-0206-VW", name: "Dedicated 4K video wall processor", role: "primary-hardware / default" },
  { sku: "CAM-210-NDI-PTZ", name: "NDI PTZ camera", role: "primary-hardware / default" },
  { sku: "CAM-420-PTZ", name: "PTZ camera", role: "primary-hardware / default" },
];

describe("compare eligibility engine", () => {
  it("classifies common competitor intents", () => {
    expect(classifyCompareIntent({ sku: "VS-88H2A", role: "8x8 HDMI matrix" })).toBe("matrix");
    expect(classifyCompareIntent({ sku: "NAV D 121", role: "AV over IP decoder" })).toBe("av-over-ip-decoder");
    expect(classifyCompareIntent({ sku: "DTP3 R 201", role: "HDBaseT receiver" })).toBe("extender");
    expect(classifyCompareIntent({ sku: "C88CS", role: "8x8 HDBaseT matrix with receivers" })).toBe("hdbaset-matrix");
    expect(classifyCompareIntent({ sku: "KDS-USB2", role: "USB extension receiver" })).toBe("extender");
    expect(classifyCompareIntent({ sku: "LCD video wall processor" })).toBe("video-wall-processor");
    expect(classifyCompareIntent({ sku: "BirdDog P400", role: "NDI PTZ camera" })).toBe("ndi-camera");
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

  it("maps a 1G decoder competitor to the 500-series receiver and blocks the 10G 600 transceiver", () => {
    const result = applyCompareEligibilityRanking(
      {
        competitor: { sku: "NAV D 121", role: "AV over IP decoder receiver" },
        matches: [
          { sku: "NHD-000-CTL" },
          { sku: "NHD-500-TX" },
          { sku: "NHD-500-RX" },
          { sku: "NHD-600-TRX" },
        ],
        rejected: [] as Array<{ sku?: string }>,
      },
      products,
      "NAV D 121 decoder receiver endpoint",
    );

    // NAV is a 1G endpoint -> 500 series; the 10G 600-TRX must never be mixed in.
    expect(result.matches?.[0]?.sku).toBe("NHD-500-RX");
    expect(result.matches?.some((item) => item.sku === "NHD-600-TRX")).toBe(false);
    expect(result.rejected?.some((item) => item.sku === "NHD-600-TRX")).toBe(true);
    expect(result.rejected?.some((item) => item.sku === "NHD-000-CTL")).toBe(true);
  });

  it("blocks receiver-only and 10G endpoints for a 1G encoder competitor request", () => {
    const result = applyCompareEligibilityRanking(
      {
        competitor: { sku: "NAV E 121", role: "AV over IP encoder transmitter" },
        matches: [
          { sku: "NHD-500-RX" },
          { sku: "NHD-500-TX" },
          { sku: "NHD-600-TRX" },
        ],
        rejected: [] as Array<{ sku?: string }>,
      },
      products,
      "NAV E 121 encoder transmitter endpoint",
    );

    expect(result.matches?.[0]?.sku).toBe("NHD-500-TX");
    expect(result.matches?.some((item) => item.sku === "NHD-500-RX")).toBe(false);
    expect(result.matches?.some((item) => item.sku === "NHD-600-TRX")).toBe(false);
    expect(result.rejected?.some((item) => item.sku === "NHD-500-RX")).toBe(true);
    expect(result.rejected?.some((item) => item.sku === "NHD-600-TRX")).toBe(true);
  });

  it("maps a 10G/SDVoE competitor to the 600 series and blocks 1G NetworkHD endpoints", () => {
    const result = applyCompareEligibilityRanking(
      {
        competitor: { sku: "MXNet-10G-TCVR", role: "AV over IP transceiver", transport: "10G SDVoE" },
        matches: [
          { sku: "NHD-500-TX" },
          { sku: "NHD-500-RX" },
          { sku: "NHD-600-TRX" },
        ],
        rejected: [] as Array<{ sku?: string }>,
      },
      products,
      "MXNet-10G-TCVR 10G SDVoE transceiver",
    );

    expect(result.matches?.[0]?.sku).toBe("NHD-600-TRX");
    expect(result.matches?.some((item) => item.sku === "NHD-500-TX")).toBe(false);
    expect(result.matches?.some((item) => item.sku === "NHD-500-RX")).toBe(false);
    expect(result.rejected?.some((item) => item.sku === "NHD-500-RX")).toBe(true);
  });

  it("blocks retired legacy NetworkHD SKUs from ever becoming a comparison candidate", () => {
    const result = applyCompareEligibilityRanking(
      {
        competitor: { sku: "NAV E 121", role: "AV over IP encoder transmitter" },
        matches: [
          { sku: "NHD-110-TX" },
          { sku: "NHD-400-TX" },
          { sku: "NHD-500-TX" },
        ],
        rejected: [] as Array<{ sku?: string }>,
      },
      products,
      "NAV E 121 encoder transmitter endpoint",
    );

    expect(result.matches?.some((item) => item.sku === "NHD-110-TX")).toBe(false);
    expect(result.matches?.some((item) => item.sku === "NHD-400-TX")).toBe(false);
    expect(result.rejected?.some((item) => item.sku === "NHD-110-TX")).toBe(true);
    expect(result.matches?.[0]?.sku).toMatch(/NHD-500-TX|NHD-600-TRX/);
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

  it("keeps Blustream HMX44 4x4 matrix requests on correctly sized WyreStorm 4x4 matrices", () => {
    expect(classifyCompareIntent({ sku: "HMX44-18G-KIT" })).toBe("hdbaset-matrix");

    const result = applyCompareEligibilityRanking(
      {
        competitor: {
          sku: "HMX44-18G-KIT",
          role: "Matrix",
          transport: "HDMI matrix",
          inputCount: 4,
          outputCount: 4,
        },
        matches: [
          { sku: "MX-0808-KIT-V2" },
          { sku: "MX-0404-HDMI" },
        ],
        rejected: [] as Array<{ sku?: string }>,
      },
      products,
      "HMX44-18G-KIT",
    );

    const lead = result.matches?.[0] as { sku?: string; compareEligibility?: { eligibility?: string } } | undefined;

    expect(lead?.sku).toBe("MX-0404-HDMI");
    expect(lead?.compareEligibility?.eligibility).toBe("direct");
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
