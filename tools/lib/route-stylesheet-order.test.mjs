import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ROUTE_ORDER_BASELINE_FILE,
  describeRouteOrderPages,
  describeRouteOrderReport,
  routeKeyMap,
  routeOrderBaselineFailure,
  routeOrderPagePairs,
  routeOrderPairKey,
  routeOwnedCss,
  routeStylesheetOrderReport,
} from "./route-stylesheet-order.mjs";
import { LEGACY_ROUTE_OVERRIDES, ROUTE_PAGE_STYLESHEETS } from "./route-stylesheets.mjs";

const ROOT = process.cwd();
const STYLE_DIRECTORY = path.join("src", "wingman2", "styles");

const LEGACY = `
.wm-card { padding: 4px; }
html[data-wingman-route="glossary"] .wm-glossary-term { color: #111; }
html[data-wingman-route="glossary"] .wm-glossary-term { color: #222; }
@media (min-width: 800px) { html[data-wingman-route="glossary"] .wm-glossary-term { color: #333; } }
.wm-route-compare .alpha { display: block; }
html[data-wingman-route="glossary"] .wm-glossary-toolbar, html[data-wingman-route="compare"] .wm-compare-panel { gap: 2px; }
`;

const PAGE_SOURCES = {
  "wingman-route-glossary.css": 'html[data-wingman-route="glossary"] .wm-glossary-term { color: #444; }\n',
  "wingman-route-compare.css": ".wm-route-compare .beta { display: grid; }\n",
};

/** A throwaway repo root holding the route stylesheets the report reads. */
function fixtureRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "route-order-"));
  const directory = path.join(root, STYLE_DIRECTORY);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, LEGACY_ROUTE_OVERRIDES), LEGACY, "utf8");
  for (const page of ROUTE_PAGE_STYLESHEETS) {
    fs.writeFileSync(path.join(directory, page.file), PAGE_SOURCES[page.file] ?? "/* nothing split here */\n", "utf8");
  }
  return root;
}

const LONG_REASON = "The page's own rules load after the shared copy for the same page, and every pair below is that page's later word.";

function reviewedPages(report) {
  return report.pages.map((page) => ({
    route: page.route,
    file: page.file,
    reason: LONG_REASON,
    pairs: routeOrderPagePairs(page).map(({ property, important, specificity, media, first, second }) => ({ property, important, specificity, media, first, second })),
  }));
}

describe("route-owned rules", () => {
  it("keeps only the rules every branch pins to the page", () => {
    const owned = routeOwnedCss(LEGACY, ["glossary"], routeKeyMap());

    expect(owned).toContain(".wm-glossary-term");
    // A rule written for every page is the shared remainder's, not this page's.
    expect(owned).not.toContain(".wm-card");
    // A mixed list names another page, so the split left it behind.
    expect(owned).not.toContain(".wm-glossary-toolbar, html[data-wingman-route=\"compare\"]");
  });

  it("keeps the media condition a rule lives under", () => {
    const owned = routeOwnedCss(LEGACY, ["glossary"], routeKeyMap());

    expect(owned).toContain("@media (min-width: 800px)");
  });

  it("returns nothing for a page whose rules never moved", () => {
    expect(routeOwnedCss(LEGACY, ["settings"], routeKeyMap())).toBe("");
  });
});

describe("route stylesheet order report", () => {
  const report = routeStylesheetOrderReport({ root: fixtureRoot() });

  it("reads each page against its own scope and leaves the proven pages empty", () => {
    const byRoute = new Map(report.pages.map((page) => [page.route, page]));

    expect(byRoute.get("glossary").summary.conflicts).toBe(3);
    expect(byRoute.get("compare").summary.conflicts).toBe(1);
    expect(byRoute.get("settings").summary.proven).toBe(true);
    expect(report.totals).toMatchObject({ pages: 9, conflicts: 4, likely: 3, subjectDisjoint: 1, provenPages: 7 });
  });

  it("ranks the pairs whose subjects can be one element ahead of the rest", () => {
    expect(report.conflicts.map((conflict) => conflict.rank)).toEqual([0, 0, 0, 2]);
    expect(report.conflicts[0].sharedSubjectClasses).toEqual(["wm-glossary-term"]);
    expect(report.conflicts[3].sharedSubjectClasses).toEqual([]);
  });

  it("answers the verdict in one sentence and each page in another", () => {
    const verdict = describeRouteOrderReport(report);

    expect(verdict).toContain("9 page stylesheets");
    expect(verdict).toContain("7 proven");
    expect(verdict).toContain("4 order-decidable pair(s) re-decided");
    expect(verdict).toContain("3 on a subject that can be one element");

    const pages = describeRouteOrderPages(report);
    expect(pages).toContain("settings: order preserved.");
    expect(pages).toContain("glossary: 3 pair(s) re-decided (3 on a shared subject).");
  });

  it("identifies a pair by its selectors and conditions, not by the value either side declares", () => {
    const [first, second, underWidth] = report.conflicts;

    // The glossary's two unconditional pairs are the same selector pair meeting
    // twice, with different declarations on each side: one reviewed line covers
    // both only if the identity ignores the values, which is what keeps a value
    // edit from unpinning the pair.
    expect(routeOrderPairKey(first)).toBe(routeOrderPairKey(second));
    // The same selectors under a width are a different decision, so a reviewed
    // unconditional pair cannot stand in for this one.
    expect(routeOrderPairKey(underWidth)).not.toBe(routeOrderPairKey(first));
    expect(routeOrderPagePairs(report.pages.find((page) => page.route === "glossary"))).toHaveLength(3);
  });
});

