/**
 * Route scope, asked as one question per value: does anything write it?
 *
 * A stylesheet can be scoped to a route two ways, and they are two vocabularies
 * rather than one fact written twice:
 *
 *   - `html[data-wingman-route="<key>"]` — the value `AppShell` sets on
 *     `document.documentElement` from `activeRoute.key`, so the values are the
 *     `WingmanRouteKey` members in `routeCatalog.ts` plus the one literal the
 *     shell writes for the admin page;
 *   - `.wm-route-<segment>` — the class the shell adds, so the segments are
 *     `route-manifest.json`'s, plus the one literal the shell writes for admin.
 *
 * The trap is that the two sets look interchangeable and are not. A segment is
 * kebab-cased (`call-coach`, `approval-queue`, `analytics`) and a key is
 * camelCase (`callCoach`, `approvalQueue`, `analyticsDashboard`); 14 of the 29
 * routes differ. So `data-wingman-route="call-coach"` is a selector no page can
 * ever match even though `call-coach` is a live segment, and `.wm-route-callCoach`
 * is a class no page carries even though `callCoach` is a live key. A reader who
 * unions the two sets — "these are all the route values" — counts both dead
 * spellings as live, which is the one mistake that turns this check off while it
 * still reports a number.
 *
 * Both sets are therefore read from the writers, never from a list that merely
 * looks like the right shape: the union is parsed out of `routeCatalog.ts`, the
 * segments out of `route-manifest.json`, and the two literals the shell sets
 * directly (`data-manager`, and the `wm-route-data-manager` class, neither of
 * which is a catalogue route) out of `AppShell.tsx`'s own assignments. A value
 * present in one set is never admitted to the other by inference.
 *
 * What the reading produces is one finding per dead value per stylesheet, not
 * per selector: a retired route leaves a dozen rules behind, and a failure that
 * printed twelve selectors would bury the one line saying which value is gone.
 * `tools/wingman-route-scope-liveness-baseline.json` carries the reviewed ones —
 * a scope the tree keeps on purpose, with the count of rules it guards — and the
 * file ratchets down in both directions: a value that appears fails, and a pinned
 * value with nothing left guarding it fails until it leaves the file.
 */
import fs from "node:fs";
import path from "node:path";
import { parseRules } from "./dead-css.mjs";
import { GOVERNED_MAIN_CSS_IMPORTS } from "./route-stylesheets.mjs";

/** The reviewed dead scopes the gate is held to. */
export const ROUTE_SCOPE_BASELINE_FILE = "tools/wingman-route-scope-liveness-baseline.json";

/** The two runtime sources of truth, relative to the repo root. */
const CATALOG_FILE = path.join("src", "wingman2", "app", "routeCatalog.ts");
const MANIFEST_FILE = path.join("src", "wingman2", "app", "route-manifest.json");
const SHELL_FILE = path.join("src", "wingman2", "layout", "AppShell.tsx");

/** The attribute name the shell writes, and the class prefix it adds. */
export const ROUTE_ATTRIBUTE = "data-wingman-route";
export const ROUTE_CLASS_PREFIX = "wm-route-";

const RE_ATTRIBUTE_SCOPE = new RegExp(`\\[${ROUTE_ATTRIBUTE}\\s*=\\s*["']([^"']*)["']\\s*\\]`, "g");
const RE_CLASS_SCOPE = new RegExp(`\\.${ROUTE_CLASS_PREFIX}([a-zA-Z0-9-]+)`, "g");

function readText(root, relative) {
  return fs.readFileSync(path.join(root, relative), "utf8").replace(/\r\n/g, "\n");
}

/**
 * The string literals in one assignment statement, starting at `anchor`.
 *
 * The shell's two writers are ternaries, so the values that are not a catalogue
 * key are literals inside the statement: `? "data-manager" : activeRoute?.key ?? "dashboard"`.
 * Reading the statement rather than hard-coding the literal keeps the gate
 * honest about where a value comes from — a new admin-shaped page arrives with
 * its literal, and the value is live on the commit that writes it.
 *
 * A literal's offset is kept so a caller can tell the two halves of a ternary
 * apart: the assignment that sets the page key asks `location.pathname.includes("/admin/data-manager")`
 * first, and that path is a condition rather than a value. Only the branches are
 * values, and a path read as one would make `data-wingman-route="/admin/…"` look live.
 */
export function assignmentLiterals(source, anchor) {
  const start = source.indexOf(anchor);
  if (start === -1) return { literals: [], statement: "", questionAt: -1 };
  let depth = 0;
  let inString = null;
  let end = source.length;
  let questionAt = -1;
  const literals = [];

  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (inString) {
      if (char === "\\") index += 1;
      else if (char === inString) inString = null;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      let value = "";
      let cursor = index + 1;
      for (; cursor < source.length; cursor += 1) {
        if (source[cursor] === "\\") {
          cursor += 1;
          continue;
        }
        if (source[cursor] === char) break;
        value += source[cursor];
      }
      literals.push({ value, start: index - start });
      index = cursor;
      continue;
    }
    if (char === "?" && depth === 0 && questionAt === -1) questionAt = index - start;
    if (char === "(" || char === "[") depth += 1;
    if (char === ")" || char === "]") depth -= 1;
    if (char === ";" && depth === 0) {
      end = index;
      break;
    }
  }

  return { literals, statement: source.slice(start, end), questionAt };
}

