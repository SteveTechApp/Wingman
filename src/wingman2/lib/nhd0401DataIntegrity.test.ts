import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

type JsonRecord = Record<string, any>;

function readJson(relativePath: string): JsonRecord {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), relativePath), "utf8"));
}

function productFrom(relativePath: string): JsonRecord {
  const payload = readJson(relativePath);
  const products = payload.products ?? payload.records ?? payload;
  const product = products.find((item: JsonRecord) => item.sku === "NHD-0401-MV");
  expect(product, `${relativePath} must contain NHD-0401-MV`).toBeTruthy();
  return product;
}

describe("NHD-0401-MV governed product integrity", () => {
  it.each([
    "data-sources/wyrestorm/enrichment.json",
    "data/wingman-canonical-product-store.json",
    "public/product-intelligence-index.json",
  ])("keeps the local-HDMI architecture in %s", (relativePath) => {
    const product = productFrom(relativePath);

    expect(product.productClassification).toMatchObject({
      primaryCategory: "Video Processing",
      category: "Multiview processor",
      productType: "4-input HDMI multiview processor",
      transportClass: ["HDMI", "1GbE control"],
    });
    expect(product.technologyType).toBe("Video Processing");
    expect(product.avoip).toBeUndefined();
    expect(product.sourceCatalog.networkRequirement).toMatch(/control \/ integration/i);
    expect(product.sourceCatalog.networkRequirement).not.toMatch(/managed AV network/i);
    expect(product.features ?? []).not.toEqual(expect.arrayContaining(["AVoIP", "NetworkHD 100", "AVoIP multiview processor"]));
    expect(JSON.stringify(product.salesLanguage)).toMatch(/local HDMI/i);
    expect(JSON.stringify(product.salesLanguage)).not.toMatch(/moves AV around the building/i);
  });

  it("preserves the verified functional ports without treating accessories as I/O", () => {
    const product = productFrom("data/wingman-canonical-product-store.json");
    const ports = product.technicalProfile.io.ports;

    expect(ports).toHaveLength(6);
    expect(ports).toEqual(expect.arrayContaining([
      expect.objectContaining({ count: 4, connector: "HDMI", direction: "input", category: "video" }),
      expect.objectContaining({ count: 1, connector: "HDMI", direction: "output", category: "video" }),
      expect.objectContaining({ connector: "3.5mm TRS", direction: "output", category: "audio" }),
      expect.objectContaining({ connector: "3-pin Phoenix", category: "control", detail: expect.stringMatching(/RS-232/i) }),
      expect.objectContaining({ connector: "RJ45", category: "network" }),
    ]));
    expect(JSON.stringify(ports)).not.toMatch(/remote|mount|guide|power supply/i);
  });

  it("retains the supplied video, control and power specification", () => {
    const product = productFrom("data/wingman-canonical-product-store.json");
    const profile = product.technicalProfile;

    expect(profile.video.maxResolutions).toEqual(expect.arrayContaining([
      "5120x2160@30Hz 4:4:4 (Ultra-Wide 5K)",
      "5120x1440@60Hz 4:4:4 (Super-Wide 5K)",
      "4096x2160@60Hz 4:4:4 (DCI 4K)",
      "3840x2160@60Hz 4:4:4 (UHD)",
    ]));
    expect(profile.video.standards).toEqual(expect.arrayContaining([
      "HDMI 2.0b", "HDCP 2.2", "CEC", "EDID", "RGB", "DCI", "BT.2020", "Rec.709",
    ]));
    expect(profile.video.bandwidth).toContain("600MHz maximum pixel clock");
    expect(profile.video.outputEncoding).toBe("Uncompressed HDMI");
    expect(profile.power.evidence).toEqual(expect.arrayContaining(["12V 2A DC", "18W"]));
  });
});
