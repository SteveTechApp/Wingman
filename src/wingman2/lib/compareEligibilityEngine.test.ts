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
  { sku: "MX-0403-H3-MST", name: "4x3 presentation switcher", role: "primary-hardware / default" },
  { sku: "MX-0808-KIT-V2", name: "8x8 HDBaseT matrix kit", role: "primary-hardware / default" },
  { sku: "MXV-0808-H2A-MK2", name: "8x8 18Gbps HDBaseT matrix mainframe", role: "primary-hardware / default" },
  { sku: "MX-0808-SCL-V2", name: "8x8 seamless scaling matrix", role: "primary-hardware / default" },
  { sku: "SW-0206-VW", name: "Dedicated 4K video wall processor", role: "primary-hardware / default" },
  { sku: "SW-740-TX", name: "Discontinued presentation switcher", role: "primary-hardware / default" },
  { sku: "CAM-210-NDI-PTZ", name: "NDI PTZ camera", role: "primary-hardware / default" },
  { sku: "CAM-420-PTZ", name: "PTZ camera", role: "primary-hardware / default" },
  { sku: "AMP-2120-DNT", name: "Dante amplifier", role: "primary-hardware / default" },
  { sku: "EX-70-H2", name: "HDBaseT extender", role: "primary-hardware / default" },
  { sku: "EX-35-H2", name: "Compact HDBaseT extender", role: "primary-hardware / default" },
  { sku: "EX-100-H2", name: "Discontinued HDBaseT extender", role: "primary-hardware / default" },
  { sku: "APO-VX20-UC-V2", name: "Apollo VX20 UC V2", role: "primary-hardware / default" },
  { sku: "APO-DG2-PRO", name: "Apollo DG2 Pro", role: "primary-hardware / default" },
  { sku: "CAB-HAOC-10", name: "HDMI cable", role: "primary-hardware / default" },
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
    expect(classifyCompareIntent({ sku: "ClickShare CX-50", role: "wireless presentation" })).toBe("wireless-casting");
    expect(classifyCompareIntent({ sku: "Q-SYS Core 110f", role: "Dante audio DSP" })).toBe("network-audio");
  });

  it("prevents accessories and controllers from becoming lead replacements", () => {
    const eligibility = evaluateProductEligibility({
      intent: "av-over-ip-decoder",
      competitorText: "NAV D 121 AV over IP decoder",
      match: { sku: "NHD-000-CTL" },
      product: products[0],
    });

    expect(eligibility.eligibility).toBe("blocked");
    expect(eligibility.blockers.join(" ")).toMatch(/must not be suggested as a current compare lead/i);
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

    expect(["MX-0402-MST", "MX-0403-H3-MST"]).toContain(result.matches?.[0]?.sku);
    expect(result.matches?.some((item) => item.sku === "MX-0402-MST" || item.sku === "MX-0403-H3-MST")).toBe(true);
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

  it("keeps 6x2 routed matrix requests on larger 8x8 matrix candidates instead of undersized 4x2 switchers", () => {
    const result = applyCompareEligibilityRanking(
      {
        competitor: {
          sku: "MMX6x2-HT200",
          role: "Matrix",
          transport: "HDMI / TPS",
          inputCount: 6,
          outputCount: 2,
        },
        matches: [
          { sku: "MX-0402-MST" },
          { sku: "MX-0808-KIT-V2" },
          { sku: "MXV-0808-H2A-MK2" },
        ],
        rejected: [] as Array<{ sku?: string }>,
      },
      products,
      "MMX6x2-HT200 6x2 HDMI TPS matrix",
    );
    const lead = result.matches?.[0] as { sku?: string; compareEligibility?: { eligibility?: string } } | undefined;

    expect(lead?.sku).toMatch(/0808/);
    expect(lead?.compareEligibility?.eligibility).toBe("direct");
    expect(lead?.sku).not.toBe("MX-0402-MST");
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

  it("keeps network-audio competitors out of the NetworkHD video lane", () => {
    const result = applyCompareEligibilityRanking(
      {
        competitor: { sku: "Q-SYS Core 110f", role: "Dante audio DSP" },
        matches: [
          { sku: "NHD-500-TX" },
          { sku: "AMP-2120-DNT" },
        ],
        rejected: [] as Array<{ sku?: string }>,
      },
      products,
      "Q-SYS Core 110f Dante audio DSP",
    ) as { compareIntent?: string; matches?: Array<{ sku?: string }>; rejected?: Array<{ sku?: string }> };

    expect(result.compareIntent).toBe("network-audio");
    expect(result.matches?.[0]?.sku).toBe("AMP-2120-DNT");
    expect(result.matches?.some((item) => item.sku === "NHD-500-TX")).toBe(false);
    expect(result.rejected?.some((item) => item.sku === "NHD-500-TX")).toBe(true);
  });

  it("keeps wireless presentation competitors out of the NetworkHD endpoint lane", () => {
    const result = applyCompareEligibilityRanking(
      {
        competitor: { sku: "ClickShare CX-50", role: "wireless presentation and sharing" },
        matches: [
          { sku: "NHD-500-TX" },
          { sku: "APO-VX20-UC-V2" },
        ],
        rejected: [] as Array<{ sku?: string }>,
      },
      products,
      "ClickShare CX-50 wireless presentation",
    ) as { compareIntent?: string; matches?: Array<{ sku?: string }>; rejected?: Array<{ sku?: string }> };

    expect(result.compareIntent).toBe("wireless-casting");
    expect(result.matches?.[0]?.sku).toBe("APO-VX20-UC-V2");
    expect(result.matches?.some((item) => item.sku === "NHD-500-TX")).toBe(false);
    expect(result.rejected?.some((item) => item.sku === "NHD-500-TX")).toBe(true);
  });

  it("blocks discontinued, do-not-spec and cable SKUs from accepted compare results", () => {
    const result = applyCompareEligibilityRanking(
      {
        competitor: { sku: "AT-OME-CS31-SA", role: "presentation switcher" },
        matches: [
          { sku: "SW-740-TX" },
          { sku: "MX-0402-MST" },
          { sku: "APO-DG2-PRO" },
          { sku: "CAB-HAOC-10" },
        ],
        rejected: [] as Array<{ sku?: string }>,
      },
      products,
      "presentation switcher",
    );

    expect(["MX-0402-MST", "MX-0403-H3-MST"]).toContain(result.matches?.[0]?.sku);
    expect(result.matches?.some((item) => item.sku === "MX-0402-MST" || item.sku === "MX-0403-H3-MST")).toBe(true);
    expect(result.matches?.some((item) => item.sku === "SW-740-TX")).toBe(false);
    expect(result.matches?.some((item) => item.sku === "APO-DG2-PRO")).toBe(false);
    expect(result.matches?.some((item) => item.sku === "CAB-HAOC-10")).toBe(false);
    expect(result.rejected?.some((item) => item.sku === "SW-740-TX")).toBe(true);
    expect(result.rejected?.some((item) => item.sku === "APO-DG2-PRO")).toBe(true);
    expect(result.rejected?.some((item) => item.sku === "CAB-HAOC-10")).toBe(true);
  });

  it("blocks discontinued extender SKUs and keeps current extender candidates", () => {
    const result = applyCompareEligibilityRanking(
      {
        competitor: { sku: "AT-OME-EX-KIT", role: "HDBaseT extender" },
        matches: [
          { sku: "EX-100-H2" },
          { sku: "EX-70-H2" },
          { sku: "EX-35-H2" },
        ],
        rejected: [] as Array<{ sku?: string }>,
      },
      products,
      "point-to-point HDBaseT extender",
    );

    expect(result.matches?.some((item) => item.sku === "EX-100-H2")).toBe(false);
    expect(result.matches?.some((item) => item.sku === "EX-70-H2")).toBe(true);
    expect(result.rejected?.some((item) => item.sku === "EX-100-H2")).toBe(true);
  });

});
