import { describe, expect, it } from "vitest";
import { compareInternals } from "./resolve-match.mjs";

const { domainFromStructuredCategory, roleFromStructuredCategory, isApprovedCompetitorIntelligenceRecord } = compareInternals;

describe("domainFromStructuredCategory", () => {
  it("resolves a splitter/distribution-amplifier to DISTRIBUTION, not CONTROL", () => {
    // Regression: the old blob-based detector matched "EDID management" (a
    // control *feature* on the splitter) against the CONTROL domain regex,
    // which then hard-blocked scoring against every other WyreStorm splitter.
    const domain = domainFromStructuredCategory({
      category: "Distribution",
      technology: "Distribution",
      transport: "Local",
    });
    expect(domain).toBe("DISTRIBUTION");
  });

  it("resolves an AVoIP encoder to AVOIP even when applications text mentions video walls", () => {
    // Regression: WyreStorm canonical rows include an "applications" field
    // like "Distributed AV routing, video wall, multiview or AVoIP transport"
    // describing USE CASES, not the product's own type. The old blob-based
    // detector (which concatenated every string field on the row) matched
    // "video wall" there and mislabeled a plain AVoIP encoder as VIDEO_WALL.
    const domain = domainFromStructuredCategory({
      primaryCategory: "NetworkHD AV over IP",
      category: "NetworkHD 500",
      hardwareType: "AVoIP",
      technologyType: "AVoIP",
      // Deliberately NOT included: applicationRole ("...video wall, multiview...")
    });
    expect(domain).toBe("AVOIP");
  });

  it("resolves an HDBaseT extender to EXTENDER", () => {
    const domain = domainFromStructuredCategory({
      primaryCategory: "Extension",
      category: "USB / KVM extender",
      technologyType: "HDBaseT",
    });
    expect(domain).toBe("EXTENDER");
  });

  it("resolves a matrix switcher to MATRIX", () => {
    const domain = domainFromStructuredCategory({
      primaryCategory: "Matrix / Routing",
      category: "Seamless matrix",
      hardwareType: "Matrix",
    });
    expect(domain).toBe("MATRIX");
  });

  it("returns undefined (falls back to blob detection) when given no curated fields", () => {
    expect(domainFromStructuredCategory({})).toBeUndefined();
    expect(domainFromStructuredCategory(undefined)).toBeUndefined();
  });
});

describe("roleFromStructuredCategory", () => {
  it("resolves a splitter to Distribution Amplifier, not Unknown", () => {
    // detectRole()'s blob vocabulary had no bucket for splitters/DAs at all.
    const role = roleFromStructuredCategory({ role: "distribution-amplifier", category: "Distribution" });
    expect(role).toBe("Distribution Amplifier");
  });

  it("resolves an encoder role correctly (not swapped with decoder)", () => {
    const role = roleFromStructuredCategory({ systemRole: "Encoder", subCategory: "Encoder" });
    expect(role).toBe("Encoder");
  });

  it("resolves a receiver to Decoder", () => {
    const role = roleFromStructuredCategory({ subCategory: "Receiver", systemRole: "Point-to-point extension" });
    expect(role).toBe("Decoder");
  });
});

describe("isApprovedCompetitorIntelligenceRecord", () => {
  it("accepts an approved record with no vendorType field (the CSV-driven catalogue schema)", () => {
    // Regression: this unconditionally required vendorType === "competitor",
    // but records merged in from data/catalog/competitor-products.generated.json
    // never carry that field, so every stored-intelligence lookup silently
    // failed and fell back to an unreliable live scrape for every SKU, always.
    expect(isApprovedCompetitorIntelligenceRecord({ status: "approved" })).toBe(true);
  });

  it("still rejects a record with an explicit non-competitor vendorType", () => {
    expect(isApprovedCompetitorIntelligenceRecord({ status: "approved", vendorType: "wyrestorm" })).toBe(false);
  });

  it("rejects an archived or non-approved record regardless of vendorType", () => {
    expect(isApprovedCompetitorIntelligenceRecord({ status: "approved", archived: true })).toBe(false);
    expect(isApprovedCompetitorIntelligenceRecord({ status: "review" })).toBe(false);
  });
});

describe("buildCandidateFromCatalog (WyreStorm canonical rows)", () => {
  const { buildCandidateFromCatalog } = compareInternals;

  it("classifies a splitter row as DISTRIBUTION using productClassification, not blob keywords", () => {
    const candidate = buildCandidateFromCatalog({
      sku: "SP-0108-SCL",
      name: "4K HDR 1:8 Splitter with Scaling Outputs",
      productClassification: {
        primaryCategory: "Distribution",
        category: "Splitter / distribution amplifier",
        subCategory: "Scaling splitter",
      },
      hardwareType: "Splitter / Distribution",
      technologyType: "Amplification / audio control",
      applications: "Duplicate one source to multiple displays",
    });
    expect(candidate.comparisonDomain).toBe("DISTRIBUTION");
    expect(candidate.role).toBe("Distribution Amplifier");
  });

  it("classifies an AVoIP encoder as AVOIP even with video-wall application copy present", () => {
    const candidate = buildCandidateFromCatalog({
      sku: "NHD-500-TX",
      name: "NetworkHD 500 Series Encoder",
      productClassification: {
        primaryCategory: "NetworkHD AV over IP",
        category: "NetworkHD 500",
        subCategory: "Encoder",
        applicationRole: "Distributed AV routing, video wall, multiview or AVoIP transport",
      },
      hardwareType: "AVoIP",
      technologyType: "AVoIP",
    });
    expect(candidate.comparisonDomain).toBe("AVOIP");
    expect(candidate.role).toBe("Encoder");
  });

  it("does not misclassify an HDBaseT receiver as a matrix switcher", () => {
    const candidate = buildCandidateFromCatalog({
      sku: "RX3-100",
      name: "4K HDR HDBaseT3.0 Receiver",
      productClassification: {
        primaryCategory: "Extension",
        category: "USB / KVM extender",
        subCategory: "Receiver",
      },
      technologyType: "HDBaseT",
    });
    expect(candidate.comparisonDomain).toBe("EXTENDER");
    expect(candidate.role).toBe("Decoder");
    expect(candidate.comparisonDomain).not.toBe("MATRIX");
  });
});
