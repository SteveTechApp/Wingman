import { describe, expect, it } from "vitest";
import {
  ROUTE_REGISTRY_PATHS,
  STALE_LINK_BASELINE_PATH,
  STALE_LINK_BASELINE_POLICY,
  compareStaleLinks,
  entriesAddedByWrite,
  lineAt,
  mergeStaleLinkBaseline,
  readRouteRegistryDirect,
  resolveImport,
  sameStaleLinkEntries,
} from "./route-registry-direct.mjs";

/**
 * The direct registry audit's reading, held against trees written for each shape.
 *
 * `check:route-registry-direct` proves the reading on this checkout, which is the tree
 * that keeps it green while it changes meaning: every lazy import resolves here, the
 * legacy directory is gone, and the links it reports are links in test fixtures. None of
 * that shows a tree with an import that does not resolve, a stale duplicate beside the
 * canonical page, or a link that is skipped only because a catalogue named it — so
 * these specs hand the reading trees of exactly those shapes.
 *
 * The link scan's tree is written out of both route tables deliberately: an address in
 * the manifest, one only the router registers (`dashboard`), one below a parameter
 * (`projects/:projectId`), one below a splat (`product-call-cards/*`), one that merely
 * starts like a served address (`projects-extra`) and one nothing serves
 * (`/wingman/proposals`). Reading the manifest alone would report the middle four, which
 * is the noise that made the scan unreadable.
 *
 * Every fixture is written the way `routes.tsx` writes it (`key: lazy(fromNamedExport(
 * () => import(...), "Export"))`), because the reading is a set of patterns against
 * source, and a spec that spelled them differently would hold a pattern the tree does
 * not use.
 */

const ROUTES = [
  'import { lazy } from "react";',
  "",
  "const pageRegistry = {",
  '  dashboard: lazy(fromNamedExport(() => import("../pages/DashboardPage"), "DashboardPage")),',
  '  compare: lazy(() => import("../pages/ComparePageNew")),',
  '  hub: lazy(() => import("../pages/hub")),',
  '  ghost: lazy(() => import("../pages/GhostPage")),',
  "};",
  "",
  "const wingmanRoutes = [",
  '  { path: "/wingman", element: null },',
  '  { path: "dashboard", element: null },',
  '  { path: "projects/:projectId", element: null },',
  '  { path: "product-call-cards/*", element: null },',
  '  { path: "*", element: null },',
  "];",
].join("\n");

const CATALOG = [
  "export const routes = [",
  '  { key: "projects", path: "/wingman/projects" },',
  '  { key: "compare", path: "/wingman/compare" },',
  "];",
].join("\n");

/**
 * The manifest the link scan is held to, which is deliberately not the router's list:
 * `dashboard`, the two patterns and the splat are registered by the router and named by
 * no manifest entry, and `/wingman/not-declared` and `/wingman/proposals` appear here —
 * in a test file's text — and in neither table.
 */
const MANIFEST = [
  { key: "projects", path: "/wingman/projects", segment: "projects" },
  { key: "compare", path: "/wingman/compare", segment: "compare" },
];

const LINKS = [
  "export const links = [",
  '  "/wingman/projects",',
  '  "/wingman",',
  '  "/wingman/not-declared",',
  '  "/wingman/data.json",',
  '  "/wingman/projects/${id}",',
  '  "/wingman/compare/",',
  '  "/wingman/projects/harbour-retail",',
  '  "/wingman/projects?view=archive",',
  '  "/wingman/projects-extra",',
  '  "/wingman-guru-icon.png",',
  '  "/wingman/product-call-cards/MX-0404",',
  '  "/wingman/dashboard",',
  '  "/wingman/proposals",',
  "];",
].join("\n");

const tree = (overrides = {}) => {
  const files = {
    [ROUTE_REGISTRY_PATHS.routes]: ROUTES,
    [ROUTE_REGISTRY_PATHS.catalog]: CATALOG,
    "src/wingman2/pages/DashboardPage.tsx": "export const DashboardPage = () => null;",
    "src/wingman2/pages/ComparePageNew.tsx": "export default function ComparePageNew() { return null; }",
    "src/wingman2/pages/hub/index.tsx": "export default function Hub() { return null; }",
    [ROUTE_REGISTRY_PATHS.canonicalProductCallCards]: "export function ProductCallCardsPage() { return null; }",
    [ROUTE_REGISTRY_PATHS.comparePage]: "export default function ComparePage() { return null; }",
    "src/wingman2/pages/LinkWall.tsx": LINKS,
    "src/wingman2/components/ProductCallCardsShortcut.tsx": 'export const shortcut = "ProductCallCardsPage";',
    "src/wingman2/components/ComparePageLink.tsx": 'export const open = () => "/wingman/compare";',
    ...overrides,
  };
  return Object.entries(files)
    .filter(([, text]) => text !== null)
    .map(([path, text]) => ({ path, text }));
};

