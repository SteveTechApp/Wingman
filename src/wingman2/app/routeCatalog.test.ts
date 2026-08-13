import { describe, expect, it } from "vitest";

import { routeByPath, routeCatalogByKey } from "./routeCatalog";

describe("routeByPath", () => {
  it.each([
    ["/wingman", routeCatalogByKey.dashboard],
    ["/wingman/", routeCatalogByKey.dashboard],
    ["/wingman/projects/customer-room", routeCatalogByKey.projects],
    ["/wingman/templates/meeting-room", routeCatalogByKey.templates],
    ["/wingman/product-call-cards/MX-0404", routeCatalogByKey.productCallCards],
    ["/wingman/product-families/networkhd-500", routeCatalogByKey.productFamilies],
    ["/wingman/profile", routeCatalogByKey.profile],
    ["/wingman/compare/", routeCatalogByKey.compare],
    ["/wingman/proposal-visuals", routeCatalogByKey.proposalVisuals],
  ])("maps %s to its governed route", (pathname, expected) => {
    expect(routeByPath(pathname)).toBe(expected);
  });

  it("returns undefined for a path outside the Wingman route catalogue", () => {
    expect(routeByPath("/wingman/not-a-feature")).toBeUndefined();
  });

  it("exposes the consolidated Proposal Visuals destination", () => {
    expect(routeCatalogByKey.proposalVisuals.path).toBe("/wingman/proposal-visuals");
  });
});
