import { describe, expect, it } from "vitest";
import type { TemplateBomRow } from "./roomTemplates";
import { applyProductPageDetailsToBomRow, type ProductPageDetails } from "./productPageIntake";
import { buildTemplateProposal } from "./templateReviewProposal";
import { roomTemplates } from "./roomTemplates";

const placeholderRow: TemplateBomRow = {
  id: "row-1",
  sku: "BY-OTHERS-DISPLAY-1",
  description: "55–65-inch commercial display",
  role: "Commercial display by others",
  qty: 2,
  type: "Validate",
  status: "validate",
  evidence: "Scope allowance only.",
  notes: "Select a model for the viewing distance.",
  owner: "integrator",
  manufacturer: "",
  model: "",
};

const details: ProductPageDetails = {
  ok: true,
  resolvedUrl: "https://www.example-displays.com/products/propanel-65",
  title: "ProPanel 65 - Commercial 4K Display | Example Displays",
  summary: "ProPanel 65 is a 65-inch commercial 4K display rated for 16/7 operation.",
  keySpecs: ["65-inch 4K UHD panel", "2 × HDMI inputs", "16/7 operating hours"],
  fetchedAt: "2026-10-02T09:00:00.000Z",
};

describe("applyProductPageDetailsToBomRow", () => {
  it("populates manufacturer, model, source and specifications on a placeholder row", () => {
    const row = applyProductPageDetailsToBomRow(placeholderRow, details);
    expect(row.manufacturer).toBe("Example Displays");
    expect(row.model).toBe("PROPANEL-65");
    expect(row.sourceUrl).toBe("https://www.example-displays.com/products/propanel-65");
    expect(row.sourceCheckedOn).toBe("2026-10-02");
    expect(row.specifications).toContain("65-inch 4K UHD panel");
    expect(row.notes).toContain("Source: https://www.example-displays.com/products/propanel-65");
    expect(row.evidence).toContain("Product page read 2026-10-02");
    expect(row.owner).toBe("integrator");
    expect(row.productRelationship).toBe("complementary");
  });

  it("keeps the authored scope description unless the row is still generic", () => {
    const kept = applyProductPageDetailsToBomRow(placeholderRow, details);
    expect(kept.description).toBe("55–65-inch commercial display");
    const generic = applyProductPageDetailsToBomRow({ ...placeholderRow, description: "Third-party placeholder" }, details);
    expect(generic.description).toContain("ProPanel 65");
  });

  it("moves a WyreStorm product page into WyreStorm scope", () => {
    const row = applyProductPageDetailsToBomRow(placeholderRow, {
      ...details,
      resolvedUrl: "https://www.wyrestorm.com/product/nhd-120-tx/",
      title: "NHD-120-TX | WyreStorm",
      summary: "NetworkHD 120 series encoder.",
      keySpecs: ["HDMI input", "1Gb Ethernet"],
      manufacturer: "WyreStorm",
    });
    expect(row.manufacturer).toBe("WyreStorm");
    expect(row.owner).toBe("wyrestorm");
    expect(row.productRelationship).toBeUndefined();
    expect(row.sku).toBe("NHD-120-TX");
    const proposal = buildTemplateProposal(roomTemplates[0], [row]);
    expect(proposal.products).toEqual(expect.arrayContaining([expect.objectContaining({ sku: "NHD-120-TX", quantity: 2 })]));
    expect(proposal.applicationProposal?.productSpecifications).toEqual(expect.arrayContaining([expect.objectContaining({ sku: "NHD-120-TX" })]));
    expect(proposal.applicationProposal?.thirdPartyScope?.some(item => item.category === row.role)).toBe(false);
  });

  it("retains third-party placeholders and existing catalogue SKUs", () => {
    expect(applyProductPageDetailsToBomRow(placeholderRow, details).sku).toBe(placeholderRow.sku);
    expect(applyProductPageDetailsToBomRow({ ...placeholderRow, sku: "NHD-600-TX" }, {
      ok: true, manufacturer: "WyreStorm", model: "NHD-120-TX",
    }).sku).toBe("NHD-600-TX");
  });

  it("retains a placeholder when the WyreStorm page has no identifiable model", () => {
    expect(applyProductPageDetailsToBomRow(placeholderRow, {
      ok: true, manufacturer: "WyreStorm", title: "NetworkHD products",
      resolvedUrl: "https://www.wyrestorm.com/products/",
    }).sku).toBe(placeholderRow.sku);
  });

  it("suggests the model from an SKU-style title before the URL slug", () => {
    const row = applyProductPageDetailsToBomRow(placeholderRow, {
      ...details,
      resolvedUrl: "https://www.example-displays.com/products/propanel-65",
      title: "NHD-120-TX | Example Displays",
      summary: "Encoder for NetworkHD systems.",
      keySpecs: ["HDMI input", "1Gb Ethernet"],
    });
    expect(row.model).toBe("NHD-120-TX");
  });

  it("rejects category-style URL slugs as models", () => {
    const row = applyProductPageDetailsToBomRow(placeholderRow, {
      ...details,
      resolvedUrl: "https://www.example-displays.com/products/65-inch-commercial-display",
      title: "Commercial displays for every space",
    });
    expect(row.model).toBe("");
  });

  it("returns the row unchanged when the page could not be read", () => {
    expect(applyProductPageDetailsToBomRow(placeholderRow, { ok: false })).toEqual(placeholderRow);
  });
});