const read = (overrides, routeManifest = MANIFEST) =>
  readRouteRegistryDirect({ sourceFiles: tree(overrides), routeManifest });

describe("readRouteRegistryDirect", () => {
  it("reads the lazy table, resolving each import against the tree", () => {
    const { routeImports } = read();

    expect(routeImports.map((item) => item.key)).toEqual(["dashboard", "compare", "hub", "ghost"]);
    // The row is where its own key is written, so the printed table can be opened at it.
    expect(routeImports.map((item) => item.line)).toEqual([4, 5, 6, 7]);
    expect(routeImports[0]).toMatchObject({
      source: "../pages/DashboardPage",
      resolved: "src/wingman2/pages/DashboardPage.tsx",
    });
    // A directory import resolves to its index file, which is the case a suffix list
    // that stopped at extensions would report UNRESOLVED.
    expect(routeImports[2].resolved).toBe("src/wingman2/pages/hub/index.tsx");
    // Nothing in the tree is a not a resolution: the report has to say so rather than
    // print a path it invented.
    expect(routeImports[3].resolved).toBe("");
  });

  it("reports each imported page against the tree, not against the import", () => {
    const { importStatuses } = read();

    expect(importStatuses.map((item) => [item.key, item.exists])).toEqual([
      ["dashboard", true],
      ["compare", true],
      ["hub", true],
      ["ghost", false],
    ]);
    // The unresolved row keeps the specifier it was written as, so the failure names
    // the import a reader has to fix rather than an empty path.
    expect(importStatuses[3].source).toBe("../pages/GhostPage");
    expect(importStatuses[3].resolved).toBe("");
  });

  it("reads the catalogue's literal /wingman paths", () => {
    const { catalogPaths } = read();

    expect(catalogPaths.map((item) => item.routePath)).toEqual(["/wingman/projects", "/wingman/compare"]);
    expect(catalogPaths.map((item) => item.line)).toEqual([2, 3]);
  });

  it("holds the Product Call Cards ownership verdict", () => {
    const clean = read();
    expect(clean.productCallCards.canonicalExists).toBe(true);
    expect(clean.productCallCards.legacyFiles).toEqual([]);
    expect(clean.productCallCards.ownershipOk).toBe(true);

    // A legacy directory is a verdict even when its files are all `.tsx`, because the
    // walk only ever collected source files: the directory is stale on the strength of
    // what could be routed from it.
    const stale = read({
      "src/wingman2/pages/productCallCards/CardsPage.tsx": "export default function CardsPage() { return null; }",
    });
    expect(stale.productCallCards.legacyFiles).toEqual(["src/wingman2/pages/productCallCards/CardsPage.tsx"]);
    expect(stale.productCallCards.ownershipOk).toBe(false);

    // A file that merely shares the prefix is not in the directory the audit names.
    const neighbour = read({
      "src/wingman2/pages/productCallCardsLegacy.tsx": "export default function Legacy() { return null; }",
    });
    expect(neighbour.productCallCards.legacyFiles).toEqual([]);
    expect(neighbour.productCallCards.ownershipOk).toBe(true);

    // The canonical page missing is its own half of the verdict, separately readable.
    const absent = read({ [ROUTE_REGISTRY_PATHS.canonicalProductCallCards]: null });
    expect(absent.productCallCards.canonicalExists).toBe(false);
    expect(absent.productCallCards.ownershipOk).toBe(false);
  });

  it("reads the manifest's addresses and the router's rows as two tables", () => {
    const { declaredAddresses, routerAddresses } = read();

    // The manifest's own list, in the order it declares them.
    expect(declaredAddresses).toEqual(["/wingman/projects", "/wingman/compare"]);
    // And the router's, rooted and with the parameter and splat kept, because they are
    // what let one row serve the addresses below it. The catch-all is skipped rather
    // than read: honouring `*` would make every address in the tree served.
    expect(routerAddresses).toEqual([
      "/wingman",
      "/wingman/dashboard",
      "/wingman/projects/:projectId",
      "/wingman/product-call-cards/*",
    ]);
  });

  it("reports only the links neither route table serves", () => {
    const { unownedLinks } = read();

    // Three links, with the line each sits on. Skipped beside them: the declared path,
    // the root, the `.json` fetch, the template (whose address is not in the text at
    // all), the declared path written with a trailing slash and with a query, the
    // address below the parameter row, the one below the splat, and the one the router
    // registers and the manifest does not — a report of every `/wingman` string would
    // bury the three that matter.
    expect(unownedLinks).toEqual([
      { file: "src/wingman2/pages/LinkWall.tsx", line: 4, routePath: "/wingman/not-declared", address: "/wingman/not-declared" },
      { file: "src/wingman2/pages/LinkWall.tsx", line: 10, routePath: "/wingman/projects-extra", address: "/wingman/projects-extra" },
      { file: "src/wingman2/pages/LinkWall.tsx", line: 14, routePath: "/wingman/proposals", address: "/wingman/proposals" },
    ]);

    // The address is the literal as it was compared, which is what a reader needs when
    // the two differ: a query is the page's own state, not a different page.
    const withQuery = readRouteRegistryDirect({
      sourceFiles: [{ path: "src/wingman2/pages/QueryWall.tsx", text: '"/wingman/legacy?view=analytics#top"' }],
      routeManifest: MANIFEST,
    });
    expect(withQuery.unownedLinks).toEqual([
      {
        file: "src/wingman2/pages/QueryWall.tsx",
        line: 1,
        routePath: "/wingman/legacy?view=analytics#top",
        address: "/wingman/legacy",
      },
    ]);
  });

  it("holds the links to the registry, not to whichever catalogue names them", () => {
    // The scan used to skip a link because `routeCatalog.ts` declared it. That made a
    // catalogue row the authority on what the app serves, and a page the catalogue kept
    // after its route had been deleted read as served. The inversion is the point: a
    // path only the catalogue names is reported, and a path only the router registers is
    // not.
    const catalogued = read({
      [ROUTE_REGISTRY_PATHS.catalog]: [
        "export const routes = [",
        '  { key: "legacy", path: "/wingman/legacy-page" },',
        "];",
      ].join("\n"),
      "src/wingman2/pages/LinkWall.tsx": [
        '"/wingman/legacy-page"',
        '"/wingman/dashboard"',
      ].join("\n"),
    });

    // The catalogue still names its path — that column is part of the report — and the
    // link is reported anyway, because a catalogue row is not a route. So is the
    // catalogue's own literal: the scan reads every file, and the file that used to
    // excuse a link is one more place the address is written.
    expect(catalogued.catalogPaths.map((item) => item.routePath)).toEqual(["/wingman/legacy-page"]);
    expect(catalogued.unownedLinks).toEqual([
      { file: ROUTE_REGISTRY_PATHS.catalog, line: 2, routePath: "/wingman/legacy-page", address: "/wingman/legacy-page" },
      { file: "src/wingman2/pages/LinkWall.tsx", line: 1, routePath: "/wingman/legacy-page", address: "/wingman/legacy-page" },
    ]);
    // In the other direction, `dashboard` is named by no catalogue row and no manifest
    // entry, and is not reported: the router registers it, which is the table that can
    // say a renamed address still works.
  });

  it("serves the addresses below a row and only below it", () => {
    const wall = (text) => readRouteRegistryDirect({
      sourceFiles: [{ path: ROUTE_REGISTRY_PATHS.routes, text: ROUTES }, { path: "src/wingman2/pages/Wall.tsx", text }],
      routeManifest: MANIFEST,
    });

    // A parameter is one segment: `projects/:projectId` serves `/wingman/projects/harbour-retail`
    // and not a two-segment tail under it, which is a page nothing registers.
    expect(wall('"/wingman/projects/harbour-retail"').unownedLinks).toEqual([]);
    expect(wall('"/wingman/projects/harbour-retail/walls"').unownedLinks.map((item) => item.address))
      .toEqual(["/wingman/projects/harbour-retail/walls"]);
    // A splat serves what is below its base, and the base itself is only served because
    // the manifest declares it.
    expect(wall('"/wingman/product-call-cards/MX-0404"').unownedLinks).toEqual([]);
    expect(wall('"/wingman/product-call-cards/MX-0404/edit"').unownedLinks).toEqual([]);
  });

  it("fails closed when neither table declares anything", () => {
    // The scan cannot invent an address: with no manifest and no router there is nothing
    // to hold a link to except the shell, so every link is reported rather than silently
    // passing. The root stays served — it is where the shell is mounted — which is the
    // one address this reading can vouch for without a table.
    const bare = readRouteRegistryDirect({
      sourceFiles: [{
        path: "src/wingman2/pages/Bare.tsx",
        text: ["/wingman", "/wingman/projects", "/wingman/data.json"].map((link) => `"${link}"`).join("\n"),
      }],
      routeManifest: [],
    });

    expect(bare.declaredAddresses).toEqual([]);
    expect(bare.routerAddresses).toEqual([]);
    expect(bare.unownedLinks.map((item) => item.routePath)).toEqual(["/wingman/projects"]);
  });

  it("names every file whose text mentions the Product Call Cards page", () => {
    const { productCallCardsImporters } = read();

    // The page itself names the export it exports, so it is listed beside its consumer.
    // The router is not: this scan reads text, and this tree's lazy table does not name
    // the page — which is the difference between this reading and the router table the
    // ownership check reads.
    expect(productCallCardsImporters).toEqual([
      ROUTE_REGISTRY_PATHS.canonicalProductCallCards,
      "src/wingman2/components/ProductCallCardsShortcut.tsx",
    ]);
  });

  it("reads the orphan ComparePage state, and nothing about a page that is gone", () => {
    const present = read();
    expect(present.comparePage.exists).toBe(true);
    // The lazy table that imports it, the live page whose export shares the name, and
    // the old file itself; a lowercase `/wingman/compare` link is not a mention of it.
    expect(present.comparePage.importedBy).toEqual([
      ROUTE_REGISTRY_PATHS.routes,
      "src/wingman2/pages/ComparePageNew.tsx",
      ROUTE_REGISTRY_PATHS.comparePage,
    ]);

    // A missing page is not a file with no importers: it has none to have, and the
    // report says the page does not exist rather than that nothing mentions it.
    const absent = read({ [ROUTE_REGISTRY_PATHS.comparePage]: null });
    expect(absent.comparePage.exists).toBe(false);
    expect(absent.comparePage.importedBy).toEqual([]);
  });

  it("flags a missing routes.tsx instead of throwing or reporting an empty tree", () => {
    const reading = read({ [ROUTE_REGISTRY_PATHS.routes]: null });

    // The flag is the reporter's gate. It is a flag rather than an empty reading
    // because the other facts are still facts: a caller handed zeros would report a
    // tree with no canonical page and no ComparePage, neither of which is true.
    expect(reading.missingRoutesFile).toBe(true);
    expect(reading.routesPath).toBe(ROUTE_REGISTRY_PATHS.routes);
    expect(reading.routeImports).toEqual([]);
    expect(reading.importStatuses).toEqual([]);
    expect(reading.productCallCards.ownershipOk).toBe(true);
    expect(reading.comparePage.exists).toBe(true);
    // The flags are only about files that are missing. The manifest is its own input and
    // the catalogue is not derived from the router, so both are still read, and the
    // router's half of the address tables is simply empty.
    expect(reading.catalogPaths).toHaveLength(2);
    expect(reading.declaredAddresses).toEqual(["/wingman/projects", "/wingman/compare"]);
    expect(reading.routerAddresses).toEqual([]);
    // Without the router, the two links only it serves are reported: `dashboard` is
    // registered there and nowhere else, and a link below the splat has nothing left to
    // hold it.
    expect(reading.unownedLinks.map((item) => item.routePath)).toEqual([
      "/wingman/not-declared",
      "/wingman/projects/harbour-retail",
      "/wingman/projects-extra",
      "/wingman/product-call-cards/MX-0404",
      "/wingman/dashboard",
      "/wingman/proposals",
    ]);

    // And a tree that lost the catalogue keeps the lazy table and the scan: the
    // catalogue was a column of the report, not what a link was held to.
    const catalogOnly = readRouteRegistryDirect({
      sourceFiles: [
        { path: ROUTE_REGISTRY_PATHS.routes, text: ROUTES },
        { path: "src/wingman2/pages/LinkWall.tsx", text: LINKS },
        { path: "src/wingman2/pages/DashboardPage.tsx", text: "export const DashboardPage = () => null;" },
      ],
      routeManifest: MANIFEST,
    });
    expect(catalogOnly.missingRoutesFile).toBe(false);
    expect(catalogOnly.routeImports.map((item) => item.key)).toEqual(["dashboard", "compare", "hub", "ghost"]);
    expect(catalogOnly.catalogPaths).toEqual([]);
    expect(catalogOnly.unownedLinks.map((item) => item.routePath)).toEqual([
      "/wingman/not-declared",
      "/wingman/projects-extra",
      "/wingman/proposals",
    ]);
  });
});

