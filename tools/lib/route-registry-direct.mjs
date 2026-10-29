/**
 * What the route registry says about itself, read from the sources it was given.
 *
 * `audit-wingman-route-registry-direct.mjs` answers a question the other route checks
 * do not: not whether the manifest agrees with the router, but what the router's own
 * source actually imports, which catalogue paths it declares, whether the Product Call
 * Cards page has one implementation or a stale directory beside it, and which
 * `/wingman` links in the tree name an address the router does not serve. It reads a
 * tree rather than a contract, so its answers are only as good as its reading —
 * and the reading is the part that can be wrong in ways a real checkout cannot show: a
 * lazy import written across two lines, a `lazy(() => import(...))` that stops
 * resolving, a legacy directory whose files are all `.tsx`, a link held to the wrong
 * table and so skipped when it should be reported or reported when it is served.
 *
 * So the reading lives here and takes its tree as data: `sourceFiles` is every source
 * file the audit looks at, as `{ path, text }` with repo-relative forward-slashed
 * paths, and `routeManifest` is `route-manifest.json` already parsed, because the
 * addresses a link may name are the registry's and not this scan's to spell. Nothing in
 * this module touches the filesystem or the console, which is what
 * lets `route-registry-direct.test.mjs` hold it against trees written for each shape —
 * a tree this checkout does not have and a refactor cannot quietly change. The script
 * is left with the adapters (walking `src`, reading each file) and the printing, the
 * way `route-smoke-check.mjs` is left with the manifest's half.
 *
 * The checks the script turns into an exit code are data here rather than a decision:
 * `missingRoutesFile` is the one fatal read, and `productCallCards.ownershipOk` is the
 * one verdict, because both are facts about the tree that a printer should not have to
 * restate.
 */

/** The paths the reading is about, repo-relative and forward-slashed. */
export const ROUTE_REGISTRY_PATHS = {
  routes: "src/wingman2/app/routes.tsx",
  catalog: "src/wingman2/app/routeCatalog.ts",
  canonicalProductCallCards: "src/wingman2/pages/ProductCallCardsPage.tsx",
  legacyProductCallCards: "src/wingman2/pages/productCallCards",
  comparePage: "src/wingman2/pages/ComparePage.tsx",
  routeManifest: "src/wingman2/app/route-manifest.json",
};

/** The address the app serves its routes under; every literal the scan reads starts here. */
const ROUTE_ROOT = "/wingman";

/** The extensions a relative import may be written without, in the order tried. */
const IMPORT_SUFFIXES = [".tsx", ".ts", ".jsx", ".js", "/index.tsx", "/index.ts"];