describe("route stylesheet order baseline", () => {
  const report = routeStylesheetOrderReport({ root: fixtureRoot() });

  it("accepts a page decision that pins every pair, and the repeats it takes", () => {
    expect(routeOrderBaselineFailure(report, { pages: reviewedPages(report) })).toEqual([]);
  });

  it("refuses a pair nobody has reviewed", () => {
    const pages = reviewedPages(report).map((page) =>
      page.route === "compare" ? { ...page, pairs: [] } : page,
    );

    const [failure] = routeOrderBaselineFailure(report, { pages });
    expect(failure).toContain("not reviewed");
    expect(failure).toContain("display");
    expect(failure).toContain("compare");
    expect(failure).toContain("so the page's copy wins the tie");
  });

  it("refuses a page whose split nobody has answered for", () => {
    const pages = reviewedPages(report).filter((page) => page.route !== "glossary");

    const failures = routeOrderBaselineFailure(report, { pages });
    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain("glossary");
    expect(failures[0]).toContain("no reviewed decision");
  });

  it("refuses a pinned pair that stopped occurring", () => {
    const pages = reviewedPages(report).map((page) =>
      page.route === "settings"
        ? { ...page, pairs: [{ property: "gap", important: false, specificity: 200, first: ".wm-route-settings .x", second: ".wm-route-settings .y" }] }
        : page,
    );

    const [failure] = routeOrderBaselineFailure(report, { pages });
    expect(failure).toContain("nothing decides it any more");
    expect(failure).toContain(".wm-route-settings .x");
  });

  it("holds a repeated pair to the count it pins", () => {
    const pages = reviewedPages(report).map((page) =>
      page.route === "glossary" ? { ...page, pairs: page.pairs.slice(0, 1) } : page,
    );

    const [failure] = routeOrderBaselineFailure(report, { pages });
    expect(failure).toContain("not reviewed");
    expect(failure).toContain("1 more time(s) than the baseline pins");
  });

  it("refuses an entry that does not say why the page's copy may win", () => {
    const pages = reviewedPages(report).map((page) =>
      page.route === "compare" ? { ...page, reason: "reviewed" } : page,
    );

    const [failure] = routeOrderBaselineFailure(report, { pages });
    expect(failure).toContain("compare");
    expect(failure).toContain("does not say why");
  });

  it("refuses a page the split no longer has", () => {
    const pages = [...reviewedPages(report), { route: "retired", file: "wingman-route-retired.css", reason: LONG_REASON, pairs: [] }];

    const [failure] = routeOrderBaselineFailure(report, { pages });
    expect(failure).toContain("retired");
    expect(failure).toContain("no longer has that page stylesheet");
  });

  it("refuses a page reviewed twice", () => {
    const pages = reviewedPages(report);
    const [failure] = routeOrderBaselineFailure(report, { pages: [...pages, pages[0]] });

    expect(failure).toContain("twice");
  });
});

describe("the shipped baseline", () => {
  it("answers for the split as it stands, with the pairs it pins", () => {
    const report = routeStylesheetOrderReport({ root: ROOT });
    const baseline = JSON.parse(fs.readFileSync(path.join(ROOT, ROUTE_ORDER_BASELINE_FILE), "utf8"));

    expect(routeOrderBaselineFailure(report, baseline)).toEqual([]);
    expect(baseline.pages).toHaveLength(ROUTE_PAGE_STYLESHEETS.length);
    // Every page carries a decision, including the ones the split left alone:
    // a page with no entry would be a split nobody has answered for.
    for (const page of baseline.pages) {
      expect(page.reason.length).toBeGreaterThan(60);
      expect(Array.isArray(page.pairs)).toBe(true);
    }
  });
});