describe("resolveImport", () => {
  const exists = (candidate) => candidate === "src/wingman2/pages/Thing.tsx";

  it("folds the segments a relative import walks", () => {
    expect(resolveImport(ROUTE_REGISTRY_PATHS.routes, "../pages/Thing", exists)).toBe(
      "src/wingman2/pages/Thing.tsx",
    );
    expect(resolveImport(ROUTE_REGISTRY_PATHS.routes, "./Thing", exists)).toBe("");
  });

  it("leaves a package specifier alone rather than guessing at a file", () => {
    // `react` is not in the tree and is not this audit's question; a reading that
    // tried suffixes on it would report a page from `node_modules`.
    expect(resolveImport(ROUTE_REGISTRY_PATHS.routes, "react", () => true)).toBe("");
    expect(resolveImport(ROUTE_REGISTRY_PATHS.routes, "../pages/Missing", exists)).toBe("");
  });

  it("refuses a walk that leaves the tree", () => {
    expect(resolveImport("routes.tsx", "../outside/Thing", () => true)).toBe("");
  });
});

describe("lineAt", () => {
  it("counts from one, on either line ending", () => {
    expect(lineAt("a\nb\nc", 2)).toBe(2);
    expect(lineAt("a\r\nb", 3)).toBe(2);
    expect(lineAt("", 0)).toBe(1);
  });
});

