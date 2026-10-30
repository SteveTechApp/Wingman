/**
 * The route-stylesheet split, asked as one order question per page.
 *
 * `style-order-equivalence.mjs` answers "did this move change which declaration
 * wins?" for any two arrangements. The split gave nine pages a stylesheet of
 * their own out of `wingman-route-overrides.css`, and the move it made is always
 * the same one: a rule that used to load from inside the shared file now loads
 * from a file that comes after it. So the question this module asks per page is:
 *
 *   - before — the page's own file first, then the rules the shared file still
 *     holds for that same page;
 *   - after — the shared file's copy first, then the page's file, which is the
 *     load order `src/main.tsx` declares.
 *
 * That first arrangement is not a reconstruction of the file before the split;
 * where a moved block sat among the leftovers is no longer in the tree. It is the
 * arrangement in which the leftovers win, so every pair this reports is one whose
 * winner the file placement alone decides: the page's copy wins because its file
 * loads last, and nothing about the declarations says it should.
 *
 * Both sides are pinned to the page's own route keys (`html[data-wingman-route]`
 * values and `.wm-route-<segment>` classes), and that pin is the scope of the
 * check rather than a claim about the rest of the cascade. A page rule against a
 * shared rule no route scopes is a different question with a different owner —
 * the shared rule is written for every page — so those pairs are left out of this
 * reading, and the module's summary says which pairs it read rather than letting
 * a green run imply the rest of the cascade was cleared.
 *
 * What is left is the population the split re-decided: hundreds of pairs, nearly
 * all of them the same page's own override meeting a shared rule for that page.
 * Nobody reads that list one pair at a time, so the reviewed unit is the page.
 * `tools/wingman-route-stylesheet-order-baseline.json` carries one reason per
 * page — why that page's rules may load after what the shared file kept — and
 * pins the page's pairs beneath it. The pairs are pinned by identity rather than
 * counted, so a new pair is named and a pinned pair that stopped occurring is
 * named too: the file only ratchets down, the way this repo's other baselines do.
 *
 * Nothing here decides which declaration should win. It reports the verdict, and
 * the reviewed page decision is what turns a pair from "nobody looked" into "a
 * person said this page's split is the one we meant".
 */
import fs from "node:fs";
import path from "node:path";
import { parseRules, selectorBranches } from "./dead-css.mjs";
import { compareRuleOrder, routeKeysOf, summarizeRuleOrder } from "./style-order-equivalence.mjs";
import { LEGACY_ROUTE_OVERRIDES, ROUTE_PAGE_STYLESHEETS } from "./route-stylesheets.mjs";

/** The reviewed page decisions the split is held to. */
export const ROUTE_ORDER_BASELINE_FILE = "tools/wingman-route-stylesheet-order-baseline.json";

/** Where the governed stylesheets live, relative to the repo root. */
const STYLE_DIRECTORY = path.join("src", "wingman2", "styles");

/** The two spellings of a route, as the equivalence lib compares them. */
export function routeKeyMap() {
  return ROUTE_PAGE_STYLESHEETS.map((page) => ({ key: page.key, segment: page.segment }));
}

/**
 * One stylesheet's rules, keeping only those every branch pins to `keys`.
 *
 * A block that names another page, a page markup attribute or a token no route
 * sets is not owned by any one page, and it is exactly the block the split left
 * in the shared file. Reading it as a page's own rule would invent a pair the
 * split never re-decided.
 */
export function routeOwnedCss(text, keys, routes = routeKeyMap()) {
  const kept = [];

  for (const rule of parseRules(text)) {
    const branches = selectorBranches(rule.selector);
    const owned = branches.length > 0 && branches.every((branch) => {
      const found = routeKeysOf(branch, routes);
      return found.length === 1 && keys.includes(found[0]);
    });
    if (!owned) continue;
    const block = `${rule.selector} {${rule.body}}`;
    kept.push(rule.media.length ? `${rule.media.join(" ")} { ${block} }` : block);
  }

  return kept.join("\n");
}

/**
 * Every page's reading, plus the totals a summary line is built from.
 *
 * `pages` keeps each page's own ranked conflicts so a failure can name the page
 * before it names the property, and `conflicts` is the same list flattened and
 * rank-sorted for the report and the baseline comparison.
 */
