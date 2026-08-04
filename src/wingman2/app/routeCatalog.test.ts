import { describe, expect, it } from "vitest";

import { routeByPath, routeCatalogByKey } from "./routeCatalog";

describe("routeByPath", () => {
  it.each([
    ["/wingman", routeCatalogByKey.dashboard],
    ["/wingman/", routeCatalogByKey.dashboard],
    ["/wingman/projects/customer-room", routeCatalogByKey.projects],
    ["/wingman/templates/meeting-room", routeCatalogByKey.templates],
    ["/wingman/product-call-cards/MX-0404", routeCatalogByKey.productCallCards],
    ["/wingman/profile", routeCatalogByKey.profile],
    ["/wingman/compare/", routeCatalogByKey.compare],
  ])("maps %s to its governed route", (pathname, expected) => {
    expect(routeByPath(pathname)).toBe(expected);
  });

  it("returns undefined for a path outside the Wingman route catalogue", () => {
    expect(routeByPath("/wingman/not-a-feature")).toBeUndefined();
  });
});