/**
 * The gate the stale-link section is held to, against the reading's own links.
 *
 * The links here are `readRouteRegistryDirect`'s, not objects written for the gate: the
 * gate keys on `file` and `address`, which are two of four fields the reading emits, and
 * a spec that wrote them would pass while the reader named a link something the gate
 * could not match.
 */
describe("compareStaleLinks", () => {
  const links = () => read().unownedLinks;
  const pin = (link) => ({ file: link.file, address: link.address, reason: "a decision" });

  it("reports every link no entry covers, in the order they were found", () => {
    const gate = compareStaleLinks({ links: links(), baseline: [] });

    expect(gate.added.map((link) => link.address)).toEqual([
      "/wingman/not-declared",
      "/wingman/projects-extra",
      "/wingman/proposals",
    ]);
    expect(gate.stale).toEqual([]);
    expect(gate.unreasoned).toEqual([]);
  });

  it("accepts a covered link without accepting the ones beside it", () => {
    const [notDeclared] = links();
    const gate = compareStaleLinks({ links: links(), baseline: [pin(notDeclared)] });

    // One entry is one decision: the other two are still work, which is what stops a
    // baseline that pinned one stale link from covering a file's others.
    expect(gate.added.map((link) => link.address)).toEqual([
      "/wingman/projects-extra",
      "/wingman/proposals",
    ]);
  });

  it("keys the decision on the file and the address, not on the line", () => {
    const [notDeclared] = links();

    // Edited above, the link moved to another line and is the same link: an entry that
    // carried a line number would report this as new work after any edit above it.
    const moved = [{ ...notDeclared, line: notDeclared.line + 40 }];
    expect(compareStaleLinks({ links: moved, baseline: [pin(notDeclared)] }).added).toEqual([]);

    // The same address in another file is a different decision, because that is where a
    // reader has to go to change it.
    const elsewhere = [{ ...notDeclared, file: "src/wingman2/pages/Other.tsx" }];
    expect(compareStaleLinks({ links: elsewhere, baseline: [pin(notDeclared)] }).added).toHaveLength(1);
  });

  it("pins a pair for every occurrence of it in its file", () => {
    const [notDeclared] = links();
    const twice = [notDeclared, { ...notDeclared, line: 21 }];

    // The baseline names the pair, so the second occurrence needs the same decision as
    // the first — one entry covers the file's uses of that address.
    expect(compareStaleLinks({ links: twice, baseline: [pin(notDeclared)] }).added).toEqual([]);

    // Unpinned, both lines are named: the baseline cannot cover one of them alone, so a
    // reader who records the decision needs to have seen that the file has two.
    expect(compareStaleLinks({ links: twice, baseline: [] }).added.map((link) => link.line)).toEqual([
      notDeclared.line,
      21,
    ]);
  });

  it("reports an entry whose link is gone, because the list only ratchets down", () => {
    const [notDeclared] = links();
    const gate = compareStaleLinks({
      links: links().slice(1),
      baseline: [pin(notDeclared)],
    });

    // The link was fixed or removed, so its entry is now a note that the file is still
    // suspect. Left in place, the baseline would grow by every link ever fixed.
    expect(gate.stale).toEqual([pin(notDeclared)]);
    expect(gate.added.map((link) => link.address)).toEqual(["/wingman/projects-extra", "/wingman/proposals"]);
  });

  it("reports an entry that does not say what the address is for", () => {
    const [notDeclared] = links();
    const blank = { file: notDeclared.file, address: notDeclared.address, reason: "" };
    const spaces = { ...blank, address: "/wingman/projects-extra", reason: "   " };
    const gate = compareStaleLinks({ links: links(), baseline: [blank, spaces] });

    // An allowance is a decision. Without the sentence, the next reader cannot tell a
    // negative case from a rename nobody finished, so it is not a pass.
    expect(gate.unreasoned).toEqual([blank, spaces]);
    expect(gate.added.map((link) => link.address)).toEqual(["/wingman/proposals"]);
  });

  it("skips a malformed entry rather than letting it excuse a link", () => {
    const [notDeclared] = links();
    const gate = compareStaleLinks({
      links: links(),
      baseline: [
        { file: "", address: notDeclared.address, reason: "a decision" },
        { file: notDeclared.file, address: "", reason: "a decision" },
      ],
    });

    // A baseline that has drifted into rubbish must report the links, not cover them —
    // and must not itself be reported as work that is gone.
    expect(gate.added).toHaveLength(3);
    expect(gate.stale).toEqual([]);
  });
});

