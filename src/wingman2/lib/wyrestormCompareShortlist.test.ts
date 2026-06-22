import { describe, expect, it } from "vitest";
import {
  buildWyreStormCompareShortlist,
  explainWyreStormCompareShortlist,
  type CompareShortlistProduct,
} from "./wyrestormCompareShortlist";

const products: CompareShortlistProduct[] = [
  { sku: "NHD-600-TRX", name: "NetworkHD 600 transceiver", family: "NetworkHD 600", description: "10G SDVoE AVoIP" },
  { sku: "NHD-500-RX", name: "NetworkHD 500 receiver", family: "NetworkHD 500", description: "1GbE JPEG-XS receiver" },
  { sku: "NHD-500-TX", name: "NetworkHD 500 transmitter", family: "NetworkHD 500", description: "1GbE JPEG-XS transmitter" },
  { sku: "NHD-120-RX", name: "NetworkHD 100 receiver", family: "NetworkHD 100", description: "1GbE receiver" },
  { sku: "NHD-124-TX", name: "NetworkHD 100 transmitter", family: "NetworkHD 100", description: "1GbE transmitter" },
  { sku: "NHD-150-RX", name: "NetworkHD 100 multiview receiver", family: "NetworkHD 100", description: "multiview receiver" },
  { sku: "NHD-0401-MV", name: "4 input multiview processor", description: "standalone multiview" },
  { sku: "SW-0206-VW", name: "Video wall processor", description: "video wall processor" },
  { sku: "SW-0204-VW", name: "Preset video wall processor", description: "simple video wall" },
  { sku: "SW-620-TX-W", name: "Wireless presentation switcher", description: "presentation switcher wireless" },
  { sku: "APO-VX20-UC-V2", name: "Apollo UC soundbar", description: "USB conferencing soundbar" },
  { sku: "AMP-2120-DNT", name: "Dante amplifier", description: "network audio amplifier Dante DSP" },
];

describe("wyrestormCompareShortlist", () => {
  it("shortlists only NetworkHD 600 for 10G AVoIP intent", () => {
    const result = buildWyreStormCompareShortlist({
      competitorText: "Competitor 10GbE SDVoE AVoIP receiver zero latency",
      wyrestormProducts: products,
    });

    expect(result.intent).toBe("avoip_10g");
    expect(result.candidateSkus).toContain("NHD-600-TRX");
    expect(result.candidateSkus).not.toContain("NHD-500-RX");
  });

  it("shortlists the 1G 500-series receiver for an unknown-codec AVoIP receiver, never the 100 series or 10G", () => {
    const result = buildWyreStormCompareShortlist({
      competitorText: "Competitor AV over IP decoder receiver 1GbE",
      wyrestormProducts: products,
    });

    expect(result.intent).toBe("avoip_1g_decoder");
    expect(result.candidateSkus).toContain("NHD-500-RX");
    // codec unknown -> 500 is the default; do not mix in the 100 series or 10G 600
    expect(result.candidateSkus).not.toContain("NHD-120-RX");
    expect(result.candidateSkus).not.toContain("NHD-600-TRX");
  });

  it("shortlists the 1G 100-series receiver when the competitor is H.264/H.265", () => {
    const result = buildWyreStormCompareShortlist({
      competitorText: "Competitor AV over IP H.265 decoder receiver 1GbE",
      wyrestormProducts: products,
    });

    expect(result.intent).toBe("avoip_1g_decoder");
    expect(result.candidateSkus).toContain("NHD-120-RX");
    expect(result.candidateSkus).not.toContain("NHD-500-RX");
    expect(result.candidateSkus).not.toContain("NHD-600-TRX");
  });

  it("shortlists multiview products where multiview is requested", () => {
    const result = buildWyreStormCompareShortlist({
      competitorText: "4 input multiview processor with quad view output",
      wyrestormProducts: products,
    });

    expect(result.intent).toBe("multiview");
    expect(result.candidateSkus).toContain("NHD-0401-MV");
    expect(result.candidateSkus).toContain("NHD-150-RX");
  });

  it("shortlists dedicated video wall options before generic AVoIP scoring", () => {
    const result = buildWyreStormCompareShortlist({
      competitorText: "LCD video wall processor for 2x2 and 3x3 wall layouts",
      wyrestormProducts: products,
    });

    expect(result.intent).toBe("video_wall");
    expect(result.candidateSkus).toContain("SW-0206-VW");
    expect(result.candidateSkus).toContain("SW-0204-VW");
  });

  it("keeps NDI PTZ camera workflows out of the generic NetworkHD encoder lane", () => {
    const result = buildWyreStormCompareShortlist({
      competitorText: "Marshall VS-PTC-200NDI NDI PTZ camera",
      wyrestormProducts: products,
    });

    expect(result.intent).toBe("ndi_camera_workflow");
    expect(result.candidateSkus).toContain("CAM-210-NDI-PTZ");
    expect(result.candidateSkus).not.toContain("NHD-500-TX");
  });

  it("keeps audio-network products out of the NetworkHD AVoIP lane", () => {
    const result = buildWyreStormCompareShortlist({
      competitorText: "Q-SYS Core 110f Dante audio DSP",
      wyrestormProducts: products,
    });

    expect(result.intent).toBe("audio_network");
    expect(result.candidateSkus).toContain("AMP-2120-DNT");
    expect(result.candidateSkus).not.toContain("NHD-500-TX");
    expect(result.candidateSkus).not.toContain("NHD-500-RX");
  });

  it("provides fallback candidates even if the product index is incomplete", () => {
    const result = buildWyreStormCompareShortlist({
      competitorText: "Competitor 10G SDVoE AVoIP transceiver",
      wyrestormProducts: [],
    });

    expect(result.intent).toBe("avoip_10g");
    expect(result.candidateSkus).toContain("NHD-600-TRX");
  });

  it("explains the shortlist in simple text", () => {
    const result = buildWyreStormCompareShortlist({
      competitorText: "wireless presentation switcher with AirPlay and Miracast",
      wyrestormProducts: products,
    });

    expect(explainWyreStormCompareShortlist(result)).toContain("Shortlisted WyreStorm candidates");
  });

  it("resolves legacy aliases to current active shortlist SKUs", () => {
    const result = buildWyreStormCompareShortlist({
      competitorText: "small BYOD UC meeting room with wireless presentation",
      wyrestormProducts: [{ sku: "APO-VX20-UC", name: "Apollo legacy alias", description: "USB conferencing soundbar" }],
    });

    expect(result.candidateSkus).toContain("APO-VX20-UC-V2");
    expect(result.candidates.some((product) => product.sku === "APO-VX20-UC-V2")).toBe(true);
  });
});
