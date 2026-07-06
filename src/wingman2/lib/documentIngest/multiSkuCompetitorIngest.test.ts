import { describe, expect, it } from "vitest";
import {
  analyzeMultiSkuCompetitorDocument,
  extractSkuTokens,
} from "./multiSkuCompetitorIngest";
import { BLUSTREAM_PACIFIC_EMAIL_FIXTURE } from "./blustreamPacific.fixture";

function bySku(analysis: ReturnType<typeof analyzeMultiSkuCompetitorDocument>, sku: string) {
  return analysis.skus.find((item) => item.sku === sku);
}

describe("multi-SKU competitor document ingest", () => {
  it("extracts compact, hyphenated, CSV and separate-line SKU/description pairs", () => {
    const skus = extractSkuTokens(BLUSTREAM_PACIFIC_EMAIL_FIXTURE);

    expect(skus).toContain("UEX3C-KIT");
    expect(skus).toContain("HEX11WPW-TX");
    expect(skus).toContain("PLA88CS");
    expect(skus).toContain("PS122");
    expect(skus).not.toContain("HDMI2");
    expect(extractSkuTokens("LG,55UH5J,55-inch commercial display")).toContain("55UH5J");
  });

  it("classifies the Blustream/Pacific email as a structured multi-SKU enquiry", () => {
    const analysis = analyzeMultiSkuCompetitorDocument(BLUSTREAM_PACIFIC_EMAIL_FIXTURE);

    expect(analysis.documentType).toBe("multi_sku_competitor_list");
    expect(analysis.manufacturer).toBe("Blustream");
    expect(analysis.accountCustomer).toBe("Pacific");
    expect(analysis.sourceKind).toBe("email");
    expect(analysis.skuCount).toBeGreaterThanOrEqual(24);
    expect(analysis.isSellOutList).toBe(true);
  });

  it("classifies TX, RX, KIT, matrix, splitter, USB/KVM, audio and power roles safely", () => {
    const analysis = analyzeMultiSkuCompetitorDocument(BLUSTREAM_PACIFIC_EMAIL_FIXTURE);

    expect(bySku(analysis, "UEX3C-KIT")).toMatchObject({
      productClass: "hdbaset-extender-kit",
      classLabel: "USB / HDBaseT extender kit",
      role: "kit",
    });
    expect(bySku(analysis, "SP14CS")?.productClass).toBe("hdmi-splitter");
    expect(bySku(analysis, "SP18CS")?.productClass).toBe("hdmi-splitter");
    expect(bySku(analysis, "HEX11WPW-TX")).toMatchObject({
      productClass: "hdbaset-transmitter",
      role: "transmitter",
    });

    for (const sku of ["HEX70SL-RX", "HEX11WP-RX", "RX150CS", "HEX70CS-RX"]) {
      expect(bySku(analysis, sku)).toMatchObject({
        productClass: "hdbaset-receiver",
        role: "receiver",
      });
    }

    for (const sku of ["C44CS-KIT", "PLA88CS", "HMXL44ARC-KIT"]) {
      expect(bySku(analysis, sku)?.productClass).toBe("hdbaset-matrix");
    }

    expect(bySku(analysis, "SW12USB")?.productClass).toBe("usb-kvm");
    expect(bySku(analysis, "MX44KVM")?.productClass).toBe("usb-kvm");
    expect(bySku(analysis, "DA22XLR-WP-EU")?.productClass).toBe("audio-dante");
    expect(bySku(analysis, "PS122")).toMatchObject({
      productClass: "accessory-power",
      role: "supporting-accessory",
      eligibleAsLead: false,
    });
  });

  it("builds grouped sales opportunities and sell-out quote warnings", () => {
    const analysis = analyzeMultiSkuCompetitorDocument(BLUSTREAM_PACIFIC_EMAIL_FIXTURE);

    expect(analysis.productSets.length).toBeGreaterThan(4);
    expect(analysis.productSets.find((group) => group.id === "hdbaset-extension")?.skuCount).toBeGreaterThan(5);
    expect(analysis.productSets.find((group) => group.id === "hdmi-distribution")?.skus).toEqual(
      expect.arrayContaining(["SP14CS", "SP18CS"]),
    );
    expect(analysis.productSets.find((group) => group.id === "supporting-accessories")?.relationship).toBe("supporting-only");
    expect(analysis.quoteRisks.join(" ")).toMatch(/sell-out|stock movement/i);
    expect(analysis.quoteRisks.join(" ")).toMatch(/not a confirmed project design/i);
    expect(analysis.quoteRisks.join(" ")).toMatch(/must not be added to a WyreStorm BOM/i);
  });

  it("triages candidates, architecture paths, dependencies, noise and unknown rows before compare", () => {
    const analysis = analyzeMultiSkuCompetitorDocument(`
Manufacturer,SKU,Description
Blustream,HEX100CS-KIT,100m HDMI HDBaseT extender kit
Blustream,C44CS-KIT,4x4 HDBaseT matrix kit
Blustream,PS122,12V power supply
Samsung,QM55B,55-inch commercial display
Chief,XTM1U,display wall bracket
Generic 42U equipment rack
CAT6 cable 100m
Unknown,ABC-999,mystery product
`);
    const byTriageSku = (sku: string) => analysis.triage.rows.find((row) => row.sku === sku);

    expect(analysis.documentType).toBe("multi_sku_competitor_list");
    expect(byTriageSku("HEX100CS-KIT")?.status).toBe("wyrestorm_candidate");
    expect(byTriageSku("C44CS-KIT")?.status).toBe("architecture_alternative");
    expect(byTriageSku("PS122")).toMatchObject({
      status: "accessory_dependency",
      batchCompareEligible: false,
      defaultIncluded: false,
    });
    expect(byTriageSku("QM55B")?.status).toBe("not_wyrestorm_addressable");
    expect(byTriageSku("XTM1U")?.status).toBe("not_wyrestorm_addressable");
    expect(byTriageSku("ABC-999")).toMatchObject({
      status: "unknown_review_required",
      wyrestormDirection: "Request an official datasheet or product URL before comparison.",
    });
    expect(analysis.triage.ignoredNoiseCount).toBeGreaterThanOrEqual(4);
    expect(analysis.triage.batchEligibleRowIds).toEqual(
      expect.arrayContaining([byTriageSku("HEX100CS-KIT")!.id, byTriageSku("C44CS-KIT")!.id]),
    );
    expect(analysis.triage.batchEligibleRowIds).not.toContain(byTriageSku("PS122")!.id);
    expect(analysis.triage.batchEligibleRowIds).not.toContain(byTriageSku("QM55B")!.id);
  });
});
