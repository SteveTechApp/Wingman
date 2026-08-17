import { describe, expect, it } from "vitest";
import { evaluateProductEligibility } from "./compareEligibilityEngine";

function fit(
  competitorText: string,
  product: Record<string, unknown>,
) {
  const sku = String(product.sku ?? "");

  return evaluateProductEligibility({
    intent: "extender",
    competitorText,
    match: { sku },
    product,
  });
}

describe("structured extender fit", () => {
  it("keeps a normal unconstrained active extender in the direct lane", () => {
    const result = fit("HDBaseT HDMI extender", {
      sku: "EX-100-G2",
      name: "HDBaseT HDMI extender",
    });

    expect(result.eligibility).toBe("direct");
  });

  it("downgrades an active 35m extender that cannot reach a 100m requirement", () => {
    const result = fit("100m HDBaseT HDMI extender", {
      sku: "EX-35-H2",
      name: "35m 4K60 HDBaseT Extender",
    });

    expect(result.eligibility).toBe("related-only");
    expect(result.reasons.join(" ")).toMatch(/35m.*below.*100m/i);
  });

  it("keeps an active 100m extender direct for a 70m requirement", () => {
    const result = fit("70m HDBaseT HDMI extender", {
      sku: "EX-100-G2",
      name: "100m 4K HDBaseT Extender",
    });

    expect(result.eligibility).toBe("direct");
    expect(result.reasons.join(" ")).toMatch(/covers.*70m/i);
  });

  it("fails closed when distance is mandatory but candidate reach is not evidenced", () => {
    // EX-100-G2 is a real active SKU so it passes the lifecycle/business gate,
    // but this fixture deliberately withholds distance evidence from the product
    // record. The fit layer must not infer "100m" from the model number.
    const result = fit("100m HDBaseT HDMI extender", {
      sku: "EX-100-G2",
      name: "HDBaseT HDMI extender",
    });

    expect(result.eligibility).toBe("related-only");
    expect(result.reasons.join(" ")).toMatch(/reach is not evidenced/i);
  });

  it("downgrades a non-USB active extender when USB extension is required", () => {
    const result = fit("100m USB 3.0 extension", {
      sku: "EX-100-G2",
      name: "100m HDMI HDBaseT extender",
    });

    expect(result.eligibility).toBe("related-only");
    expect(result.reasons.join(" ")).toMatch(/USB extension is required/i);
  });

  it("keeps the active USB3 extender direct when USB transport is evidenced", () => {
    const result = fit("100m USB 3.0 extension", {
      sku: "EX-100-USB3",
      name: "100m USB 3.0 Extender",
    });

    expect(result.eligibility).toBe("direct");
    expect(result.reasons.join(" ")).toMatch(/required USB extension path/i);
  });

  it("does not treat USB extension alone as a KVM equivalent", () => {
    const result = fit("100m HDMI USB KVM extender", {
      sku: "EX-100-USB3",
      name: "100m USB 3.0 Extender",
    });

    expect(result.eligibility).toBe("related-only");
    expect(result.reasons.join(" ")).toMatch(/KVM.*required/i);
  });

  it("keeps the active KVM extender direct when reach and KVM are evidenced", () => {
    const result = fit("100m HDMI USB KVM extender", {
      sku: "EX-100-KVM",
      name: "100m HDMI and USB KVM Extender over HDBaseT",
    });

    expect(result.eligibility).toBe("direct");
    expect(result.reasons.join(" ")).toMatch(/required KVM/i);
  });

  it("keeps an active presentation switcher as an architecture alternative", () => {
    const result = fit("100m USB KVM extender", {
      sku: "SW-620-TX-W",
      name: "Wireless Conferencing Presentation Switcher",
    });

    expect(result.eligibility).toBe("architecture-alternative");
  });
});