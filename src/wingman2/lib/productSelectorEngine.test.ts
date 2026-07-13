import { describe, expect, it } from "vitest";
import {
  PRODUCT_SELECTOR_ENGINE_VERSION,
  selectWingmanProducts,
  type ProductSelectorRequest,
} from "./productSelectorEngine";

const products = [
  {
    sku: "NHD-500-TX",
    name: "NetworkHD 500 Series 4K Encoder",
    family: "NetworkHD 500",
    category: "AV over IP",
    description: "1GbE source-side encoder transmitter for NetworkHD 500 systems.",
    tags: ["NetworkHD", "500", "encoder", "transmitter", "AVoIP"],
  },
  {
    sku: "NHD-500-RX",
    name: "NetworkHD 500 Series 4K Decoder",
    family: "NetworkHD 500",
    category: "AV over IP",
    description: "1GbE display-side decoder receiver for NetworkHD 500 systems.",
    tags: ["NetworkHD", "500", "decoder", "receiver", "AVoIP"],
  },
  {
    sku: "NHD-600-TRX",
    name: "NetworkHD 600 Series 4K Transceiver",
    family: "NetworkHD 600",
    category: "AV over IP",
    description: "10GbE SDVoE transceiver endpoint for NetworkHD 600 systems.",
    tags: ["NetworkHD", "600", "transceiver", "10G", "SDVoE"],
  },
  {
    sku: "MXV-0808-H2A",
    name: "8x8 HDBaseT Matrix",
    family: "Matrix",
    category: "HDBaseT matrix",
    description: "Eight input eight output routed HDBaseT matrix.",
    tags: ["matrix", "HDBaseT", "routing"],
  },
  {
    sku: "MXV-0808-H2A-MK2",
    name: "8x8 HDBaseT Matrix MK2",
    family: "Matrix",
    category: "HDBaseT matrix",
    description: "Current eight input eight output routed HDBaseT matrix.",
    tags: ["matrix", "HDBaseT", "routing"],
  },
  {
    sku: "CAB-HAOC-15",
    name: "15m active optical HDMI cable",
    family: "Cables",
    category: "Cable",
    description: "HDMI active optical cable.",
    tags: ["cable", "HDMI"],
  },
  {
    sku: "APO-DG2",
    name: "Apollo wireless casting dongle",
    family: "Apollo",
    category: "Accessory",
    description: "Wireless casting dongle accessory for compatible Apollo hosts.",
    tags: ["dongle", "accessory", "wireless casting"],
  },
  {
    sku: "UNKNOWN-BOX",
    name: "Unverified AV transport box",
    family: "Unknown",
    category: "AV transport",
    description: "A product that is not in governed lifecycle data.",
    tags: ["AV transport"],
  },
];

function eligibleSkus(request: Partial<ProductSelectorRequest> = {}) {
  return selectWingmanProducts(products, { mode: "finder", ...request })
    .filter((decision) => decision.eligible)
    .map((decision) => decision.sku);
}

describe("product selector engine", () => {
  it("exposes the governed selector engine version", () => {
    expect(PRODUCT_SELECTOR_ENGINE_VERSION).toBe("2026.07.1");
  });

  it("hides cables and accessories by default", () => {
    const skus = eligibleSkus({ query: "" });

    expect(skus).not.toContain("CAB-HAOC-15");
    expect(skus).not.toContain("APO-DG2");
  });

  it("can deliberately include cables and accessory dependencies", () => {
    const decisions = selectWingmanProducts(products, {
      mode: "catalogue",
      includeCables: true,
      includeAccessories: true,
      includeDependencies: true,
    }).filter((decision) => decision.eligible);

    expect(decisions.map((decision) => decision.sku)).toContain("CAB-HAOC-15");
    expect(decisions.map((decision) => decision.sku)).toContain("APO-DG2");
    expect(decisions.find((decision) => decision.sku === "APO-DG2")?.status).toBe("dependency");
  });

  it("keeps endpoint role compatibility gates ahead of search results", () => {
    const encoderRequest = {
      mode: "finder" as const,
      query: "NetworkHD 500",
      technicalRequirement: "Need a source-side encoder transmitter for NetworkHD 500",
    };
    const decoderRequest = {
      mode: "finder" as const,
      query: "NetworkHD 500",
      technicalRequirement: "Need a display-side decoder receiver for NetworkHD 500",
    };

    expect(eligibleSkus(encoderRequest)).toContain("NHD-500-TX");
    expect(eligibleSkus(encoderRequest)).not.toContain("NHD-500-RX");
    expect(eligibleSkus(decoderRequest)).toContain("NHD-500-RX");
    expect(eligibleSkus(decoderRequest)).not.toContain("NHD-500-TX");
  });

  it("prevents NetworkHD series drift after compatibility gates", () => {
    const skus = eligibleSkus({
      query: "NetworkHD",
      technologyType: "NetworkHD 500",
      technicalRequirement: "NetworkHD 500 encoder",
    });

    expect(skus).toContain("NHD-500-TX");
    expect(skus).not.toContain("NHD-600-TRX");
  });

  it("dedupes aliases to the canonical SKU", () => {
    const decisions = selectWingmanProducts(products, {
      mode: "catalogue",
      query: "MXV-0808-H2A",
    }).filter((decision) => decision.eligible);

    expect(decisions.filter((decision) => decision.sku === "MXV-0808-H2A-MK2")).toHaveLength(1);
  });

  it("marks unverified catalogue data as needing verification instead of inventing confidence", () => {
    const decision = selectWingmanProducts(products, {
      mode: "catalogue",
      query: "UNKNOWN-BOX",
    }).find((item) => item.sku === "UNKNOWN-BOX");

    expect(decision?.eligible).toBe(true);
    expect(decision?.lifecycleLabel).toBe("Needs verification");
    expect(decision?.warningReasons.join(" ")).toMatch(/Needs verification/i);
  });
});