/** 1-based line of an index into `text`, so a finding can be opened at it. */
export function lineAt(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

/**
 * The repo-relative path a relative import resolves to, or `""` when nothing does.
 *
 * Bare specifiers are not this audit's question — they are packages, not files in the
 * tree — so they resolve to nothing rather than being guessed at. `exists` is the
 * tree, which is why this is testable: a suffix that is no longer tried leaves an
 * import unresolved, and the report says MISSING for a file that is right there.
 */
export function resolveImport(fromPath, importPath, exists) {
  if (!importPath.startsWith(".")) return "";

  const fromDir = fromPath.split("/").slice(0, -1).join("/");
  const base = resolveSegments(fromDir, importPath);
  if (base === null) return "";

  for (const candidate of [base, ...IMPORT_SUFFIXES.map((suffix) => `${base}${suffix}`)]) {
    if (exists(candidate)) return candidate;
  }
  return "";
}

/**
 * The address a `/wingman` literal names, as the router would see it.
 *
 * A link's query and fragment are the page's own state rather than a different page —
 * the router matches the pathname — and a trailing slash is the same address written
 * twice, so both are folded away before anything is compared. `""` is returned for a
 * literal that folds to nothing, which is not an address this can check.
 */
export function linkAddress(literal) {
  const withoutState = String(literal ?? "").split(/[?#]/)[0];
  const trimmed = withoutState.replace(/\/+$/, "");
  return trimmed === ROUTE_ROOT || trimmed.startsWith(`${ROUTE_ROOT}/`) ? trimmed : "";
}

/**
 * Whether an address names a file rather than a route.
 *
 * The scan reads every `/wingman` string, and an asset fetched under the same prefix
 * (`/wingman/data.json`, `/wingman-guru-icon.png`) is not an address the registry could
 * declare. Without this the report would list those beside the links that are the
 * question — which is the failure the whole check exists to avoid.
 */
function isAssetPath(address) {
  return /\.[a-z0-9]{2,5}$/i.test(address);
}

/**
 * The addresses a table declares, folded to the shape the matcher reads.
 *
 * A row is written as the router writes it — `dashboard` under the shell, `/wingman` for
 * the shell itself, `projects/:projectId` for a page with a parameter — and this turns
 * each into the address it serves: rooted, no trailing slash, and keeping the parameter
 * and splat segments because they are what let one row serve many addresses. Entries
 * that are not addresses at all are dropped rather than guessed at: a bare `*` is the
 * catch-all, and an empty or `/`-only literal names nothing.
 */
function normalisePatterns(rawAddresses = []) {
  const patterns = [];
  for (const raw of rawAddresses) {
    if (typeof raw !== "string") continue;
    const literal = raw.trim().replace(/^\/+|\/+$/g, "");
    if (!literal || literal === "*") continue;
    const address = raw.trim().startsWith("/") ? `/${literal}` : `${ROUTE_ROOT}/${literal}`;
    if (!patterns.includes(address)) patterns.push(address);
  }
  return patterns;
}

/**
 * Whether a route table serves an address.
 *
 * The address is served when it is the shell itself, or when some row matches it segment
 * by segment: a parameter matches one segment (`projects/:projectId` serves
 * `/wingman/projects/harbour-retail`), a splat matches everything below its own base
 * (`product-call-cards/*` serves `/wingman/product-call-cards/MX-0404`), and every other
 * segment has to be the address's own. Matching is per segment rather than by string
 * prefix, because `/wingman/projects-extra` is not a child of `/wingman/projects` even
 * though it starts with it — the old scan's prefix test would have credited a page
 * nothing serves.
 */
function servesAddress(address, patterns) {
  if (address === ROUTE_ROOT) return true;
  const target = address.split("/").filter(Boolean);
  return patterns.some((pattern) => {
    const segments = pattern.split("/").filter(Boolean);
    for (let index = 0; index < segments.length; index += 1) {
      const segment = segments[index];
      if (segment === "*") return true;
      if (index >= target.length) return false;
      if (segment.startsWith(":")) continue;
      if (segment !== target[index]) return false;
    }
    return target.length === segments.length;
  });
}

/**
 * `fromDir` + `importPath` with `.` and `..` folded, or null for a walk that leaves the
 * tree. Paths stay forward-slashed and repo-relative, so a resolved import can be
 * printed beside the path the tree holds.
 */
function resolveSegments(fromDir, importPath) {
  const segments = fromDir ? fromDir.split("/") : [];
  for (const part of importPath.split("/")) {
    if (part === "." || part === "") continue;
    if (part === "..") {
      if (!segments.length) return null;
      segments.pop();
      continue;
    }
    segments.push(part);
  }
  return segments.join("/");
}

/**
 * The registry's own facts about the tree it was handed.
 *
 * `routeImports` is routes.tsx's lazy table: the route key, the specifier as written,
 * where it sits, and the file it resolves to (or `""`). `catalogPaths` is every
 * `/wingman` path the catalogue declares. `importStatuses` is the resolved import
 * checked against the tree again — the part a rep would call a broken page, and the
 * part `routes.tsx` would fail to load at runtime.
 *
 * `productCallCards` is the ownership verdict: one canonical page and no legacy
 * directory with sources in it. `productCallCardsImporters` is every file whose text
 * names that page, which is how the audit shows what is still pointed at it.
 *
 * `declaredAddresses` is what the link scan is held to: the manifest's own paths, read
 * rather than written out here, so an address that is renamed in the registry stops
 * being served by this scan on the same commit and one that a catalogue happens to
 * mention gains nothing. `routerAddresses` is the router's half of the same question —
 * the rows it registers that the manifest does not carry — and `unownedLinks` is the
 * `/wingman` literals in the tree that neither table serves, a renamed address nothing
 * redirects, one the app never had, or a link written against the wrong page, with the
 * address the literal was compared as, since a query or a trailing slash is not what
 * makes it stale. `comparePage` is the orphan check: whether the old page file is still
 * there and what mentions it.
 */
export function readRouteRegistryDirect({
  sourceFiles = [],
  routeManifest = [],
  paths = ROUTE_REGISTRY_PATHS,
} = {}) {
  const byPath = new Map(sourceFiles.map((file) => [file.path, file.text ?? ""]));
  const exists = (relativePath) => Boolean(relativePath) && byPath.has(relativePath);
  const routesText = byPath.get(paths.routes) ?? "";
  const catalogText = byPath.get(paths.catalog) ?? "";

  // The one fatal read, flagged rather than thrown: without the router's table there is
  // no lazy table to audit, and a report that printed nothing but "Audit complete"
  // would read as a clean tree. The rest of the reading is still taken from the tree —
  // the canonical page, a legacy directory, the old ComparePage and the catalogue's
  // paths are all facts of this checkout and none of them is derived from routes.tsx —
  // because a caller that wants to print what it found should not be handed invented
  // zeros. The reporter stops on the flag before it prints any of it.
  const missingRoutesFile = !routesText;

  // The lazy table, as routes.tsx writes it: a key, `lazy(`, and the specifier inside
  // the `import(...)` that follows. The two wildcards are what let a `lazy` split over
  // several lines still resolve to its key rather than being skipped silently.
  const routeImports = [];
  for (const match of routesText.matchAll(/([A-Za-z0-9_]+)\s*:\s*lazy\s*\([\s\S]*?import\s*\(\s*["']([^"']+)["']\s*\)[\s\S]*?\)/g)) {
    const key = match[1];
    const source = match[2];
    routeImports.push({
      key,
      source,
      line: lineAt(routesText, match.index ?? 0),
      resolved: resolveImport(paths.routes, source, exists),
    });
  }

  // The catalogue's own addresses. Only literals are read: a path built from a
  // constant is not something this scan can follow, and pretending otherwise would
  // credit an address the catalogue may not declare.
  const catalogPaths = [];
  for (const match of catalogText.matchAll(/([A-Za-z0-9_]+)\s*:\s*["'](\/wingman[^"']*)["']/g)) {
    catalogPaths.push({
      key: match[1],
      routePath: match[2],
      line: lineAt(catalogText, match.index ?? 0),
    });
  }

  const importStatuses = routeImports.map((item) => ({
    key: item.key,
    resolved: item.resolved,
    source: item.source,
    exists: exists(item.resolved),
  }));

  const canonicalExists = exists(paths.canonicalProductCallCards);
  const legacyPrefix = `${paths.legacyProductCallCards.replace(/\/+$/, "")}/`;
  const legacyFiles = [...byPath.keys()].filter((filePath) => filePath.startsWith(legacyPrefix)).sort();

  const allFiles = sourceFiles.map((file) => file.path);
  const productCallCardsImporters = allFiles.filter((filePath) =>
    (byPath.get(filePath) ?? "").includes("ProductCallCardsPage"),
  );

  // The addresses a link may name. Two tables, because neither is the whole answer and
  // the scan used to read a third: the manifest is the registry's own list, and the
  // router's `path:` literals are the rows it serves that the manifest does not carry —
  // the parameterised pages (`projects/:projectId`), the splat
  // (`product-call-cards/*`) and the legacy addresses the router redirects on purpose
  // (`dashboard`, `profile`, `finder`). Holding a link to the manifest alone reported
  // every one of those as stale, which is the noise this scan exists to cut: a renamed
  // address the router still honours is a link that works, and one neither table has is
  // the link a reader has to change.
  //
  // The shell's `*` is skipped rather than read: it matches every address under
  // `/wingman`, so honouring it would make the whole tree served.
  const declaredAddresses = normalisePatterns(
    (Array.isArray(routeManifest) ? routeManifest : []).map((route) => route?.path),
  );
  const routerAddresses = normalisePatterns(
    [...routesText.matchAll(/\bpath:\s*"([^"]*)"/g)].map((match) => match[1]),
  );

  // A stale link is a `/wingman` literal neither table serves. Template literals are
  // skipped because the address is not in the text, and a literal naming a file
  // (`.json`, `.png`) because an asset fetch is not a route.
  const unownedLinks = [];
  for (const filePath of allFiles) {
    const text = byPath.get(filePath) ?? "";
    for (const match of text.matchAll(/["'](\/wingman[^"']*)["']/g)) {
      const routePath = match[1];
      if (routePath.includes("${")) continue;
      const address = linkAddress(routePath);
      if (!address || isAssetPath(address)) continue;
      if (servesAddress(address, [...declaredAddresses, ...routerAddresses])) continue;
      unownedLinks.push({ file: filePath, line: lineAt(text, match.index ?? 0), routePath, address });
    }
  }

  const compareExists = exists(paths.comparePage);
  // The orphan check's predicate: anything naming the old page. The three spellings of
  // the old scan collapse into this one, which matches exactly the same files.
  const comparePageImporters = compareExists
    ? allFiles.filter((filePath) => (byPath.get(filePath) ?? "").includes("ComparePage"))
    : [];

  return {
    missingRoutesFile,
    routesPath: paths.routes,
    catalogPath: paths.catalog,
    routeManifestPath: paths.routeManifest,
    declaredAddresses,
    routerAddresses,
    routeImports,
    catalogPaths,
    importStatuses,
    productCallCards: {
      canonicalPath: paths.canonicalProductCallCards,
      canonicalExists,
      legacyPath: paths.legacyProductCallCards,
      legacyFiles,
      // The verdict the script's exit code is built from, stated once: a canonical page
      // has to be there and no legacy file may be.
      ownershipOk: canonicalExists && legacyFiles.length === 0,
    },
    productCallCardsImporters,
    unownedLinks,
    comparePage: {
      path: paths.comparePage,
      exists: compareExists,
      importedBy: comparePageImporters,
    },
  };
}

/**
 * The file that records the stale links this tree has looked at and kept.
 *
 * The link scan reports every `/wingman` literal neither table serves, and two of those
 * are not stale links at all: a spec's negative case is an address that must not resolve,
 * and a stored fixture's address is a value no surface follows. Report-only, that
 * distinction stayed in a reader's head — the run passed with four lines on screen, so a
 * fifth one added by a rename looked the same as the four. Turning the section into an
 * exit code needs somewhere to put the decisions, and an allowlist that grows by hand is
 * the standard answer: every entry says which file, which address, and what the address
 * is for.
 *
 * A blameless allowlist rots, so the gate ratchets down. An entry is a file and the
 * address it was compared as — never a line, because editing a file above a pinned link
 * moves it and a line number would report the same decision as new work. A pinned pair
 * covers every occurrence of it in that file: the list is about the decision, and the
 * second occurrence needs the same decision as the first. An entry that no longer appears
 * is a failure too, because an allowance kept after the link was fixed is a note that its
 * file is still suspect when it is not.
 */
export const STALE_LINK_BASELINE_PATH = "tools/wingman-stale-route-links-baseline.json";

/**
 * What the baseline file says it is, written into it so a reader meets the rule before
 * the list. The three failures it promises are the three the gate implements, which is
 * why the prose lives beside them rather than in the file where nothing would notice it
 * drifting from the code.
 */
export const STALE_LINK_BASELINE_POLICY = [
  "A /wingman link the route tables do not serve, reviewed and kept.",
  "Each entry names the file and the address as it was compared, with the reason that address is the right one there — a spec's negative case, or a stored value no surface follows.",
  "It also carries the date it entered the list, and `updatedAt` is the date the list last changed, so a count that grew can be read as the entries it grew by.",
  "It is not a way to silence a renamed link: the run fails on a link no entry covers, on an entry whose link is gone (the list only ratchets down), and on an entry that does not say what the address is for.",
  "The entry is the pair of file and address, never a line number, so editing a file above a recorded link does not unpin it.",
].join(" ");

/** A link's identity: the file it is written in and the address it names. */
export function staleLinkKey(link) {
  const file = String(link?.file ?? "").trim();
  const address = String(link?.address ?? "").trim();
  return file && address ? `${file} ${address}` : "";
}

/**
 * The gate's reading: which found links no entry covers, which entries cover nothing,
 * and which entries were recorded without saying what the address is for.
 *
 * `added` keeps one entry per occurrence rather than per address, so a file that names
 * the same unserved address twice names both lines to change — the baseline can only
 * pin the pair, and pinning it is a decision about both. `stale` and `unreasoned` are
 * read off the baseline instead, in the order the file lists them, because a person
 * wrote them and reading them back in that order is what makes the report editable.
 * A malformed entry (no file or no address) is skipped rather than matching everything:
 * a baseline that has drifted into rubbish should report the links, not excuse them.
 */
export function compareStaleLinks({ links = [], baseline = [] } = {}) {
  const pinned = new Map();
  for (const entry of Array.isArray(baseline) ? baseline : []) {
    const key = staleLinkKey(entry);
    if (!key) continue;
    pinned.set(key, entry);
  }

  const found = new Set();
  const added = [];
  for (const link of Array.isArray(links) ? links : []) {
    const key = staleLinkKey(link);
    if (!key) continue;
    found.add(key);
    if (!pinned.has(key)) added.push(link);
  }

  const stale = [];
  const unreasoned = [];
  for (const [key, entry] of pinned) {
    if (!found.has(key)) stale.push(entry);
    else if (!String(entry?.reason ?? "").trim()) unreasoned.push(entry);
  }

  return { added, stale, unreasoned };
}

/**
 * The baseline a run would write: the links it found, keeping the reason each surviving
 * entry already carried and leaving a new entry's reason empty for a person to fill in.
 *
 * Carrying reasons by key rather than by position is what lets the file be rewritten
 * after a rename without losing the sentences that say why the other entries are there;
 * a new entry has no reason yet, and `compareStaleLinks` reports that rather than
 * accepting it, so updating the baseline is a list of work to explain and not a way to
 * make the gate quiet.
 */
export function mergeStaleLinkBaseline({ baseline = [], links = [], today } = {}) {
  const reasons = new Map();
  const addedAt = new Map();
  const known = new Set();
  for (const entry of Array.isArray(baseline) ? baseline : []) {
    const key = staleLinkKey(entry);
    if (!key) continue;
    known.add(key);
    reasons.set(key, String(entry?.reason ?? ""));
    if (typeof entry?.addedAt === "string" && entry.addedAt.trim()) addedAt.set(key, entry.addedAt);
  }

  const merged = [];
  const seen = new Set();
  for (const link of Array.isArray(links) ? links : []) {
    const key = staleLinkKey(link);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const entry = { file: link.file, address: link.address, reason: reasons.get(key) ?? "" };
    // A surviving entry keeps the date it entered the list. A new one is dated by the
    // write that adds it, and an entry that arrived without a date stays undated rather
    // than being stamped with today: being in the file already is what separates it from
    // a new one, and a date nobody can know would put a hand-written entry in the growth
    // list as this week's work.
    const entered = known.has(key) ? addedAt.get(key) : today;
    if (typeof entered === "string" && entered.trim()) entry.addedAt = entered;
    merged.push(entry);
  }

  return merged;
}

/**
 * Whether two entry lists are the same allowance: the same links, in the same order.
 *
 * The audit asks this before writing, because `updatedAt` means "the date the list last
 * changed" and a write that adds nothing must not re-date the whole list. It compares the
 * pair of file and address rather than the entries, so re-reading a file that was hand-
 * edited does not read as a change when only a reason or a missing date differs.
 */
export function sameStaleLinkEntries(before = [], after = []) {
  const left = (Array.isArray(before) ? before : []).map(staleLinkKey).filter(Boolean);
  const right = (Array.isArray(after) ? after : []).map(staleLinkKey).filter(Boolean);
  return left.length === right.length && left.every((key, index) => key === right[index]);
}

/**
 * The entries a growing allowance consists of: the ones dated by the write `updatedAt`
 * names, or later than it.
 *
 * This is how a count becomes a change. A run that prints only how many entries the
 * baseline holds says how much the list permits; the entries this returns are the ones
 * that made it that size, so a reader meets the addressed file rather than doing the
 * subtraction themselves.
 *
 * A date is a day, so two writes on one day cannot be told apart — every entry either
 * write added reads as this write's. An undated entry is not reported here at all: it
 * cannot be placed against a date, and calling it new would be a guess. A baseline with
 * no `updatedAt` reports nothing, because there is nothing to compare against.
 */
export function entriesAddedByWrite({ baseline = [], updatedAt } = {}) {
  if (typeof updatedAt !== "string" || !updatedAt || updatedAt === "undated") return [];

  return (Array.isArray(baseline) ? baseline : []).filter(
    (entry) => typeof entry?.addedAt === "string" && entry.addedAt.trim() && entry.addedAt >= updatedAt,
  );
}
