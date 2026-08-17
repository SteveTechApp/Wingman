import { describe, expect, it } from "vitest";
import {
  buildRealWyrestormCandidates,
  isRealCatalogEntryLeadEligible,
  mapRealCatalogEntryToCompareCandidate,
  mergeRealWyrestormCatalog,
  type ProductIntelligenceIndexEntry,
} from "./ComparePageNew.advanced";
import type { WyreStormProduct } from "../lib/compareVerdictPipeline";
import fixture from "../lib/__fixtures__/productIntelligenceIndexSample.json";

// This fixture is a trimmed sample of real entries from
// public/product-intelligence-index.json (regenerated from
// data/wingman-canonical-product-store.json), covering: an audio product
// (AMP-2120), an active PTZ camera not present in the hand-typed
// WYRESTORM_PRODUCTS list (CAM-210-PTZ), a discontinued/do-not-spec PTZ camera
// (CAM-200-PTZ), a matrix (MX-0808-KIT-V2), an AVoIP encoder (NHD-500-TX), a
// splitter whose real productClassification.category literally reads
// "Splitter / distribution amplifier" (SP-0104-H2 - this is the exact text
// that previously false-matched the bare "AMPLIFIER" keyword and misclassified
// it as network audio), and a request-only cable (CAB-DAOC-10-C).
const entries = fixture.products as unknown as ProductIntelligenceIndexEntry[];

function entry(sku: string): ProductIntelligenceIndexEntry {
  const found = entries.find((item) => item.sku === sku);
  if (!found) throw new Error(`Fixture entry not found: ${sku}`);
  return found;
}

