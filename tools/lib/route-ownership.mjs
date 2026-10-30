/**
 * Which addresses the router serves, read out of the router's own source.
 *
 * `route-smoke-check.mjs` holds the route manifest to itself: every entry has a key,
 * a path and a page file, every page file exists, and every entry has a feature audit
 * row. None of that says an address is served. An entry whose segment has left the
 * router — a page retired, a key added to the consolidated redirects, the catalogue
 * spread replaced by a hand-written list — keeps its page file and its audit row, so
 * the audit stayed green while the address fell through to the catch-all in
 * `WingmanApp.tsx` and rendered Home. That is the blindness the browser walk had, and
 * the same answer: the router's own route table is what owns an address.
 *
 * The reading is here rather than in the script because it is the part that can be
 * wrong in ways a real tree cannot show: a spread it stops crediting, a skip-list it
 * stops honouring, a splat that makes every address look served. Held by
 * `route-ownership.test.mjs` against router sources written for each shape, it
 * survives a refactor of the script — and of the router's spelling — instead of being
 * re-proved only by a checkout that happens to be green.
 *
 * Two shapes are read, because the router writes its table two ways. A route written
 * as a `path:` literal serves `/wingman/<literal>`, an index entry serves `/wingman`
 * itself, and a splat serves its own base as well as everything under it. Every other
 * page comes from `...routeCatalog` filtered by key, so a manifest route is served
 * that way when its key is not one of those the filter skips — the `route.key !==`
 * literals and the `consolidatedRedirectKeys` set, both read from the router rather
 * than restated, because a key added to either list is what takes its address out of
 * the table.
 */

/** An address nothing declares, held to reading as unserved. */
export const UNOWNED_ADDRESS = "/wingman/route-smoke-nothing-owns";

/** One address as the router names it: no trailing slash, `/` for the root itself. */
export function normaliseAddress(address) {
  return address.replace(/\/+$/, "") || "/";
}

/**
 * The addresses the router serves, and what the reading found while deciding.
 *
 * `problems` are the reading's own doubts rather than a route's: a spread whose skip
 * list could not be read, an address nothing declares that came back served, a table
 * with no addresses in it at all, and a splat inside the shell. Each says the table
 * cannot be read, which is a different failure from "this route is missing" — the
 * script reports them apart for that reason.
 *
 * `catchAll` is the destination the shell's `path: "*"` sends an unknown address to,
 * or `null` when the shell has no catch-all; the failure for a missing route names it,
 * because a catch-all is the reason a missing page reads as a page rather than as a
 * 404.
 */
export function readRouteOwnership({ routerSource = "", appEntrySource = "", routeManifest = [] } = {}) {
  const servedAddresses = new Set();
  const shellSplats = [];
  const addAddress = (address) => servedAddresses.add(normaliseAddress(address));

  if (/\{\s*index:\s*true\b/.test(routerSource)) addAddress("/wingman");
  for (const match of routerSource.matchAll(/\bpath:\s*"([^"]*)"/g)) {
    const literal = match[1].trim();
    // A bare `*` inside the shell is read apart from the addresses rather than as
    // one: it matches every address under `/wingman`, which is the thing this audit
    // is here to tell a manifest route apart from.
    if (literal === "*") {
      shellSplats.push(literal);
      continue;
    }
    const withoutSplat = literal.replace(/\/\*$/, "").replace(/^\/+|\/+$/g, "");
    if (!withoutSplat) continue;
    addAddress(literal.startsWith("/") ? `/${withoutSplat}` : `/wingman/${withoutSplat}`);
  }

  // The catalogue spread, and the two lists that decide which keys it skips. A key in
  // either list is served by its own entry (a redirect or a written-out shape) or not
  // at all, so the spread cannot be credited with it.
  const catalogueSpread = /\.\.\.routeCatalog\b/.test(routerSource);
  const consolidatedBlock = /const consolidatedRedirectKeys = new Set<[^>]*>\(\[([\s\S]*?)\]\)/
    .exec(routerSource);
  const consolidatedKeys = consolidatedBlock
    ? new Set([...consolidatedBlock[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]))
    : null;
  const filteredKeys = new Set(
    [...routerSource.matchAll(/route\.key !== "([^"]+)"/g)].map((match) => match[1]),
  );

  const problems = [];

  if (catalogueSpread && consolidatedKeys === null) {
    problems.push(
      "The router spreads `routeCatalog` but this audit cannot read the keys it skips: "
        + "`consolidatedRedirectKeys` is not written as a set literal in src/wingman2/app/routes.tsx. "
        + "Without that list every catalogue page would be read as served whether it is or not.",
    );
  }
  if (catalogueSpread && consolidatedKeys) {
    for (const route of routeManifest) {
      if (!route.key || !route.segment) continue;
      if (filteredKeys.has(route.key) || consolidatedKeys.has(route.key)) continue;
      addAddress(`/wingman/${route.segment.replace(/^\/+/, "")}`);
    }
  }

  // What the catch-all does with an address nothing owns: it is the reason a missing
  // route reads as a page rather than as a 404.
  const catchAllDestination = /\{\s*path:\s*"\*"[\s\S]*?<Navigate\s+to="([^"]+)"/.exec(appEntrySource);
  const catchAll = catchAllDestination ? catchAllDestination[1] : null;

  // The half that makes this a check rather than a table: an address nothing declares
  // has to read as unserved. If the table reports it as served, the reading cannot tell
  // a manifest route from the catch-all, and every route would pass for the same reason
  // a deleted one does.
  if (servedAddresses.has(normaliseAddress(UNOWNED_ADDRESS))) {
    problems.push(
      `This audit read ${UNOWNED_ADDRESS} — an address no page declares — as served, so it cannot tell a `
        + "manifest route from the catch-all and would report a page the app does not serve. Read the router's "
        + "route table apart from any splat that matches every address under /wingman.",
    );
  }
  if (!servedAddresses.size) {
    problems.push(
      "No addresses were read from src/wingman2/app/routes.tsx, so every manifest route would fail for the "
        + "wrong reason: check the router still writes its table as `path:` literals and still spreads the catalogue.",
    );
  }
  for (const splat of shellSplats) {
    problems.push(
      `src/wingman2/app/routes.tsx registers a "${splat}" route inside the shell, so an address nothing owns and a `
        + "manifest route render the same page: with the splat in the table every address under /wingman matches it, "
        + "and this audit cannot say which pages the app owns. Register the page's own address instead.",
    );
  }

  return { servedAddresses, shellSplats, catalogueSpread, consolidatedKeys, filteredKeys, catchAll, problems };
}