export function routeStylesheetOrderReport({ root = process.cwd() } = {}) {
  const routes = routeKeyMap();
  const legacy = fs.readFileSync(path.join(root, STYLE_DIRECTORY, LEGACY_ROUTE_OVERRIDES), "utf8");
  const pages = [];
  const conflicts = [];

  for (const page of ROUTE_PAGE_STYLESHEETS) {
    const moved = { file: page.file, text: fs.readFileSync(path.join(root, STYLE_DIRECTORY, page.file), "utf8") };
    const leftovers = { file: LEGACY_ROUTE_OVERRIDES, text: routeOwnedCss(legacy, [page.key], routes) };
    const result = compareRuleOrder({ routes, before: [moved, leftovers], after: [leftovers, moved] });
    const summary = summarizeRuleOrder(result);
    const pageConflicts = result.conflicts.map((conflict) => ({ ...conflict, route: page.route, file: page.file }));

    conflicts.push(...pageConflicts);
    pages.push({ route: page.route, file: page.file, label: page.label, summary, conflicts: pageConflicts });
  }

  // Strongest sign of a real dependency first, across every page: the list a
  // failure prints is a reading order, and a reviewer meets the pairs that
  // probably are one element before the ones that probably cannot be.
  conflicts.sort(
    (left, right) =>
      left.rank - right.rank
      || left.route.localeCompare(right.route)
      || left.property.localeCompare(right.property)
      || left.beforeFirst.selector.localeCompare(right.beforeFirst.selector)
      || left.beforeSecond.selector.localeCompare(right.beforeSecond.selector),
  );

  const likely = conflicts.filter((conflict) => conflict.rank <= 1);
  const totals = {
    pages: pages.length,
    rules: pages.reduce((sum, page) => sum + page.summary.rules, 0),
    conflicts: conflicts.length,
    likely: likely.length,
    subjectDisjoint: conflicts.length - likely.length,
    added: pages.reduce((sum, page) => sum + page.summary.added, 0),
    removed: pages.reduce((sum, page) => sum + page.summary.removed, 0),
    provenPages: pages.filter((page) => page.summary.proven).length,
  };

  return { pages, conflicts, totals };
}

/**
 * The conditions both sides of a pair live under, as one label.
 *
 * Two rules that only meet at a width are a different decision from two that
 * always meet, so the conditions belong in the identity of a pair: a reviewed
 * unconditional pair may not stand in for a media-scoped one that appears later.
 */
export function routeOrderPairMedia(conflict) {
  const first = (conflict.beforeFirst.media ?? []).join(" ");
  const second = (conflict.beforeSecond.media ?? []).join(" ");
  return `${first} || ${second}`;
}

/** One pair's stable identity: the fields a reviewer reads, and nothing else. */
export function routeOrderPairKey(conflict) {
  return [
    conflict.property,
    conflict.important ? "important" : "normal",
    conflict.specificity,
    routeOrderPairMedia(conflict),
    conflict.beforeFirst.selector,
    conflict.beforeSecond.selector,
  ].join(" | ");
}

/** How the two subjects might be one element, for a failure sentence. */
export function routeOrderSubjectShape(conflict) {
  const shared = conflict.sharedSubjectClasses ?? [];
  if (shared.length > 0) return `the same \`${shared[0]}\` class`;
  if (conflict.sharedSubjectElement) return `the same \`${conflict.beforeSecond.selector.split(/\s+/).at(-1)}\` element`;
  return "no shared subject token";
}

/** The pairs one page's reading produced, as the baseline pins them. */
export function routeOrderPagePairs(page) {
  return page.conflicts.map((conflict) => ({
    property: conflict.property,
    important: Boolean(conflict.important),
    specificity: conflict.specificity,
    media: routeOrderPairMedia(conflict),
    first: conflict.beforeFirst.selector,
    second: conflict.beforeSecond.selector,
    key: routeOrderPairKey(conflict),
  }));
}

function pinnedKey(pair) {
  return pair.key ?? [
    pair.property,
    pair.important ? "important" : "normal",
    pair.specificity,
    pair.media ?? " || ",
    pair.first,
    pair.second,
  ].join(" | ");
}

/**
 * What the baseline and the tree disagree about, said as sentences.
 *
 * Both directions fail. An unreviewed pair is the split re-deciding an element
 * nobody looked at; a pinned pair that no longer occurs is an entry that would
 * sit in the file pretending a decision is still being made. The page decision
 * is held the same way: a page with no entry, or a page entry for a sheet the
 * split no longer has, is a page whose split nobody has answered for. A failure
 * names the pair with its property, both selectors and how the subjects relate,
 * because "a pair appeared" would leave the reviewer to find it.
 *
 * Pairs are matched as counts rather than as a set, because one selector pair
 * can meet in more than one place: two rules with the same selectors but
 * different declarations are different rules, and a file that repeats a block
 * meets its counterpart twice. The identity a reviewer reads therefore cannot
 * carry the declaration values — that would unpin a pair on every value edit —
 * so a repeated line in the baseline means "this pair happens this often".
 */
