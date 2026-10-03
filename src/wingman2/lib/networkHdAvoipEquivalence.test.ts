import { describe, expect, it } from "vitest";
import {
  BANNED_NETWORKHD_SKUS,
  classifyCompetitorAvoip,
  isBannedNetworkHdSku,
  mapCompetitorToNetworkHdAvoip,
  NETWORKHD_AVOIP_FAMILIES,
  NETWORKHD_CONTROLLER_REMINDER,
  NETWORKHD_CONTROLLER_SKU,
  stripBannedNetworkHdSkus,
} from "./networkHdAvoipEquivalence";
import { isWyreStormSkuCompareLeadAllowed } from "./wyrestormSkuBusinessStatus";

describe("isBannedNetworkHdSku", () => {
  it("bans the retired legacy families and their variants", () => {
    for (const sku of ["NHD-100", "NHD-110", "NHD-110-TX", "NHD-110-RX", "NHD-220", "NHD-220-RX", "NHD-300-TX", "NHD-400", "NHD-400-TX-V2", "NHD-400-RX-V3"]) {
      expect(isBannedNetworkHdSku(sku)).toBe(true);
    }
  });

  it("never bans the current AVoIP families", () => {
    for (const sku of ["NHD-120-TX", "NHD-124-TX", "NHD-150-RX", "NHD-500-TX", "NHD-500-E-RX", "NHD-510-TX", "NHD-600-TRX", "NHD-610-TX"]) {
      expect(isBannedNetworkHdSku(sku)).toBe(false);
    }
  });

  it("matches regardless of punctuation/spacing", () => {
    expect(isBannedNetworkHdSku("nhd 400 tx")).toBe(true);
    expect(isBannedNetworkHdSku("NHD400")).toBe(true);
  });

  it("strips banned SKUs from a candidate list while preserving order", () => {
    const input = [{ sku: "NHD-500-TX" }, { sku: "NHD-100-TX" }, { sku: "NHD-150-RX" }, { sku: "NHD-400-RX" }];
    expect(stripBannedNetworkHdSkus(input).map((item) => item.sku)).toEqual(["NHD-500-TX", "NHD-150-RX"]);
  });
});

describe("NetworkHD AVoIP family truth", () => {
  it("contains no banned SKUs", () => {
    const all = Object.values(NETWORKHD_AVOIP_FAMILIES).flatMap((family) => family.members.map((member) => member.sku));
    expect(all.filter(isBannedNetworkHdSku)).toEqual([]);
  });

  it("never lists a discontinued/do-not-spec/unlisted member SKU (2026 business list)", () => {
    // Regression: NHD-500-IW-TX was discontinued (successor NHD-500-IW-TX-V2) and
    // NHD-610-TX is a legacy alias of NHD-610-TX-V2; both slipped through the
    // "not banned legacy series" check because that only guards retired series
    // numbers, not individually-discontinued/aliased current-series SKUs.
    const all = Object.values(NETWORKHD_AVOIP_FAMILIES).flatMap((family) => family.members.map((member) => member.sku));
    const blocked = all.filter((sku) => !isWyreStormSkuCompareLeadAllowed(sku));
    expect(blocked).toEqual([]);
  });

  it("keeps 100/500 on 1G and 600 on 10G", () => {
    expect(NETWORKHD_AVOIP_FAMILIES["100"].networkClass).toBe("1g");
    expect(NETWORKHD_AVOIP_FAMILIES["500"].networkClass).toBe("1g");
    expect(NETWORKHD_AVOIP_FAMILIES["600"].networkClass).toBe("10g");
  });
});

describe("classifyCompetitorAvoip", () => {
  it("does not mistake HDMI bandwidth for a 10GbE AVoIP network", () => {
    const result = classifyCompetitorAvoip("IP250UHD-TX visually-lossless 10Gb HDMI over a 1Gb network with Dante audio");

    expect(result.networkClass).toBe("1g");
    expect(result.codec).toBe("visually-lossless");
  });

  it("treats a generic 1G AVoIP endpoint as 1G with unknown codec", () => {
    const result = classifyCompetitorAvoip("Blustream IP300UHD-TX AVoIP transmitter 4K60");
    expect(result.isAvoip).toBe(true);
    expect(result.networkClass).toBe("1g");
    expect(result.codec).toBe("unknown");
    expect(result.role).toBe("encoder");
  });

  it("detects 10G / SDVoE explicitly", () => {
    const result = classifyCompetitorAvoip("Competitor 10GbE SDVoE AVoIP transceiver zero latency");
    expect(result.networkClass).toBe("10g");
    expect(result.codec).toBe("uncompressed-sdvoe");
    expect(result.role).toBe("transceiver");
  });

  it("detects H.264/H.265 explicitly", () => {
    const result = classifyCompetitorAvoip("Generic AVoIP H.265 HEVC decoder over 1GbE");
    expect(result.networkClass).toBe("1g");
    expect(result.codec).toBe("h264_h265");
    expect(result.role).toBe("decoder");
  });

  it("uses the known-family table for Crestron DM-NVX (1G visually lossless)", () => {
    const result = classifyCompetitorAvoip("DM-NVX-350");
    expect(result.networkClass).toBe("1g");
    expect(result.codec).toBe("visually-lossless");
    expect(result.knownFamily).toContain("DM-NVX");
  });

  it("uses the known-family table for AVPro MXNet 10G (-> 600)", () => {
    const result = classifyCompetitorAvoip("MXNet-10G-TCVR");
    expect(result.networkClass).toBe("10g");
    expect(result.codec).toBe("uncompressed-sdvoe");
  });

  it("uses the known-family table for ZeeVee ZyPerUHD (H.265 -> 100)", () => {
    const result = classifyCompetitorAvoip("ZyPerUHD Encoder");
    expect(result.networkClass).toBe("1g");
    expect(result.codec).toBe("h264_h265");
  });

  it("does not classify non-AVoIP products", () => {
    expect(classifyCompetitorAvoip("8x8 HDBaseT matrix").isAvoip).toBe(false);
    expect(classifyCompetitorAvoip("generic HDMI splitter").isAvoip).toBe(false);
  });

  it("does not classify NDI PTZ cameras as AVoIP endpoints just because NDI is present", () => {
    const result = classifyCompetitorAvoip("Marshall VS-PTC-200NDI NDI PTZ camera");
    expect(result.isAvoip).toBe(false);
  });

  it("does not classify Dante audio DSP products as AVoIP endpoints", () => {
    const result = classifyCompetitorAvoip("Q-SYS Core 110f Dante audio DSP");
    expect(result.isAvoip).toBe(false);
  });
});

