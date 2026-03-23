import { describe, expect, it } from "vitest";

import { filterProducts } from "./catalogue.utils";
import type { CatalogueProduct } from "./catalogue.types";

const BASE_FILTERS = {
  search: "",
  technology: [],
  category: [],
  subType: [],
  featureTags: [],
  status: [],
};

function makeProduct(input: Partial<CatalogueProduct> & Pick<CatalogueProduct, "sku" | "name" | "technology" | "technologyTags" | "category" | "subType" | "summary" | "status" | "applications" | "featureTags">): CatalogueProduct {
  return {
    resolution: undefined,
    distance: undefined,
    transport: undefined,
    ...input,
  };
}

describe("filterProducts", () => {
  it("matches selected technology against overlapping technology tags", () => {
    const products: CatalogueProduct[] = [
      makeProduct({
        sku: "CAM-210-PTZ",
        name: "PTZ Camera",
        technology: "Cameras / Video Bars",
        technologyTags: ["Cameras / Video Bars", "USB / KVM", "Presentation / UC"],
        category: "Camera",
        subType: "PTZ Camera",
        summary: "PTZ camera with USB 3.0 streaming support",
        status: "Current",
        applications: ["Meeting Rooms"],
        featureTags: ["ptz-camera", "streaming-camera", "USB 3.0"],
      }),
      makeProduct({
        sku: "NHD-500-TX",
        name: "AVoIP Encoder",
        technology: "AV over IP",
        technologyTags: ["AV over IP", "USB / KVM"],
        category: "AVoIP",
        subType: "AVoIP Encoder",
        summary: "Encoder with USB 2.0 routing",
        status: "Current",
        applications: ["Corporate"],
        featureTags: ["avoip-encoder", "USB 2.0"],
      }),
      makeProduct({
        sku: "AMP-1",
        name: "Amplifier",
        technology: "Audio",
        technologyTags: ["Audio"],
        category: "Amplifier",
        subType: "Dante Amplifier",
        summary: "Audio amplifier",
        status: "Current",
        applications: ["Hospitality"],
        featureTags: ["audio-device"],
      }),
    ];

    const results = filterProducts(
      products,
      { ...BASE_FILTERS, technology: ["USB / KVM"] },
      "relevance"
    );

    expect(results.map((product) => product.sku)).toEqual(["CAM-210-PTZ", "NHD-500-TX"]);
  });

  it("still allows follow-on filters to narrow broad USB results", () => {
    const products: CatalogueProduct[] = [
      makeProduct({
        sku: "CAM-210-PTZ",
        name: "PTZ Camera",
        technology: "Cameras / Video Bars",
        technologyTags: ["Cameras / Video Bars", "USB / KVM", "Presentation / UC"],
        category: "Camera",
        subType: "PTZ Camera",
        summary: "PTZ camera with USB 3.0 streaming support",
        status: "Current",
        applications: ["Meeting Rooms"],
        featureTags: ["ptz-camera", "USB 3.0"],
      }),
      makeProduct({
        sku: "USB-HUB4",
        name: "USB Hub",
        technology: "USB / KVM",
        technologyTags: ["USB / KVM", "Accessories"],
        category: "Accessory",
        subType: "USB Hub",
        summary: "USB hub",
        status: "Current",
        applications: ["Collaboration"],
        featureTags: ["USB 3.2"],
      }),
    ];

    const results = filterProducts(
      products,
      { ...BASE_FILTERS, technology: ["USB / KVM"], category: ["Camera"] },
      "relevance"
    );

    expect(results.map((product) => product.sku)).toEqual(["CAM-210-PTZ"]);
  });

  it("supports narrowing by subtype after selecting a broader product type", () => {
    const products: CatalogueProduct[] = [
      makeProduct({
        sku: "NHD-500-TX",
        name: "AVoIP Encoder",
        technology: "AV over IP",
        technologyTags: ["AV over IP"],
        category: "AVoIP",
        subType: "AVoIP Encoder",
        summary: "Encoder",
        status: "Current",
        applications: ["Corporate"],
        featureTags: ["encoder"],
      }),
      makeProduct({
        sku: "NHD-500-RX",
        name: "AVoIP Decoder",
        technology: "AV over IP",
        technologyTags: ["AV over IP"],
        category: "AVoIP",
        subType: "AVoIP Decoder",
        summary: "Decoder",
        status: "Current",
        applications: ["Corporate"],
        featureTags: ["decoder"],
      }),
    ];

    const results = filterProducts(
      products,
      { ...BASE_FILTERS, category: ["AVoIP"], subType: ["AVoIP Decoder"] },
      "relevance"
    );

    expect(results.map((product) => product.sku)).toEqual(["NHD-500-RX"]);
  });
});
