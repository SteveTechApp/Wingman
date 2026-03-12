import { describe, expect, it } from "vitest";

import { buildAvSignalProfile, evaluateAvCompatibility } from "@/services/avLogicEngine";

describe("av logic engine", () => {
  it("rejects encoder candidates for decoder requirements", () => {
    const requested = buildAvSignalProfile({
      sku: "IP300UHD-RX",
      name: "IP300UHD Decoder",
      category: "AVoIP",
      subcategory: "Decoder",
      summary: "4K60 decoder over one-gigabit AVoIP transport",
      features: ["AVoIP decoder", "1GbE"],
      transport: "AVoIP",
    });
    const candidate = buildAvSignalProfile({
      sku: "NHD-500-DNT-TX",
      name: "NetworkHD 500 Encoder",
      category: "AVoIP",
      subcategory: "AVoIP Encoder",
      summary: "4K60 JPEG-XS encoder over 2GbE",
      transport: "AVoIP",
    });

    const result = evaluateAvCompatibility(requested, candidate);
    expect(result.compatible).toBe(false);
    expect(result.blockers.some((item) => item.toLowerCase().includes("role mismatch"))).toBe(true);
  });

  it("flags proprietary AVoIP codec/chipset mismatches", () => {
    const requested = buildAvSignalProfile({
      sku: "NHD-500-RX",
      category: "AVoIP",
      subcategory: "Decoder",
      summary: "4K60 JPEG-XS decoder over 1GbE",
      features: ["JPEG-XS", "1GbE"],
      transport: "AVoIP",
    });
    const candidate = buildAvSignalProfile({
      sku: "NHD-600-TRX",
      category: "AVoIP",
      subcategory: "Transceiver",
      summary: "4K60 SDVoE 10GbE transceiver",
      features: ["SDVoE", "10GbE"],
      transport: "AVoIP",
    });

    const result = evaluateAvCompatibility(requested, candidate);
    expect(result.compatible).toBe(false);
    expect(result.blockers.some((item) => item.toLowerCase().includes("proprietary"))).toBe(true);
  });

  it("accepts same-domain decoder matches", () => {
    const requested = buildAvSignalProfile({
      sku: "IP300UHD-RX",
      name: "IP300UHD Decoder",
      category: "AVoIP",
      subcategory: "Decoder",
      summary: "4K60 decoder over 1GbE",
      features: ["AVoIP decoder", "1GbE"],
      transport: "AVoIP",
    });
    const candidate = buildAvSignalProfile({
      sku: "NHD-500-RX",
      name: "NetworkHD 500 Decoder",
      category: "AVoIP",
      subcategory: "AVoIP Decoder",
      summary: "4K60 JPEG-XS decoder over 1GbE",
      features: ["AVoIP decoder", "JPEG-XS", "1GbE"],
      transport: "AVoIP",
    });

    const result = evaluateAvCompatibility(requested, candidate);
    expect(result.compatible).toBe(true);
    expect(result.blockers).toEqual([]);
  });
});