describe("recommendNetworkHdAvoip", () => {
  it("maps a 10G/SDVoE endpoint to the 600 series only, withholding 1G", () => {
    const { recommendation } = mapCompetitorToNetworkHdAvoip("Competitor 10G SDVoE transceiver");
    expect(recommendation.series).toBe("600");
    expect(recommendation.candidateSkus).toContain("NHD-600-TRX");
    expect(recommendation.candidateSkus.every((sku) => !sku.startsWith("NHD-500") && !sku.startsWith("NHD-120"))).toBe(true);
    expect(recommendation.withheld.some((item) => item.reason.includes("1G"))).toBe(true);
  });

  it("maps an H.264/H.265 1G endpoint to the 100 series, never 500 or 600", () => {
    const { recommendation } = mapCompetitorToNetworkHdAvoip("AVoIP H.265 encoder 1GbE");
    expect(recommendation.series).toBe("100");
    expect(recommendation.candidateSkus).toContain("NHD-120-TX");
    expect(recommendation.candidateSkus.some((sku) => sku.startsWith("NHD-500") || sku.startsWith("NHD-600"))).toBe(false);
  });

  it("maps a generic 1G endpoint to the 500 series with a verify-codec flag", () => {
    const { recommendation } = mapCompetitorToNetworkHdAvoip("Blustream IP300UHD-RX AVoIP receiver");
    expect(recommendation.series).toBe("500");
    expect(recommendation.candidateSkus).toContain("NHD-500-RX");
    expect(recommendation.candidateSkus).toContain("NHD-500-E-RX");
    expect(recommendation.candidateSkus.some((sku) => sku.startsWith("NHD-600"))).toBe(false);
    expect(recommendation.verifyCodec).toBe(true);
  });

  it("maps a known visually-lossless family to 500 without a verify flag", () => {
    const { recommendation } = mapCompetitorToNetworkHdAvoip("Extron NAV E 501 encoder");
    expect(recommendation.series).toBe("500");
    expect(recommendation.verifyCodec).toBe(false);
    expect(recommendation.candidateSkus).toContain("NHD-500-TX");
  });

  it("returns only encoder-side candidates for a transmitter and decoder-side for a receiver", () => {
    const tx = mapCompetitorToNetworkHdAvoip("Crestron DM-NVX-E30 encoder").recommendation;
    expect(tx.candidateSkus).toContain("NHD-500-TX");
    expect(tx.candidateSkus.some((sku) => sku.endsWith("-RX"))).toBe(false);

    const rx = mapCompetitorToNetworkHdAvoip("Crestron DM-NVX-D30 decoder").recommendation;
    expect(rx.candidateSkus).toContain("NHD-500-RX");
    expect(rx.candidateSkus.some((sku) => sku.endsWith("-TX"))).toBe(false);
  });

  it("never emits a banned SKU for any classification", () => {
    const inputs = ["10G SDVoE", "H.265 1G encoder", "1G AVoIP decoder", "DM-NVX-350", "ZyPerUHD"];
    for (const input of inputs) {
      const { recommendation } = mapCompetitorToNetworkHdAvoip(input);
      expect(recommendation.candidateSkus.filter(isBannedNetworkHdSku)).toEqual([]);
    }
  });

  it("does not apply to non-AVoIP competitors", () => {
    const { recommendation } = mapCompetitorToNetworkHdAvoip("8x8 HDBaseT matrix");
    expect(recommendation.applies).toBe(false);
    expect(recommendation.candidateSkus).toEqual([]);
  });

  it("always reminds to specify one NHD-CTL-PRO-V2 controller per system for every AVoIP series", () => {
    for (const input of ["10G SDVoE transceiver", "AVoIP H.265 1G encoder", "1G AVoIP decoder", "DM-NVX-350"]) {
      const { recommendation } = mapCompetitorToNetworkHdAvoip(input);
      expect(recommendation.controllerReminder).toBe(NETWORKHD_CONTROLLER_REMINDER);
      expect(recommendation.controllerReminder).toContain(NETWORKHD_CONTROLLER_SKU);
      expect(recommendation.controllerReminder.toLowerCase()).toContain("per system");
      expect(recommendation.controllerReminder.toLowerCase()).toContain("add-on");
    }
  });

  it("has no controller reminder when AVoIP mapping does not apply", () => {
    const { recommendation } = mapCompetitorToNetworkHdAvoip("8x8 HDBaseT matrix");
    expect(recommendation.controllerReminder).toBe("");
  });
});

describe("ban list export", () => {
  it("documents the canonical banned SKUs", () => {
    expect(BANNED_NETWORKHD_SKUS).toContain("NHD-100");
    expect(BANNED_NETWORKHD_SKUS).toContain("NHD-300-TX");
    expect(BANNED_NETWORKHD_SKUS.every(isBannedNetworkHdSku)).toBe(true);
  });
});
