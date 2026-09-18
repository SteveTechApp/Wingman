import { describe, expect, it } from "vitest";
import { featureJourneyActions, featureJourneyRouteKeys } from "./featureJourney";

describe("feature journey", () => {
  it("provides useful actions without linking a route to itself", () => {
    for (const routeKey of featureJourneyRouteKeys) {
      const actions = featureJourneyActions(routeKey);
      expect(actions.length, routeKey).toBeGreaterThan(0);
      expect(actions.every((action) => action.routeKey !== routeKey), routeKey).toBe(true);
    }
  });

  it("connects Product Workspace to coaching, discovery, and compare", () => {
    expect(featureJourneyActions("products", { sku: "MX-0404" }).map((action) => action.routeKey)).toEqual([
      "callCoach", "discovery", "compare",
    ]);
  });

  it("preserves safe SKU and project context", () => {
    const product = featureJourneyActions("catalogBrowser", { sku: "MX-0404" }).find((action) => action.routeKey === "productPitch");
    const publication = featureJourneyActions("recommendations", { projectId: "project-1" }).find((action) => action.routeKey === "proposal");
    expect(product?.to).toContain("sku=MX-0404");
    expect(publication?.to).toContain("projectId=project-1");
  });
});