/** The literals that sit in a branch of the statement's ternary, never in its condition. */
function branchValues(result) {
  return result.literals
    .filter((entry) => result.questionAt === -1 || entry.start > result.questionAt)
    .map((entry) => entry.value);
}

/** The `WingmanRouteKey` members, in the order the catalogue declares them. */
export function catalogueKeys(catalogSource) {
  const union = catalogSource.match(/export type WingmanRouteKey\s*=\s*([\s\S]*?);/);
  if (!union) {
    throw new Error(
      `Could not locate the WingmanRouteKey union in ${CATALOG_FILE}. `
      + "Without it the attribute values have no source, and an empty set would call every route scope dead.",
    );
  }
  return [...union[1].matchAll(/"([a-zA-Z0-9-]+)"/g)].map((match) => match[1]);
}

/**
 * The two live sets, each read from the writer that produces it.
 *
 * `attribute` is what `dataset.wingmanRoute` can hold and `className` is what
 * `wm-route-<…>` can carry; the shell's literals are folded into the set they
 * are written into, so the admin page is live in both spellings without either
 * set borrowing the other's vocabulary.
 */
export function routeScopeWriters({ root = process.cwd() } = {}) {
  const keys = catalogueKeys(readText(root, CATALOG_FILE));
  const manifest = JSON.parse(readText(root, MANIFEST_FILE));
  const shell = readText(root, SHELL_FILE);

  const pageKey = assignmentLiterals(shell, "const wingmanPageKey =");
  const routeClass = assignmentLiterals(shell, "const activeRouteClass =");

  // A template literal is read as text by the scanner above, so a `…${expr}`
  // fragment is not a value: the expression is what fills it in, and only the
  // manifest can say which segments that produces.
  const literal = (value) => value.length > 0 && !value.includes("${");

  const attribute = new Set([
    ...keys,
    ...branchValues(pageKey).filter(literal).map((value) => value.trim()),
  ]);
  const className = new Set([
    ...manifest.map((route) => String(route.segment)),
    ...branchValues(routeClass)
      .filter((value) => literal(value) && value.startsWith(ROUTE_CLASS_PREFIX))
      .map((value) => value.slice(ROUTE_CLASS_PREFIX.length)),
  ]);

  return { attribute, className, keys, segments: manifest.map((route) => String(route.segment)), pages: manifest.length };
}

/** Every route scope one selector names, with the set its value belongs to. */
export function routeScopeTokens(selector) {
  const tokens = [];
  for (const match of selector.matchAll(RE_ATTRIBUTE_SCOPE)) {
    tokens.push({ kind: "attribute", value: match[1], token: match[0] });
  }
  for (const match of selector.matchAll(RE_CLASS_SCOPE)) {
    tokens.push({ kind: "class", value: match[1], token: match[0] });
  }
  return tokens;
}

/**
 * One stylesheet's dead route scopes, grouped by the value that is gone.
 *
 * A rule may name both spellings; each spelling is compared with its own set, so
 * a rule that is correct holds one live pair while a rule that guessed holds a
 * dead one beside it. `count` is the number of rules naming that value, because
 * that is what a reviewer decides about — a scope kept for twelve rules is a
 * different decision from a scope kept for one.
 */
export function deadRouteScopesIn(text, writers, file) {
  const found = new Map();

  for (const rule of parseRules(text)) {
    for (const token of routeScopeTokens(rule.selector)) {
      const live = token.kind === "attribute" ? writers.attribute : writers.className;
      if (live.has(token.value)) continue;
      const key = `${token.kind}|${token.value}`;
      const entry = found.get(key) ?? {
        kind: token.kind,
        value: token.value,
        count: 0,
        files: [],
        selectors: [],
      };
      entry.count += 1;
      if (!entry.files.includes(file)) entry.files.push(file);
      if (!entry.selectors.includes(rule.selector)) entry.selectors.push(rule.selector);
      found.set(key, entry);
    }
  }

  return [...found.values()];
}

