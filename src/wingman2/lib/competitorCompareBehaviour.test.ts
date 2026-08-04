import { describe, expect, it } from "vitest";
import rawProductIndex from "../../../public/product-intelligence-index.json";
import competitorCatalog from "../../../data/catalog/competitor-products.generated.json";
import { normaliseCompareProducts, runCompareRuntimePipeline } from "./compareRuntimePipeline";
import { isBannedNetworkHdSku } from "./networkHdAvoipEquivalence";

type AnyRecord = Record<string, any>;

const products: AnyRecord[] = normaliseCompareProducts(rawProductIndex);
const competitors: AnyRecord[] = competitorCatalog as AnyRecord[];

function fullCompetitorInput(competitorSku: string): { input: string; brand: string } {
  const competitor = competitors.find((item) => item.sku === competitorSku);
  if (!competitor) throw new Error(`Missing competitor test record: ${competitorSku}`);

  return {
    input: [competitor.sku, competitor.name, competitor.category, competitor.subcategory, competitor.role, competitor.transport, competitor.technology, competitor.summary]
      .filter(Boolean)
      .join(" | "),
    brand: competitor.brand || competitor.manufacturer,
  };
}

function sku(value: AnyRecord | undefined): string {
  return String(value?.sku ?? value?.wyrestorm?.sku ?? "").toUpperCase();
}

function skus(items: AnyRecord[] | undefined): string[] {
  return (items ?? []).map((item) => sku(item)).filter(Boolean);
}

function expectNoSupportItemsInLeadResults(result: AnyRecord): void {
  const leadSkus = skus(result.matches).slice(0, 5);

  expect(leadSkus.some((item) => /^CAB-/.test(item))).toBe(false);
  expect(leadSkus.some((item) => /^CAM-/.test(item))).toBe(false);
  expect(leadSkus.some((item) => /^APO-/.test(item))).toBe(false);
  expect(leadSkus.some((item) => item.includes("RACK"))).toBe(false);
  expect(leadSkus.some((item) => item.includes("CTL"))).toBe(false);
}

