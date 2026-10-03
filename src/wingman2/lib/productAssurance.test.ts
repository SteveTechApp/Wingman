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

  it("blocks a product without a verified governed profile", () => {
    // Every profiled SKU carries a verified governed profile (confirmation
    // pass 3, 2026-09-30), so the gate is exercised with a real catalogue SKU
    // that has no governed profile at all: it must be blocked, not silently
    // quotable.
    const ledger = buildDesignAssuranceLedger({
      products: [{ sku: "APO-100-UC" }],
      discoveryPercent: 100,
    });

    expect(ledger.customerReady).toBe(false);
    expect(
      ledger.blockers.some((item) => item.sku === "APO-100-UC" && /verified governed technical profile/.test(item.message)),
    ).toBe(true);
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
