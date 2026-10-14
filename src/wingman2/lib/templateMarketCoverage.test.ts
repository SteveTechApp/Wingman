import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { roomTemplates } from "./roomTemplates";
import { TEMPLATE_MARKETS, templateMatchesMarketFilter } from "./templateMarkets";
import { getTemplateApplicationProfile } from "./templateApplicationProfiles";
import { marketCoverageDesigns } from "./roomTemplatesMarketCoverage";
import { readRoomConcept } from "./roomTemplateDeployment";

describe("vertical market template coverage", () => {
  it.each(TEMPLATE_MARKETS)("offers several distinct complete templates in %s", (market) => {
    const options = roomTemplates.filter(template => templateMatchesMarketFilter(template, market));
    expect(options.length).toBeGreaterThanOrEqual(3);
    expect(new Set(options.map(template => template.application)).size).toBe(options.length);
    for (const template of options) {
      expect(readRoomConcept(template.concept), template.id).toBeDefined();
      expect(existsSync(resolve("public/template-photos", getTemplateApplicationProfile(template).imageKey)), template.id).toBe(true);
    }
  });
  it("keeps advisory industrial AV separate from operational controls", () => {
    const industrial = marketCoverageDesigns.filter(design => ["Energy / Oil & Gas", "Manufacturing / Logistics"].includes(design.vertical));
    expect(industrial).toHaveLength(8);
    for (const design of industrial) {
      expect(design.constraints.join(" ")).toContain("independent certified process control");
      expect(design.constraints.join(" ")).toContain("non-hazardous environment");
      expect(design.transport.startsWith("nhd")).toBe(false);
    }
  });
  it("keeps Custom reserved for user-authored templates", () => {
    expect(roomTemplates.filter(template => templateMatchesMarketFilter(template, "Custom"))).toHaveLength(0);
  });
});