export function routeOrderBaselineFailure(report, baseline) {
  const failures = [];
  const entries = Array.isArray(baseline?.pages) ? baseline.pages : [];
  const byRoute = new Map();

  for (const entry of entries) {
    if (byRoute.has(entry.route)) {
      failures.push(`The route-stylesheet order baseline holds ${entry.route} twice; one page has one reviewed decision.`);
      continue;
    }
    if (typeof entry.reason !== "string" || entry.reason.trim().length < 60) {
      failures.push(`The route-stylesheet order baseline entry for ${entry.route} does not say why that page's rules may load after what the shared file kept.`);
    }
    byRoute.set(entry.route, entry);
  }

  const reportRoutes = new Map(report.pages.map((page) => [page.route, page]));

  for (const [route, entry] of byRoute) {
    if (!reportRoutes.has(route)) {
      failures.push(`The route-stylesheet order baseline reviews ${route} (${entry.file}), and the split no longer has that page stylesheet. A retired page has to leave the file.`);
    }
  }

  for (const page of report.pages) {
    const entry = byRoute.get(page.route);
    if (!entry) {
      failures.push(
        `The ${page.route} page stylesheet has no reviewed decision in the route-stylesheet order baseline: `
        + `${page.summary.conflicts} pair(s) of its own rules are re-decided by the split, and nobody has said that page's split is the one we meant.`,
      );
      continue;
    }

    const pinned = new Map();
    for (const pair of Array.isArray(entry.pairs) ? entry.pairs : []) {
      const key = pinnedKey(pair);
      const seen = pinned.get(key);
      pinned.set(key, { pair, count: (seen?.count ?? 0) + 1 });
    }

    const current = new Map();
    for (const pair of routeOrderPagePairs(page)) {
      const seen = current.get(pair.key);
      current.set(pair.key, { pair, count: (seen?.count ?? 0) + 1 });
    }

    for (const [key, now] of current) {
      const before = pinned.get(key)?.count ?? 0;
      if (now.count <= before) continue;
      const conflict = page.conflicts.find((candidate) => routeOrderPairKey(candidate) === key);
      const conditions = now.pair.media && now.pair.media.trim() !== "||" ? `, under ${now.pair.media.replace("||", "against")}` : "";
      failures.push(
        `A pair the split decides is not reviewed: \`${now.pair.property}\` on ${page.route} at specificity ${now.pair.specificity}${conditions}, `
        + `${routeOrderSubjectShape(conflict)}, ${now.count - before} more time(s) than the baseline pins `
        + `(\`${now.pair.second}\` from ${LEGACY_ROUTE_OVERRIDES} now loads before \`${now.pair.first}\` in ${page.file}, `
        + "so the page's copy wins the tie).",
      );
    }

    for (const [key, before] of pinned) {
      const now = current.get(key)?.count ?? 0;
      if (now >= before.count) continue;
      failures.push(
        `The route-stylesheet order baseline pins \`${before.pair.property}\` on ${page.route} ${before.count} time(s) and nothing decides it `
        + `${now === 0 ? "any more" : `as often (${now})`} (${before.pair.first} / ${before.pair.second}). `
        + "A reviewed pair that stopped occurring has to leave the file.",
      );
    }
  }

  return failures;
}

/** The verdict in one sentence: how many pages proved, and what was left. */
export function describeRouteOrderReport(report) {
  const totals = report.totals;
  const head = `${totals.pages} page stylesheets, ${totals.rules} rules compared, ${totals.provenPages} proven`;

  if (totals.conflicts === 0) {
    return `${head}: no page's own override is re-decided by the split.`;
  }

  return `${head}: ${totals.conflicts} order-decidable pair(s) re-decided, `
    + `${totals.likely} on a subject that can be one element and ${totals.subjectDisjoint} on subjects sharing no token.`;
}

/** One line per page, so a failure names the page before the property. */
export function describeRouteOrderPages(report) {
  return report.pages.map((page) => {
    if (page.summary.proven) return `${page.route}: order preserved.`;
    return `${page.route}: ${page.summary.conflicts} pair(s) re-decided (${page.summary.likelyConflicts} on a shared subject).`;
  });
}
