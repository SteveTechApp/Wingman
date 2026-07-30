import { describe, expect, it } from "vitest";
import {
  buildDesignAssuranceLedger,
  getProductAssurance,
  productCanAppearInRecommendation,
} from "./productAssurance";

describe("product assurance", () => {
  it("allows a verified active product to pass the customer-ready product gate", () => {
    const result = getProductAssurance("EX-70-H2");

    expect(result.known).toBe(true);
    expect(result.technicalStatus).toMatch(/^verified/);
    expect(result.customerReady).toBe(true);
  });

  it("blocks an active product without a verified governed profile", () => {
    const ledger = buildDesignAssuranceLedger({
      products: [{ sku: "AMP-2120" }],
      discoveryPercent: 100,
    });

    expect(ledger.customerReady).toBe(false);
    expect(ledger.blockers.some((item) => item.sku === "AMP-2120")).toBe(true);
  });

  it("adds security and resilience overlays for critical environments", () => {
    const ledger = buildDesignAssuranceLedger({
      products: [{ sku: "EX-70-H2" }],
      discoveryPercent: 100,
      requirementText: "Government command and control room for a blue-light service",
    });

    expect(ledger.warnings.some((item) => item.domain === "security")).toBe(true);
    expect(ledger.warnings.some((item) => item.domain === "resilience")).toBe(true);
  });

  it("keeps request-only and do-not-spec records out of recommendations", () => {
    expect(productCanAppearInRecommendation({ sku: "A", catalogVisibility: "request-only" })).toBe(false);
    expect(productCanAppearInRecommendation({ sku: "B", doNotSpec: true })).toBe(false);
    expect(productCanAppearInRecommendation({ sku: "C", lifecycleStatus: "active" })).toBe(true);
  });
});
