import { describe, expect, it } from "vitest";

import {
  buildCompetitorDecisionEvidence,
  buildCompetitorIntelligenceAudit,
  competitorBrandCounts,
  normalizeCompetitorSku,
} from "./competitorProductIntelligence";

describe("competitor product intelligence", () => {
  it("offers supported manufacturers before governed SKU profiles are available", () => {
    const counts = new Map(competitorBrandCounts().map(({ brand, count }) => [brand, count]));

    [
      "CYP",
      "SY Electronics",
      "Just Add Power",
      "HDANYWHERE",
      "Turtle AV",
      "Black Box",
      "Datapath",
      "Matrox Video",
      "Q-SYS",
    ].forEach((manufacturer) => expect(counts.has(manufacturer)).toBe(true));
  });

  it("normalizes messy competitor sku input into a known brand-scoped seed", () => {
    const normalized = normalizeCompetitorSku("dmnvx360", "Crestron");

    expect(normalized).toMatchObject({
      brand: "Crestron",
      sku: "DM-NVX-360",
      corrected: true,
      confidence: "brand-scoped",
    });
  });

  it("builds family-rule AVoIP evidence that carries missing-fact warnings forward", () => {
    const evidence = buildCompetitorDecisionEvidence({
      brand: "Crestron",
      sku: "DMNVX360",
      title: "Crestron DM-NVX endpoint",
    });

    expect(evidence.brand).toBe("Crestron");
    expect(evidence.sku).toBe("DM-NVX-360");
    expect(evidence.tier).toBe("family-rule");
    expect(evidence.domain).toBe("AVOIP");
    expect(evidence.role).toBe("Transceiver");
    expect(evidence.requiredFacts).toContain("endpoint role");
    expect(evidence.missingFacts).toContain("network class or codec");
    expect(evidence.readiness).toBe("needs-evidence");
    expect(evidence.whyNotDirectEquivalent.join(" ")).toMatch(/verification/i);
  });

  it("keeps controller products in a no-direct-equivalent lane instead of AV transport recommendation logic", () => {
    const evidence = buildCompetitorDecisionEvidence({
      brand: "AMX",
      sku: "NX-2200",
    });

    expect(evidence.domain).toBe("CONTROL");
    expect(evidence.role).toBe("Controller");
    expect(evidence.action).toMatch(/NO MATCH/i);
    expect(evidence.whyNotDirectEquivalent.join(" ")).toContain("Control processors are not AV transport products.");
  });

  it("makes unknown competitor items explicitly sku-only with missing evidence", () => {
    const evidence = buildCompetitorDecisionEvidence({
      brand: "Other",
      sku: "XYZ-123",
    });

    expect(evidence.tier).toBe("sku-only");
    expect(evidence.readiness).toBe("sku-only");
    expect(evidence.missingFacts).toContain("technology class");
    expect(evidence.whyNotDirectEquivalent.join(" ")).toMatch(/No technology class has been verified/i);
  });

  it("reports actionable next data tasks for the competitor intelligence audit", () => {
    const audit = buildCompetitorIntelligenceAudit();

    expect(audit.totalSkuCount).toBeGreaterThan(50);
    expect(audit.familyRuleCoverageCount).toBeGreaterThan(0);
    expect(audit.nextDataTasks.join(" ")).toMatch(/verified profiles/i);
    expect(audit.nextDataTasks.join(" ")).toMatch(/NO MATCH against AV transport endpoints/i);
  });
});
