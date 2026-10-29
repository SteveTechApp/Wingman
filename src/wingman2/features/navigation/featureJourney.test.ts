import { describe, expect, it } from "vitest";
import { routeCatalogByKey, type WingmanRouteKey } from "../../app/routeCatalog";
import { featureJourneyActions, featureJourneyRouteKeys } from "./featureJourney";

/**
 * The routes where the strip's word for a destination is not the name the page
 * prints, held against the manifest the app reads that name from.
 *
 * They fall in two classes, and `featureJourney.ts` records why each word is the
 * one it is. `NAMED_DIFFERENTLY` names the route: `Discovery` is the route and the
 * work, `Product Workspace` is the page a rep lands on, `Video Wall` is the wall
 * page's short form, and each of those pages prints something else in its chrome
 * (`Opportunities`, `Products`, `Video wall designer`). `NAMED_AS_THE_MOVE` names
 * what a rep does there and what they carry into it: `Position` for the Product
 * Positioning page, and `response` for Responses, whose own nav row already says
 * `Build response`.
 *
 * Both are read from the catalog instead of a copy of the manifest, so renaming a
 * page moves this reading and aligning an entry to the page's label fails here. The
 * move words are held to a second fact — neither of the manifest's names for the
 * route — because that is what separates them from a route word: a route word may
 * be its own `navLabel`, which is exactly what `Video Wall` is.
 *
 * Those destinations are then held to each other: no two entries into one of them
 * may print the same words. Three entries reading `Build the response` passed
 * every reading above, because each did name the work — so the check that an entry
 * says something a rep can act on has to be that the entries differ, since a list
 * of identical moves tells a rep nothing about which one to take.
 *
 * The rule these are the decided exceptions to is recorded above `relationships`
 * in `featureJourney.ts`; the wall page's own naming rules live in
 * `lib/wallEntry.ts`, which points back at it.
 */
const NAMED_DIFFERENTLY = [
  { routeKey: "discovery", navigation: "Discovery", pageLabel: "Opportunities" },
  { routeKey: "products", navigation: "Product Workspace", pageLabel: "Products" },
  { routeKey: "videowall", navigation: "Video Wall", pageLabel: "Video wall designer" },
] as const satisfies readonly { routeKey: WingmanRouteKey; navigation: string; pageLabel: string }[];

const NAMED_AS_THE_MOVE = [
  { routeKey: "productPitch", move: "Position", pageLabel: "Product Positioning" },
  { routeKey: "responsePack", move: "response", pageLabel: "Responses" },
] as const satisfies readonly { routeKey: WingmanRouteKey; move: string; pageLabel: string }[];

/** Every label the strip prints for an entry that opens `routeKey`. */
const labelsInto = (routeKey: WingmanRouteKey) =>
  featureJourneyRouteKeys
    .flatMap((key) => featureJourneyActions(key))
    .filter((action) => action.routeKey === routeKey)
    .map((action) => action.label);

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
    const response = featureJourneyActions("recommendations", { projectId: "project-1" }).find((action) => action.routeKey === "responsePack");
    expect(product?.to).toContain("sku=MX-0404");
    expect(response?.to).toContain("projectId=project-1");
  });

  it("names the destinations whose pages print another word the app's way", () => {
    for (const { routeKey, navigation, pageLabel } of NAMED_DIFFERENTLY) {
      // The difference is real today: the page prints its own label, the strip
      // says the app's word for the route, and the two are not the same string.
      expect(routeCatalogByKey[routeKey].label, routeKey).toBe(pageLabel);
      expect(navigation, routeKey).not.toBe(pageLabel);
      expect(labelsInto(routeKey).some((label) => label.includes(navigation)), routeKey).toBe(true);
      // The page's label is not what the strip promises a rep they are opening:
      // that name is on screen when they arrive, so the entry would promise the
      // arrival twice and name nothing the list is for.
      expect(labelsInto(routeKey).some((label) => label.includes(pageLabel)), routeKey).toBe(false);
    }
  });

  it("names the move where the entry offers what a rep does rather than a page title", () => {
    for (const { routeKey, move, pageLabel } of NAMED_AS_THE_MOVE) {
      const route = routeCatalogByKey[routeKey];
      const labels = labelsInto(routeKey);

      expect(route.label, routeKey).toBe(pageLabel);
      expect(labels.some((label) => label.includes(move)), routeKey).toBe(true);
      // Not the page's name on arrival, which its chrome prints anyway...
      expect(labels.some((label) => label.includes(pageLabel)), routeKey).toBe(false);
      // ...and not this route's nav word either. That is what makes these words
      // the move's rather than the route's: `Video Wall` is its route's own
      // `navLabel`, so a route word cannot be held to this.
      expect(labels.some((label) => label.includes(route.navLabel)), routeKey).toBe(false);
    }
  });

  it("gives every entry into a move destination its own words", () => {
    // An entry that says what it carries cannot read the same as its neighbour;
    // three `Build the response` entries named the work and still left a rep no
    // way to tell them apart.
    for (const { routeKey, pageLabel } of NAMED_AS_THE_MOVE) {
      const labels = labelsInto(routeKey);
      expect(labels.length, pageLabel).toBeGreaterThan(1);
      expect(new Set(labels).size, `${pageLabel}: ${labels.join(" | ")}`).toBe(labels.length);
    }
  });
});
