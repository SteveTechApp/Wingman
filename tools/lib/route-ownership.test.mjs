import { describe, expect, it } from "vitest";
import { UNOWNED_ADDRESS, normaliseAddress, readRouteOwnership } from "./route-ownership.mjs";

/**
 * The route-ownership reading, held against router sources written for each shape.
 *
 * `check:routes` proves the reading on the tree it is run against, which is the
 * reading a refactor is most likely to keep green while changing what it means: the
 * router's spellings are few, and a table read wrongly still reports *some* addresses.
 * These specs are the other half — the spread credited for a route the router really
 * filters in, a route left out when either skip-list names its key, a skip-list that
 * cannot be parsed reported instead of crediting everything, and the address nothing
 * declares still read as unserved. Each is a router source instead of the real one,
 * because the real one cannot show a shape it does not have.
 */

/**
 * A router table the way `routes.tsx` writes it: an index entry, written-out
 * literals, a splat, and the catalogue spread under a filter that names a few keys.
 */
const ROUTER = `
import { routeCatalog } from "./routeCatalog";

const consolidatedRedirectKeys = new Set<WingmanRouteKey>([
  "documents", "support",
]);

export const wingmanRoutes: RouteObject[] = [
  {
    path: "/wingman",
    element: <AppShell />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "projects/:projectId", element: <ProjectRecord /> },
      { path: "product-call-cards/*", element: <CallCards /> },
      ...routeCatalog
        .filter((route) => route.key !== "dashboard" && route.key !== "callCards" && !consolidatedRedirectKeys.has(route.key))
        .map((route) => ({ path: route.segment, element: null })),
    ],
  },
];
`;

/** The shell's catch-all, which is what an unserved address renders. */
const APP_ENTRY = `
export default function WingmanApp() {
  const routes = useRoutes([
    ...wingmanRoutes,
    { path: "*", element: <Navigate to="/wingman/dashboard" replace /> },
  ]);
  return routes;
}
`;

const MANIFEST = [
  { key: "projects", segment: "projects", path: "/wingman/projects", pageFile: "ProjectsPage.tsx" },
  { key: "documents", segment: "documents", path: "/wingman/documents", pageFile: "DocumentsPage.tsx" },
  { key: "support", segment: "support", path: "/wingman/support", pageFile: "SupportPage.tsx" },
  { key: "callCards", segment: "call-cards", path: "/wingman/call-cards", pageFile: "CallCardsPage.tsx" },
];

const read = (overrides = {}) => readRouteOwnership({
  routerSource: ROUTER,
  appEntrySource: APP_ENTRY,
  routeManifest: MANIFEST,
  ...overrides,
});

describe("readRouteOwnership", () => {
  it("credits a catalogue route the spread serves, and says it read the spread", () => {
    const { servedAddresses, catalogueSpread, problems } = read();

    expect(catalogueSpread).toBe(true);
    // The manifest entry's own segment, credited through the spread rather than
    // through a `path:` literal — the shape a route takes when nobody wrote it out.
    expect(servedAddresses.has("/wingman/projects")).toBe(true);
    expect(problems).toEqual([]);
  });

  it("reads an index entry, a written-out literal and a splat's own base", () => {
    const { servedAddresses, shellSplats } = read();

    // `/wingman` itself, a parameterised segment, and a splat credited at its base
    // rather than as everything under it.
    expect(servedAddresses.has("/wingman")).toBe(true);
    expect(servedAddresses.has("/wingman/projects/:projectId")).toBe(true);
    expect(servedAddresses.has("/wingman/product-call-cards")).toBe(true);
    expect(servedAddresses.has("/wingman/product-call-cards/anything")).toBe(false);
    // The shell's own `*` is not a route: it is what makes every address look served.
    expect(shellSplats).toEqual([]);
  });


  it("leaves a route out when either skip-list names its key", () => {
    const { servedAddresses, consolidatedKeys, filteredKeys } = read();

    // Both lists are read from the router rather than restated: one is the set
    // literal, the other the `route.key !==` filters on the spread.
    expect([...consolidatedKeys].sort()).toEqual(["documents", "support"]);
    expect([...filteredKeys].sort()).toEqual(["callCards", "dashboard"]);
    expect(servedAddresses.has("/wingman/documents")).toBe(false);
    expect(servedAddresses.has("/wingman/support")).toBe(false);
    expect(servedAddresses.has("/wingman/call-cards")).toBe(false);
  });

  it("refuses to credit the catalogue when the skip-list cannot be read", () => {
    // The failure this guards: the set literal rewritten as `new Set(keys)` would
    // otherwise credit every catalogue route, including the ones the spread filters
    // out — the audit would pass while the app served a redirect or nothing at all.
    const { servedAddresses, consolidatedKeys, problems } = read({
      routerSource: ROUTER.replace(
        'const consolidatedRedirectKeys = new Set<WingmanRouteKey>([\n  "documents", "support",\n]);',
        "const consolidatedRedirectKeys = new Set(consolidatedRedirectRoutes);",
      ),
    });

    expect(consolidatedKeys).toBeNull();
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/cannot read the keys it skips/);
    expect(problems[0]).toContain("consolidatedRedirectKeys");
    // Nothing from the catalogue is credited, because there is no way to tell which
    // of its keys the spread serves.
    expect(servedAddresses.has("/wingman/projects")).toBe(false);
    expect(servedAddresses.has("/wingman/documents")).toBe(false);
  });

  it("holds an address nothing declares as unserved", () => {
    const { servedAddresses, problems } = read();

    // The reading is only a check if this is absent: a table that answered from a
    // splat would report the sentinel, and every manifest route above would pass for
    // the reason a deleted one does.
    expect(servedAddresses.has(normaliseAddress(UNOWNED_ADDRESS))).toBe(false);
    expect(problems).toEqual([]);
  });

  it("fails a shell that registers a bare splat, which is what the sentinel would look served from", () => {
    const { servedAddresses, shellSplats, problems } = read({
      routerSource: `${ROUTER}\nexport const splash = [{ path: "*", element: <Home /> }];`,
    });

    expect(shellSplats).toEqual(["*"]);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/registers a "\*" route inside the shell/);
    // The splat is kept apart from the addresses rather than read as one.
    expect([...servedAddresses].some((address) => address.includes("*"))).toBe(false);
  });

  it("reads the catch-all destination, so a missing route can name where it lands", () => {
    expect(read().catchAll).toBe("/wingman/dashboard");
    expect(read({ appEntrySource: "export const routes = [];" }).catchAll).toBeNull();
  });

  it("normalises an address to its served spelling", () => {
    expect(normaliseAddress("/wingman/projects/")).toBe("/wingman/projects");
    expect(normaliseAddress("/wingman//")).toBe("/wingman");
    expect(normaliseAddress("/")).toBe("/");
  });
});