describe("mergeStaleLinkBaseline", () => {
  const links = () => read().unownedLinks;

  it("carries each surviving reason by key, and leaves a new entry unreasoned", () => {
    const [notDeclared, projectsExtra, proposals] = links();
    const merged = mergeStaleLinkBaseline({
      baseline: [
        { file: notDeclared.file, address: notDeclared.address, reason: "the negative case" },
        { file: "src/wingman2/pages/Gone.tsx", address: "/wingman/gone", reason: "fixed since" },
      ],
      links: links(),
    });

    // A rewrite that dropped the sentences would make every update a request to write
    // them again, and one that carried them by position would move them to the wrong
    // entry the moment the list changed order.
    expect(merged).toEqual([
      { file: notDeclared.file, address: notDeclared.address, reason: "the negative case" },
      { file: projectsExtra.file, address: projectsExtra.address, reason: "" },
      { file: proposals.file, address: proposals.address, reason: "" },
    ]);
    // The empty reason is not a quiet pass: the gate reports each one, so updating the
    // baseline is a list of work to explain rather than a way to quieten the run.
    expect(compareStaleLinks({ links: links(), baseline: merged }).unreasoned).toEqual([
      merged[1],
      merged[2],
    ]);
  });

  it("drops an entry the tree no longer holds", () => {
    const merged = mergeStaleLinkBaseline({
      baseline: [{ file: "src/wingman2/pages/Gone.tsx", address: "/wingman/gone", reason: "fixed since" }],
      links: [],
    });

    expect(merged).toEqual([]);
  });

  it("keeps the date each entry entered the list, and dates a new one with the write", () => {
    const [notDeclared, projectsExtra] = links();
    const merged = mergeStaleLinkBaseline({
      baseline: [
        { file: notDeclared.file, address: notDeclared.address, reason: "the negative case", addedAt: "2026-06-02" },
      ],
      links: [notDeclared, projectsExtra],
      today: "2026-10-29",
    });

    // The survivor keeps its own date, or every rewrite would make the whole allowance
    // look like this morning's work; the new entry is dated by the write that added it,
    // which is what makes a growing count readable as the entries it grew by.
    expect(merged[0].addedAt).toBe("2026-06-02");
    expect(merged[1].addedAt).toBe("2026-10-29");
  });

  it("leaves an entry that arrived without a date undated rather than calling it new", () => {
    const [notDeclared] = links();
    const merged = mergeStaleLinkBaseline({
      baseline: [{ file: notDeclared.file, address: notDeclared.address, reason: "hand-written" }],
      links: [notDeclared],
      today: "2026-10-29",
    });

    // A hand-edited entry was not added by today's write, and stamping it would put a
    // file in the growth list that nobody added.
    expect(merged[0]).toEqual({ file: notDeclared.file, address: notDeclared.address, reason: "hand-written" });
  });

  it("writes one entry for an address a file uses twice", () => {
    const [notDeclared] = links();
    const merged = mergeStaleLinkBaseline({
      baseline: [],
      links: [notDeclared, { ...notDeclared, line: 21 }],
    });

    // The entry is the decision about that pair; a second copy would be the same
    // sentence twice, and the first would report the second as gone.
    expect(merged).toEqual([
      { file: notDeclared.file, address: notDeclared.address, reason: "" },
    ]);
  });
});

