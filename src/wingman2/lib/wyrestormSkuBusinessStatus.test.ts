import { describe, expect, it } from "vitest";
import { WYRESTORM_CANONICAL_SKU_ALIASES } from "./skuAliasResolver";
import {
  getWyreStormCompareLeadBlockReason,
  getWyreStormSkuBusinessStatus,
  isWyreStormSkuCompareLeadAllowed,
  type WyreStormSkuBusinessStatus,
} from "./wyrestormSkuBusinessStatus";

const DEFINITIVE_STATUSES: readonly WyreStormSkuBusinessStatus[] = [
  "active",
  "discontinued",
  "do-not-spec",
  "cable",
];

describe("getWyreStormSkuBusinessStatus", () => {
  it("returns active for a confirmed active SKU", () => {
    expect(getWyreStormSkuBusinessStatus("NHD-500-TX")).toBe("active");
    expect(isWyreStormSkuCompareLeadAllowed("NHD-500-TX")).toBe(true);
  });

  it("returns discontinued for a confirmed discontinued SKU, and never lets it be a compare lead", () => {
    expect(getWyreStormSkuBusinessStatus("NHD-500-IW-TX")).toBe("discontinued");
    expect(isWyreStormSkuCompareLeadAllowed("NHD-500-IW-TX")).toBe(false);
    expect(getWyreStormCompareLeadBlockReason("NHD-500-IW-TX")).toMatch(/discontinued/i);
  });

  it("resolves a legacy alias whose raw SKU only has a vague 'review' placeholder row to its confirmed-active canonical SKU", () => {
    // Regression: NHD-610-TX has its own CSV row with lifecycle_status "review"
    // (the importer couldn't find the exact legacy string in the source
    // business lists), which used to block the alias-resolution fallback from
    // ever running - even though skuAliasResolver.ts maps it straight to the
    // confirmed-active NHD-610-TX-V2.
    expect(getWyreStormSkuBusinessStatus("NHD-610-TX")).toBe("active");
    expect(isWyreStormSkuCompareLeadAllowed("NHD-610-TX")).toBe(true);

    expect(getWyreStormSkuBusinessStatus("MX-0808-SCL")).toBe("active");
    expect(isWyreStormSkuCompareLeadAllowed("MX-0808-SCL")).toBe(true);

    expect(getWyreStormSkuBusinessStatus("APO-VX20-UC")).toBe("active");
    expect(isWyreStormSkuCompareLeadAllowed("APO-VX20-UC")).toBe(true);
  });

  it("still resolves a legacy alias with no CSV row at all to its confirmed-active canonical SKU (pre-existing behaviour, unaffected by the review-row fix)", () => {
    expect(getWyreStormSkuBusinessStatus("MX-0808-KIT")).toBe("active");
    expect(getWyreStormSkuBusinessStatus("MXV-0808-H2A")).toBe("active");
  });

  it("never lets an alias override a SKU's own definitive lifecycle status", () => {
    // If a raw SKU string itself carries a definitive status (active,
    // discontinued, do-not-spec or cable), that must always win over whatever
    // its alias-resolved canonical form would say - the SKU's own recorded
    // truth from the business list is authoritative.
    expect(getWyreStormSkuBusinessStatus("NHD-500-IW-TX")).toBe("discontinued");
  });

  it("returns unlisted for a SKU with no CSV row and no alias mapping", () => {
    expect(getWyreStormSkuBusinessStatus("NOT-A-REAL-SKU-123")).toBe("unlisted");
    expect(isWyreStormSkuCompareLeadAllowed("NOT-A-REAL-SKU-123")).toBe(false);
  });

  it("returns unlisted for an empty SKU", () => {
    expect(getWyreStormSkuBusinessStatus("")).toBe("unlisted");
  });

  it("resolves every skuAliasResolver canonicalSku to a definitive lifecycle row", () => {
    // Every canonicalSku in WYRESTORM_CANONICAL_SKU_ALIASES supplies the
    // business status for its aliases (getWyreStormSkuBusinessStatus falls
    // back to the canonical when the raw SKU has no definitive status). A
    // canonical that is missing from lifecycle.csv, or that only has a
    // non-definitive "review" placeholder row, reports as "unlisted" - every
    // alias mapped to it silently degrades to compare-risk. This pins the
    // whole map against that drift class (mirror of the successor-refs guard
    // for the alias map that supplies business status).
    expect(WYRESTORM_CANONICAL_SKU_ALIASES.length).toBeGreaterThan(0);
    for (const entry of WYRESTORM_CANONICAL_SKU_ALIASES) {
      const status = getWyreStormSkuBusinessStatus(entry.canonicalSku);
      expect(
        DEFINITIVE_STATUSES.includes(status),
        `canonicalSku "${entry.canonicalSku}" (note: ${entry.note}) must resolve to a definitive lifecycle row, but business status is "${status}". ` +
          "Add the SKU to lifecycle.csv with a real status (active/discontinued/do-not-spec/cable), or the alias resolves to compare-risk forever.",
      ).toBe(true);
    }
  });

  it("blocks a compare lead the admin has manually marked doNotUse", () => {
    expect(isWyreStormSkuCompareLeadAllowed("SW-740-TX")).toBe(false);
    expect(getWyreStormCompareLeadBlockReason("SW-740-TX")).toMatch(/admin override/i);
  });
});