/** Every governed stylesheet read, in the order the app loads them, plus the total. */
export function routeScopeReport({ root = process.cwd() } = {}) {
  const writers = routeScopeWriters({ root });
  const files = GOVERNED_MAIN_CSS_IMPORTS.map((entry) => entry.replace(/^\.\//, "src/"));
  const dead = new Map();
  let rules = 0;
  let scoped = 0;

  for (const file of files) {
    const text = fs.readFileSync(path.join(root, file), "utf8");
    for (const rule of parseRules(text)) {
      rules += 1;
      if (routeScopeTokens(rule.selector).length > 0) scoped += 1;
    }
    for (const scope of deadRouteScopesIn(text, writers, file)) {
      const key = `${scope.kind}|${scope.value}`;
      const entry = dead.get(key) ?? { ...scope, count: 0, files: [], selectors: [] };
      entry.count += scope.count;
      for (const name of scope.files) if (!entry.files.includes(name)) entry.files.push(name);
      for (const selector of scope.selectors) if (!entry.selectors.includes(selector)) entry.selectors.push(selector);
      dead.set(key, entry);
    }
  }

  const scopes = [...dead.values()].sort(
    (left, right) => right.count - left.count || left.kind.localeCompare(right.kind) || left.value.localeCompare(right.value),
  );

  return {
    writers,
    files,
    scopes,
    totals: {
      files: files.length,
      rules,
      scoped,
      deadValues: scopes.length,
      deadRules: scopes.reduce((sum, scope) => sum + scope.count, 0),
      attributeValues: writers.attribute.size,
      classSegments: writers.className.size,
    },
  };
}

function pinnedKey(entry) {
  return `${entry.kind}|${entry.value}`;
}

/** How a failure says which spelling is wrong, in the words the writer uses. */
export function describeScopeKind(kind) {
  return kind === "attribute"
    ? "the attribute spelling, whose values are the catalogue keys"
    : "the class spelling, whose values are the manifest segments";
}

/**
 * What the baseline and the tree disagree about, said as sentences.
 *
 * Both directions fail. An unreviewed dead value is a rule scoped to a route no
 * page can reach — styling nobody sees, and a selector the next person reads as
 * live. A pinned value with nothing guarding it any more is an entry that sits in
 * the file pretending a decision is still being made. The count is compared too,
 * so a pinned scope that spreads to more rules has to be read again rather than
 * covered by the entry that was written for the first one.
 */
export function routeScopeBaselineFailure(report, baseline) {
  const failures = [];
  const entries = Array.isArray(baseline?.scopes) ? baseline.scopes : [];
  const pinned = new Map();

  for (const entry of entries) {
    const key = pinnedKey(entry);
    if (pinned.has(key)) {
      failures.push(`The route-scope baseline holds ${entry.kind} value \`${entry.value}\` twice; one value has one reviewed decision.`);
      continue;
    }
    if (typeof entry.reason !== "string" || entry.reason.trim().length < 60) {
      failures.push(`The route-scope baseline entry for \`${entry.value}\` does not say why that scope is kept.`);
    }
    if (entry.kind !== "attribute" && entry.kind !== "class") {
      failures.push(`The route-scope baseline entry for \`${entry.value}\` does not say which spelling it is (\`attribute\` or \`class\`).`);
    }
    pinned.set(key, entry);
  }

  const current = new Map(report.scopes.map((scope) => [pinnedKey(scope), scope]));

  for (const [key, scope] of current) {
    const before = pinned.get(key);
    if (!before) {
      failures.push(
        `A route scope nothing writes: \`${scope.value}\` is used in ${describeScopeKind(scope.kind)}, in `
        + `${scope.files.join(", ")} (${scope.count} rule(s), e.g. \`${scope.selectors[0]}\`). `
        + `No page sets that value${scope.kind === "attribute" ? " — a kebab-cased segment is not an attribute value" : " — a camelCase key is not a class"}.`,
      );
      continue;
    }
    const pinnedCount = Number(before.count);
    if (!Number.isFinite(pinnedCount) || pinnedCount !== scope.count) {
      failures.push(
        `The route-scope baseline pins \`${scope.value}\` (${scope.kind}) ${before.count} rule(s) and the tree now has ${scope.count}. `
        + "A reviewed scope that grew has to be read again; an entry that shrank is stale and has to come down to the reading.",
      );
    }
  }

  for (const [key, before] of pinned) {
    if (current.has(key)) continue;
    failures.push(
      `The route-scope baseline pins ${before.kind === "attribute" ? "the attribute value" : "the class segment"} \`${before.value}\` `
      + `across ${before.count} rule(s) and no stylesheet uses it any more. A reviewed scope that is gone has to leave the file.`,
    );
  }

  return failures;
}

/** The verdict in one sentence: what was read, and what is left. */
export function describeRouteScopeReport(report) {
  const totals = report.totals;
  const head = `${totals.files} stylesheets, ${totals.rules} rules, ${totals.scoped} route-scoped; `
    + `${totals.attributeValues} live attribute values and ${totals.classSegments} live class segments`;

  if (totals.deadRules === 0) return `${head}: every route scope names a value a page writes.`;

  return `${head}: ${totals.deadValues} value(s) nothing writes across ${totals.deadRules} rule(s).`;
}

/** One line per dead value, so a failure names the spine before the selector. */
export function describeRouteScopeValues(report) {
  return report.scopes.map(
    (scope) => `${scope.kind} \`${scope.value}\`: ${scope.count} rule(s) in ${scope.files.join(", ")}.`,
  );
}