describe("real WyreStorm catalogue integration", () => {
  describe("isRealCatalogEntryLeadEligible", () => {
    it("allows active primary/endpoint/workflow hardware", () => {
      expect(isRealCatalogEntryLeadEligible(entry("AMP-2120"))).toBe(true);
      expect(isRealCatalogEntryLeadEligible(entry("CAM-210-PTZ"))).toBe(true);
      expect(isRealCatalogEntryLeadEligible(entry("MX-0808-KIT-V2"))).toBe(true);
    });

    it("excludes discontinued / do-not-spec products", () => {
      expect(isRealCatalogEntryLeadEligible(entry("CAM-200-PTZ"))).toBe(false);
    });

    it("excludes request-only accessories such as cables", () => {
      expect(isRealCatalogEntryLeadEligible(entry("CAB-DAOC-10-C"))).toBe(false);
    });
  });

  describe("mapRealCatalogEntryToCompareCandidate", () => {
    it("classifies a real AVoIP encoder correctly", () => {
      const candidate = mapRealCatalogEntryToCompareCandidate(entry("NHD-500-TX"));
      expect(candidate?.productClass).toBe("AV-over-IP");
    });

    it("classifies a real matrix correctly", () => {
      const candidate = mapRealCatalogEntryToCompareCandidate(entry("MX-0808-KIT-V2"));
      expect(candidate?.productClass).toBe("Matrix");
    });

    it("classifies a real PTZ camera not present in the hand-typed list", () => {
      const candidate = mapRealCatalogEntryToCompareCandidate(entry("CAM-210-PTZ"));
      expect(candidate?.productClass).toBe("PTZ camera");
    });

    it("classifies a real HDMI splitter as a splitter, not network audio", () => {
      // Regression: SP-0104-H2's real productClassification.category is
      // "Splitter / distribution amplifier" - the bare word "amplifier" in
      // that phrase previously false-matched extractTags()'s network-audio
      // keyword check, misclassifying every real splitter product as audio
      // equipment (fixed alongside this feature; see extractTags()'s
      // "network audio" tag and roleFromTags()'s splitter-vs-encoder order).
      const candidate = mapRealCatalogEntryToCompareCandidate(entry("SP-0104-H2"));
      expect(candidate?.productClass).toBe("HDMI splitter");
      expect(candidate?.role).toBe("Distribution amplifier");
    });

    it("classifies HDBaseT extender receivers correctly despite lingering 'camera'/'ndi' pollution in technologies/tags", () => {
      // Regression: RX-700/RX3-100 are real HDBaseT USB/KVM extender receivers
      // whose own datasheet text says "supports data transmission of USB 2.0
      // devices like HD webcams..." - the bare word "webcam" previously leaked
      // into tools/enrich-wyrestorm-product-intelligence.mjs's classification,
      // and from there into technologies/tags/features (e.g. RX-700's real
      // `technologies` array still contains "Camera / Capture" and "NDI" from
      // that prior bad run - this fixture intentionally keeps that pollution
      // to prove productClass/role are now derived from the curated taxonomy
      // (primarySystemFamily/productClassification), not the polluted blob.
      const rx700 = mapRealCatalogEntryToCompareCandidate(entry("RX-700"));
      expect(rx700?.productClass).toBe("HDBaseT extender");
      expect(rx700?.role).toBe("TX/RX extender kit");

      const rx3100 = mapRealCatalogEntryToCompareCandidate(entry("RX3-100"));
      expect(rx3100?.productClass).toBe("HDBaseT extender");
      expect(rx3100?.role).toBe("TX/RX extender kit");
    });

    it("classifies an AVoIP transceiver correctly despite the same lingering pollution", () => {
      const candidate = mapRealCatalogEntryToCompareCandidate(entry("NHD-600-TRXF"));
      expect(candidate?.productClass).toBe("AV-over-IP");
      expect(candidate?.role).toBe("Transceiver");
    });

    it("carries the real technicalProfile through for the rigorous classifier", () => {
      const candidate = mapRealCatalogEntryToCompareCandidate(entry("NHD-500-TX")) as WyreStormProduct & {
        technicalProfile?: unknown;
      };
      expect(candidate.technicalProfile).toBeTruthy();
    });

    it("returns null for an entry with no SKU", () => {
      expect(mapRealCatalogEntryToCompareCandidate({})).toBeNull();
    });
  });

  describe("buildRealWyrestormCandidates", () => {
    const candidates = buildRealWyrestormCandidates(fixture);
    const skus = candidates.map((candidate) => candidate.sku);

    it("includes eligible active hardware", () => {
      expect(skus).toEqual(expect.arrayContaining(["AMP-2120", "CAM-210-PTZ", "MX-0808-KIT-V2", "NHD-500-TX", "SP-0104-H2"]));
    });

    it("excludes discontinued products and request-only accessories", () => {
      expect(skus).not.toContain("CAM-200-PTZ");
      expect(skus).not.toContain("CAB-DAOC-10-C");
    });

    it("returns an empty array for a malformed or missing payload", () => {
      expect(buildRealWyrestormCandidates(null)).toEqual([]);
      expect(buildRealWyrestormCandidates({})).toEqual([]);
      expect(buildRealWyrestormCandidates({ products: "not-an-array" })).toEqual([]);
    });
  });

  describe("mergeRealWyrestormCatalog", () => {
    const handTyped: WyreStormProduct[] = [
      {
        sku: "SP-0104-H2",
        name: "Hand-typed splitter placeholder",
        family: "HDMI Distribution",
        productClass: "HDMI splitter",
        role: "Distribution amplifier",
        transport: "HDMI distribution",
        tags: ["splitter"],
        caveat: "hand-typed",
      },
      {
        sku: "SW-0206-VW",
        name: "Hand-typed-only entry not in the real catalogue",
        family: "Video Wall",
        productClass: "Video wall",
        role: "Processor",
        transport: "HDMI processing",
        tags: ["video wall"],
        caveat: "hand-typed",
      },
    ];

    it("prefers the real entry over a hand-typed one on SKU collision", () => {
      const real = buildRealWyrestormCandidates(fixture);
      const merged = mergeRealWyrestormCatalog(handTyped, real);
      const splitter = merged.find((product) => product.sku === "SP-0104-H2");

      expect(splitter?.name).not.toBe("Hand-typed splitter placeholder");
      expect(splitter?.name).toContain("HDMI Splitter");
    });

    it("keeps hand-typed entries that have no real-catalogue counterpart", () => {
      const real = buildRealWyrestormCandidates(fixture);
      const merged = mergeRealWyrestormCatalog(handTyped, real);

      expect(merged.some((product) => product.sku === "SW-0206-VW")).toBe(true);
    });

    it("adds real-catalogue-only entries not present in the hand-typed list", () => {
      const real = buildRealWyrestormCandidates(fixture);
      const merged = mergeRealWyrestormCatalog(handTyped, real);

      expect(merged.some((product) => product.sku === "CAM-210-PTZ")).toBe(true);
    });

    it("is a no-op when there is no real data", () => {
      expect(mergeRealWyrestormCatalog(handTyped, [])).toBe(handTyped);
    });
  });
});
