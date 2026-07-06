import { describe, expect, it } from "vitest";
import {
  getWyreStormCompareLeadBlockReason,
  getWyreStormSkuBusinessStatus,
  isWyreStormSkuCompareLeadAllowed,
} from "./wyrestormSkuBusinessStatus";

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

  it("blocks a compare lead the admin has manually marked doNotUse", () => {
    expect(isWyreStormSkuCompareLeadAllowed("SW-740-TX")).toBe(false);
    expect(getWyreStormCompareLeadBlockReason("SW-740-TX")).toMatch(/admin override/i);
  });
});