describe("sameStaleLinkEntries", () => {
  const entry = (address, extra = {}) => ({ file: "src/wingman2/app/routeCatalog.test.ts", address, ...extra });

  it("reads a reason or a date changing as the same allowance", () => {
    // What decides the list is which links it holds: a filled-in reason and a date are
    // fields of an entry, not a new decision about a link.
    expect(sameStaleLinkEntries(
      [entry("/wingman/a"), entry("/wingman/b")],
      [entry("/wingman/a", { reason: "written", addedAt: "2026-10-29" }), entry("/wingman/b")],
    )).toBe(true);
  });

  it("reads an added, removed or reordered entry as a change", () => {
    expect(sameStaleLinkEntries([entry("/wingman/a")], [entry("/wingman/a"), entry("/wingman/b")])).toBe(false);
    expect(sameStaleLinkEntries([entry("/wingman/a")], [])).toBe(false);
    // Order is part of it, because the write re-reads the tree in the tree's order and a
    // rewrite that shuffled the list would otherwise look like no change at all.
    expect(sameStaleLinkEntries([entry("/wingman/a"), entry("/wingman/b")], [entry("/wingman/b"), entry("/wingman/a")]))
      .toBe(false);
  });
});

describe("entriesAddedByWrite", () => {
  const dated = (address, addedAt) => ({ file: "src/wingman2/app/routeCatalog.test.ts", address, addedAt });

  it("names the entries the write that set the date added", () => {
    const baseline = [dated("/wingman/old", "2026-06-02"), dated("/wingman/new", "2026-10-29")];

    expect(entriesAddedByWrite({ baseline, updatedAt: "2026-10-29" })).toEqual([baseline[1]]);
  });

  it("names an entry dated after the write, because that growth is not yet stamped", () => {
    const late = dated("/wingman/late", "2026-11-02");

    expect(entriesAddedByWrite({ baseline: [late], updatedAt: "2026-10-29" })).toEqual([late]);
  });

  it("reports nothing it cannot place: no date, no addedAt, or none at all", () => {
    const baseline = [{ file: "src/wingman2/app/routeCatalog.test.ts", address: "/wingman/a" }, dated("/wingman/b", "2026-10-29")];

    expect(entriesAddedByWrite({ baseline, updatedAt: undefined })).toEqual([]);
    expect(entriesAddedByWrite({ baseline, updatedAt: "undated" })).toEqual([]);
    // No date to compare against is not "nothing is newer": it is a question this cannot
    // answer, so the report stays quiet rather than calling every entry old.
    expect(entriesAddedByWrite({ baseline })).toEqual([]);
  });
});

describe("the stale-link baseline's own documentation", () => {
  it("promises the three failures the gate implements", () => {
    // The prose is written into the file the baseline is, before the list, so a reader
    // meets the rule there. Held here because the file is data: nothing in it can notice
    // the code dropping one of the three.
    expect(STALE_LINK_BASELINE_PATH).toBe("tools/wingman-stale-route-links-baseline.json");
    expect(STALE_LINK_BASELINE_POLICY).toContain("no entry covers");
    expect(STALE_LINK_BASELINE_POLICY).toContain("whose link is gone");
    expect(STALE_LINK_BASELINE_POLICY).toContain("what the address is for");
    expect(STALE_LINK_BASELINE_POLICY).toContain("never a line number");
    // The policy also tells the reader how to read a rise, because the count and the
    // dates are what the report prints and nothing else explains what they mean.
    expect(STALE_LINK_BASELINE_POLICY).toContain("the entries it grew by");
  });
});
