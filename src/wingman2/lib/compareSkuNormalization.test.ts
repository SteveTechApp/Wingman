import { describe, expect, it } from "vitest";
import { normalizeCompetitorSku } from "./competitorProductIntelligence";
import { resolveCompetitorSpecProfile } from "./competitorSpecRegistry";

const scenarios = [
  { brand: "Crestron", typed: "dmnvx350", expectedSku: "DM-NVX-350", expectedBrand: "Crestron" },
  { brand: "Extron", typed: "navd121", expectedSku: "NAV D 121", expectedBrand: "Extron" },
  { brand: "Kramer", typed: "vs88h2a", expectedSku: "VS-88H2A", expectedBrand: "Kramer" },
  { brand: "Blustream", typed: "hmx4418gkit", expectedSku: "HMX44-18G-KIT", expectedBrand: "Blustream" },
  { brand: "Lightware", typed: "ucx4x2hc40", expectedSku: "UCX-4x2-HC40", expectedBrand: "Lightware" },
  { brand: "AVPro Edge", typed: "acex70444r3", expectedSku: "AC-EX70-444-R3", expectedBrand: "AVPro Edge" },
  { brand: "", typed: "mxnet10gtcvr", expectedSku: "MXNet-10G-TCVR", expectedBrand: "AVPro Edge" },
];

describe("competitor compare SKU normalization", () => {
  it.each(scenarios)("normalizes $typed and still reaches WyreStorm candidates", (scenario) => {
    const normalised = normalizeCompetitorSku(scenario.typed, scenario.brand);

    expect(normalised).toMatchObject({
      brand: scenario.expectedBrand,
      sku: scenario.expectedSku,
      corrected: true,
    });

    const profile = resolveCompetitorSpecProfile(scenario.typed, scenario.brand || undefined);

    expect(profile.brand).toBe(scenario.expectedBrand);
    expect(profile.sku).toBe(scenario.expectedSku);
    expect(profile.specTier).not.toBe("sku-only");
  });
});