describe("competitor compare runtime behaviour", () => {
  it("loads real product records from the public product intelligence index", () => {
    const loadedSkus = skus(products);

    expect(products.length).toBeGreaterThan(250);
    expect(loadedSkus).toContain("NHD-0401-MV");
    expect(loadedSkus).toContain("NHD-150-RX");
    expect(loadedSkus).toContain("SW-0206-VW");
  });

  it("keeps exact Crestron DM-NVX input as verified-profile and returns NetworkHD-style candidates", () => {
    const result = runCompareRuntimePipeline("DMNVX350", products, "Crestron", 12);

    expect(result.competitor.brand).toBe("Crestron");
    expect(result.competitor.specTier).toBe("verified-profile");
    expect(result.matches.length).toBeGreaterThan(0);
    expect(sku(result.matches[0])).toMatch(/^NHD-/);
    expectNoSupportItemsInLeadResults(result);
  });

  it("never names a banned or non-lead WyreStorm SKU in the recommendation prose", () => {
    const result = runCompareRuntimePipeline("DMNVX350", products, "Crestron", 10);
    const recommendation = String(result.recommendation ?? "").toUpperCase();
    const leadSku = sku(result.matches[0]);

    // (1) No retired/banned NetworkHD SKU (NHD-100/110/220/300/400) may appear.
    const namedNhd = recommendation.match(/\bNHD-[A-Z0-9][A-Z0-9-]*/g) ?? [];
    for (const token of namedNhd) {
      expect(isBannedNetworkHdSku(token)).toBe(false);
    }

    // (2) Any candidate SKU named in the recommendation must be the ranked lead -
    // never another match or a rejected (e.g. eligibility-blocked) candidate.
    const otherCandidateSkus = [...result.matches.slice(1), ...result.rejected]
      .map((item: AnyRecord) => sku(item))
      .filter((value: string) => value && value !== leadSku);
    for (const other of otherCandidateSkus) {
      expect(recommendation).not.toContain(other);
    }
  });

  it("keeps family-level Crestron DM-NVX input as family-rule rather than false verified-profile", () => {
    const result = runCompareRuntimePipeline("DMNVX", products, "Crestron", 12);

    expect(result.competitor.brand).toBe("Crestron");
    expect(result.competitor.specTier).toBe("family-rule");
    expect(["PARTIAL MATCH", "VERIFY"]).toContain(result.topOutcome);
    expect(result.nextSteps.some((step: string) => step.toLowerCase().includes("datasheet"))).toBe(true);
  });

  it("keeps decoder requests away from transmitter-only or support-item lead candidates", () => {
    const result = runCompareRuntimePipeline("NAV D 121", products, "Extron", 12);
    const leadSkus = skus(result.matches).slice(0, 5);

    expect(result.competitor.brand).toBe("Extron");
    expect(leadSkus.length).toBeGreaterThan(0);
    expectNoSupportItemsInLeadResults(result);
    expect(leadSkus.some((item) => /-RX\b|TRX\b/.test(item))).toBe(true);
    expect(leadSkus[0]).not.toMatch(/-TX\b/);
  });

  it("keeps Blustream IP250UHD-TX runtime results on encoder-side NetworkHD 500, not decoder or 10G candidates", () => {
    const result = runCompareRuntimePipeline("IP250UHD-TX", products, "Blustream", 12);
    const leadSkus = skus(result.matches).slice(0, 5);

    expect(result.competitor.brand).toBe("Blustream");
    expect(leadSkus.length).toBeGreaterThan(0);
    expectNoSupportItemsInLeadResults(result);
    expect(leadSkus[0]).toBe("NHD-500-TX");
    expect(leadSkus.some((item) => /-RX\b/.test(item))).toBe(false);
    expect(leadSkus).not.toContain("NHD-600-TRX");
  });

  it("keeps Blustream IP250UHD-RX runtime results on decoder-side NetworkHD 500, not encoder or 10G candidates", () => {
    const result = runCompareRuntimePipeline("IP250UHD-RX", products, "Blustream", 12);
    const leadSkus = skus(result.matches).slice(0, 5);

    expect(result.competitor.brand).toBe("Blustream");
    expect(leadSkus.length).toBeGreaterThan(0);
    expectNoSupportItemsInLeadResults(result);
    expect(leadSkus[0]).toBe("NHD-500-RX");
    expect(leadSkus.some((item) => /-TX\b/.test(item) && !/-TRX\b/.test(item))).toBe(false);
    expect(leadSkus).not.toContain("NHD-600-TRX");
  });

  it.each([
    ["IP250UHD-TX", /^NHD-500(?:-E)?-TX$/],
    ["IP250UHD-RX", /^NHD-500(?:-E)?-RX$/],
    ["NMX-ENC-N2412A", /^NHD-500(?:-E)?-TX$/],
    ["NMX-DEC-N2422A", /^NHD-500(?:-E)?-RX$/],
  ])("keeps %s in its governed AVoIP lane when the full catalogue description is supplied", (competitorSku, expectedLead) => {
    const scenario = fullCompetitorInput(competitorSku);
    const result = runCompareRuntimePipeline(scenario.input, products, scenario.brand, 12);

    expect(sku(result.matches[0])).toMatch(expectedLead);
    expect(result.matches.length).toBeGreaterThan(0);
  });

  it.each(["NX-1200", "AT-VGW-HW", "B-260-HDMI-CTRL", "Solstice Active Learning", "Solstice Gen3"])(
    "does not recommend unrelated AV transport for governed control product %s",
    (competitorSku) => {
      const scenario = fullCompetitorInput(competitorSku);
      const result = runCompareRuntimePipeline(scenario.input, products, scenario.brand, 12);

      expect(result.matches).toEqual([]);
    },
  );
  it("keeps verified 1G AVoIP runtime results away from NetworkHD 600 unless 10G or SDVoE is explicit", () => {
    const scenarios: Array<[string, string | undefined]> = [
      ["DMNVX350", "Crestron"],
      ["IP250UHD-TX", "Blustream"],
      ["IP250UHD-RX", "Blustream"],
    ];

    for (const [input, brand] of scenarios) {
      const result = runCompareRuntimePipeline(input, products, brand, 12);
      const leadSkus = skus(result.matches).slice(0, 5);

      expect(leadSkus.length).toBeGreaterThan(0);
      expect(leadSkus).not.toContain("NHD-600-TRX");
      expect(leadSkus.some((item) => item.startsWith("NHD-500"))).toBe(true);
    }
  });

  it("allows explicit 10G SDVoE runtime requests to lead with NetworkHD 600 rather than 1G NetworkHD 500", () => {
    const result = runCompareRuntimePipeline("10G SDVoE AV over IP transceiver endpoint", products, undefined, 12);
    const leadSkus = skus(result.matches).slice(0, 5);

    expect(leadSkus.length).toBeGreaterThan(0);
    expect(leadSkus[0]).toBe("NHD-600-TRX");
    expect(leadSkus).not.toContain("NHD-500-TX");
    expect(leadSkus).not.toContain("NHD-500-RX");
  });
  it("keeps compact 4x2 matrix requests ahead of oversized 8x8 matrix package options", () => {
    const result = runCompareRuntimePipeline("MMX4x2-HDMI", products, "Lightware", 12);
    const leadSkus = skus(result.matches).slice(0, 4);

    expect(result.competitor.brand).toBe("Lightware");
    expect(result.competitor.inputCount).toBe(4);
    expect(result.competitor.outputCount).toBe(2);
    expect(leadSkus[0]).not.toBe("MX-0808-KIT-V2");
    expect(leadSkus.some((item) => item.includes("0402") || item.includes("4X2"))).toBe(true);
  });

  it("keeps Lightware MMX6x2 requests as 6x2 matrix jobs and does not lead with undersized 4x2 products", () => {
    const result = runCompareRuntimePipeline("MMX6x2-HT200", products, "Lightware", 12);
    const leadSkus = skus(result.matches).slice(0, 4);

    expect(result.competitor.brand).toBe("Lightware");
    expect(result.competitor.sku).toBe("MMX6x2-HT200");
    expect(result.competitor.inputCount).toBe(6);
    expect(result.competitor.outputCount).toBe(2);
    expect(leadSkus.length).toBeGreaterThan(0);
    expect(leadSkus[0]).not.toMatch(/0402|0403/);
  });

  it("returns WyreStorm 4x4 matrix options for Blustream HMX44 instead of a no-matrix dead end", () => {
    const result = runCompareRuntimePipeline("HMX44-18G-KIT", products, "Blustream", 12);
    const leadSkus = skus(result.matches).slice(0, 4);

    expect(result.competitor.brand).toBe("Blustream");
    expect(result.competitor.sku).toBe("HMX44-18G-KIT");
    expect(result.topOutcome).not.toBe("NONE");
    expect(leadSkus.length).toBeGreaterThan(0);
    expect(leadSkus.some((item) => item.includes("0404"))).toBe(true);
    expect(String(result.recommendation)).not.toMatch(/No safe direct WyreStorm equivalent/i);
  });

  it("leads dedicated video wall processor requests with dedicated wall processors before generic AVoIP products", () => {
    const result = runCompareRuntimePipeline("dedicated LCD video wall processor", products, undefined, 12);
    const leadSkus = skus(result.matches).slice(0, 4);

    expect(leadSkus.length).toBeGreaterThan(0);
    expect(leadSkus[0]).toMatch(/^SW-020[46]-VW$/);
    expect(leadSkus.some((item) => item === "NHD-000-CTL" || item.includes("RACK"))).toBe(false);
  });

  it("treats multiview as single-output multi-source canvas, not just multiple outputs", () => {
    const result = runCompareRuntimePipeline("4 source multiview processor single output canvas", products, undefined, 12);
    const leadSkus = skus(result.matches).slice(0, 5);

    expect(leadSkus.length).toBeGreaterThan(0);
    expect(leadSkus.some((item) => item === "NHD-0401-MV" || item === "NHD-150-RX")).toBe(true);
    expectNoSupportItemsInLeadResults(result);
  });

  it("leads competitor NDI cameras with a WyreStorm CAM- NDI camera, not an AVoIP encoder", () => {
    for (const [input, brand] of [["P200", "BirdDog"], ["P400", "BirdDog"], ["CV730-NDI", "Marshall"]] as const) {
      const result = runCompareRuntimePipeline(input, products, brand, 10);
      expect(result.competitor.domain).toBe("NDI_CAMERA");
      const lead = sku(result.matches[0]);
      expect(lead).toMatch(/^CAM-/);
      expect(lead).toContain("NDI");
    }
  });

  it("leads competitor PTZ cameras with a WyreStorm CAM- PTZ camera", () => {
    for (const [input, brand] of [["SRG-X120", "Sony"], ["BRC-X400", "Sony"]] as const) {
      const result = runCompareRuntimePipeline(input, products, brand, 10);
      expect(result.competitor.domain).toBe("PTZ_CAMERA");
      expect(sku(result.matches[0])).toMatch(/^CAM-\d.*PTZ$/);
    }
  });

  it("leads free-text NDI PTZ camera requests with a WyreStorm NDI camera", () => {
    const result = runCompareRuntimePipeline("4K NDI PTZ conference camera VISCA over IP", products, undefined, 10);
    const lead = sku(result.matches[0]);
    expect(lead).toMatch(/^CAM-/);
    expect(lead).toContain("NDI");
  });

  it("uses APO-VX20-UC-V2 with APO-DG2 for huddle-room wireless casting runtime results", () => {
    const result = runCompareRuntimePipeline("small huddle room wireless casting with ClickShare style sharing", products, undefined, 12);
    const leadSkus = skus(result.matches).slice(0, 5);

    expect(leadSkus[0]).toBe("APO-VX20-UC-V2");
    expect(leadSkus).toContain("APO-DG2");
  });

  it("uses SW-620-TX-W with APO-DG2 for standard wireless casting runtime results", () => {
    const result = runCompareRuntimePipeline("standard meeting room wireless casting ClickShare CX-50", products, "Barco ClickShare", 12);
    const leadSkus = skus(result.matches).slice(0, 6);

    expect(leadSkus[0]).toBe("SW-620-TX-W");
    expect(leadSkus).toContain("APO-DG2");
  });

  it("uses SW-640L-TX-W with APO-DG2 for larger wireless casting runtime results with four or more sources", () => {
    const result = runCompareRuntimePipeline("training room wireless casting with 4 sources", products, undefined, 12);
    const leadSkus = skus(result.matches).slice(0, 6);

    expect(leadSkus[0]).toBe("SW-640L-TX-W");
    expect(leadSkus).toContain("APO-DG2");
  });

  it("adds IDB-300 as an option when wireless casting includes a desk connection", () => {
    const result = runCompareRuntimePipeline("standard meeting room wireless casting with desk HDMI and USB connection", products, undefined, 12);
    const leadSkus = skus(result.matches).slice(0, 8);

    expect(leadSkus[0]).toBe("SW-620-TX-W");
    expect(leadSkus).toContain("APO-DG2");
    expect(leadSkus).toContain("IDB-300");
  });

  it("matches Blustream WMF72 to a wireless presentation switcher, not an Apollo UC soundbar", () => {
    const result = runCompareRuntimePipeline("WMF72", products, "Blustream", 12);
    const leadSkus = skus(result.matches).slice(0, 6);

    expect(result.competitor.sku).toBe("WMF72");
    expect(leadSkus[0]).toMatch(/^SW-(620|640L)-TX-W$/);
    expect(leadSkus[0]).not.toBe("APO-VX20-UC-V2");
    expect(leadSkus).toContain("SW-620-TX-W");
  });

  it("never positions end-of-life SKUs (CAM-200-PTZ, APO-200-UC) as compare candidates", () => {
    const eolSkus = ["CAM-200-PTZ", "APO-200-UC"];
    const scenarios: Array<[string, string | undefined]> = [
      ["SRG-X120", "Sony"],
      ["BRC-X400", "Sony"],
      ["P200", "BirdDog"],
      ["CV730-NDI", "Marshall"],
      ["Solstice Gen3", "Mersive"],
      ["CX-50", "Barco ClickShare"],
    ];
    for (const [input, brand] of scenarios) {
      const result = runCompareRuntimePipeline(input, products, brand, 12);
      const matchSkus = skus(result.matches);
      for (const eol of eolSkus) {
        expect(matchSkus).not.toContain(eol);
      }
    }
  }, 20000); // 6 sequential runCompareRuntimePipeline calls at ~900ms each now exceed the 5000ms default
});
