import {
  compoundClassTokens,
  parseRules,
  selectorBranches,
  selectorCompounds,
} from "./dead-css.mjs";

/**
 * Order equivalence for stylesheet moves.
 *
 * A stylesheet split moves declarations between files, which changes which file
 * loads last. That is harmless for rules of different specificity — the more
 * specific one wins wherever it sits — and harmless for rules that declare
 * different properties. It is not harmless for two rules of equal specificity
 * that declare the same property and can apply to the same element: there the
 * later rule wins, so reordering them silently changes the cascade.
 *
 * This module answers that question statically. It reads a set of stylesheets
 * as an ordered list and compares two arrangements rule by rule:
 *
 *   - a rule is identified by its selector branch and its declarations, so a
 *     move that preserves both is "the same rule" in a new position;
 *   - a pair of rules is compared only when order can decide it: equal
 *     specificity, the same property, the same importance, and media
 *     conditions that can hold at the same time;
 *   - a pair whose relative order changed is a conflict, reported with whether
 *     the two subjects can be one element.
 *
 * The specificity model is CSS's own: ids, then classes/attributes/pseudo-
 * classes, then elements/pseudo-elements. `:is()`/`:not()`/`:has()` contribute
 * their most specific argument, `:where()` contributes nothing, and route-style
 * `:is()` groups are compared branch by branch, so a rule legitimately split
 * into one copy per route produces no conflict.
 *
 * The check is deliberately conservative where it cannot see markup: media
 * conditions are narrowed only where both sides are width queries, and any
 * condition it cannot read (`@supports`, a non-width feature) is treated as
 * possibly co-applying.
 *
 * Only three narrowings are sound without the markup: two branches that pin the
 * same attribute to different values can never match one element, two branches
 * that pin different routes never match in one session, and media that cannot
 * both hold cannot both apply. Disjoint class tokens are *not* a narrowing —
 * `class="alpha beta"` is one element, so `.alpha` and `.beta` do tie — which is
 * why a conflict is never dropped for looking unrelated. A move is proven only
 * when the conflict list is empty; the classes the two subjects share are
 * reported to rank a review list, never to shorten it.
 *
 * A route is written two ways — `html[data-wingman-route="compare"]` and
 * `.wm-route-compare` — so the two spellings have to be read as one fact before
 * they can be compared. The mapping from a route key to its class segment is
 * the app's, not this module's, so it is passed in; a pair of spellings this
 * module cannot map stays a conflict rather than being guessed at.
 */

const IDENTIFIER_START = /[-_a-zA-Z]/;
const IDENTIFIER_PART = /[-_a-zA-Z0-9]/;
const PROPERTY_NAME = /^(?:--[-_a-zA-Z0-9]+|-?[a-z][-_a-zA-Z0-9]*)$/;
const SINGLE_VALUE_ATTRIBUTE = /\[\s*([-_a-zA-Z][-_a-zA-Z0-9]*)\s*=\s*["']([^"']*)["']\s*\]/g;

function skipIdentifier(text, index) {
  let cursor = index;
  while (cursor < text.length && IDENTIFIER_PART.test(text[cursor])) cursor += 1;
  return cursor;
}

function skipBracket(text, index) {
  let cursor = index + 1;
  let quote = null;
  while (cursor < text.length) {
    const char = text[cursor];
    if (quote) {
      if (char === quote) quote = null;
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === "]") {
      return cursor + 1;
    }
    cursor += 1;
  }
  return text.length;
}

function readParenthesised(text, index) {
  let depth = 0;
  let quote = null;
  for (let cursor = index; cursor < text.length; cursor += 1) {
    const char = text[cursor];
    if (quote) {
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === "(") depth += 1;
    else if (char === ")") {
      depth -= 1;
      if (depth === 0) return { inner: text.slice(index + 1, cursor), end: cursor + 1 };
    }
  }
  return { inner: text.slice(index + 1), end: text.length };
}

/**
 * Specificity as CSS counts it: `{ ids, classes, elements, score }`, where the
 * score orders two selectors the way the cascade does.
 */
export function selectorSpecificity(selector) {
  let ids = 0;
  let classes = 0;
  let elements = 0;
  let index = 0;

  while (index < selector.length) {
    const char = selector[index];

    if (char === "#") {
      ids += 1;
      index = skipIdentifier(selector, index + 1);
      continue;
    }

    if (char === ".") {
      classes += 1;
      index = skipIdentifier(selector, index + 1);
      continue;
    }

    if (char === "[") {
      classes += 1;
      index = skipBracket(selector, index);
      continue;
    }

    if (char === ":") {
      if (selector[index + 1] === ":") {
        elements += 1;
        let cursor = skipIdentifier(selector, index + 2);
        if (selector[cursor] === "(") cursor = readParenthesised(selector, cursor).end;
        index = cursor;
        continue;
      }

      const nameStart = index + 1;
      let cursor = skipIdentifier(selector, nameStart);
      const name = selector.slice(nameStart, cursor).toLowerCase();
      let inner = "";
      if (selector[cursor] === "(") {
        const read = readParenthesised(selector, cursor);
        inner = read.inner;
        cursor = read.end;
      }

      if (name === "where") {
        // Zero specificity, and its arguments are not counted at all.
      } else if (["is", "not", "has", "matches"].includes(name)) {
        const max = maxSpecificity(inner);
        ids += max.ids;
        classes += max.classes;
        elements += max.elements;
      } else {
        classes += 1;
      }

      index = cursor;
      continue;
    }

    if (char === "*") {
      index += 1;
      continue;
    }

    if (IDENTIFIER_START.test(char)) {
      elements += 1;
      index = skipIdentifier(selector, index);
      continue;
    }

    index += 1;
  }

  return { ids, classes, elements, score: ids * 10000 + classes * 100 + elements };
}

function maxSpecificity(selectorList) {
  const branches = selectorBranches(selectorList);
  if (branches.length === 0) return { ids: 0, classes: 0, elements: 0, score: 0 };
  return branches
    .map((branch) => selectorSpecificity(branch))
    .reduce((best, current) => (current.score > best.score ? current : best));
}

/**
 * One branch per alternative of every `:is()` group whose arguments carry the
 * same specificity.
 *
 * `:is(.a, .b) .x` and two rules `.a .x` / `.b .x` at the same position match the
 * same elements with the same weight, so a split that separates the alternatives
 * into different files should still be read as "the same rule, moved". Groups
 * whose arguments differ in specificity (`:is(.a, #b)`) are left whole, because
 * CSS gives every alternative the most specific argument's weight and expanding
 * them would under-count the weaker ones.
 */
export function styleRuleBranches(selector) {
  return selectorBranches(selector).flatMap((branch) => expandIsGroups(branch));
}

function expandIsGroups(branch) {
  const match = /:is\(/i.exec(branch);
  if (!match) return [branch];

  const open = match.index + match[0].length - 1;
  const { inner, end } = readParenthesised(branch, open);
  const alternatives = selectorBranches(inner);
  const scores = new Set(alternatives.map((alternative) => selectorSpecificity(alternative).score));
  if (alternatives.length < 2 || scores.size !== 1) return [branch];

  const before = branch.slice(0, match.index);
  const after = branch.slice(end);
  return alternatives.flatMap((alternative) => expandIsGroups(`${before}${alternative}${after}`));
}

/** Attribute names a branch pins to one value, e.g. a route attribute. */
function singleValueAttributes(branch) {
  const constraints = new Map();
  for (const match of branch.matchAll(SINGLE_VALUE_ATTRIBUTE)) {
    const name = match[1].toLowerCase();
    const values = constraints.get(name) ?? new Set();
    values.add(match[2]);
    constraints.set(name, values);
  }
  return constraints;
}

/**
 * Whether two branches pin the same attribute to different values. Such rules
 * can never match the same element, so their order cannot matter — which is
 * exactly the route-scoped pair a `:is()` group is split along.
 */
export function attributeScopesDisjoint(left, right) {
  const leftAttributes = singleValueAttributes(left);
  const rightAttributes = singleValueAttributes(right);

  for (const [name, values] of leftAttributes) {
    const other = rightAttributes.get(name);
    if (!other) continue;
    if (![...values].some((value) => other.has(value))) return true;
  }

  return false;
}

const ROUTE_CLASS = /(\.wm-route-[a-z0-9-]+)/gi;
const ROUTE_ATTRIBUTE = /\[\s*data-wingman-route\s*=\s*["']([^"']*)["']\s*\]/gi;

/**
 * The route a branch pins, as route keys.
 *
 * `routes` maps spellings onto one key: `[{ key, segment }]` is enough for the
 * manifest, and a page that writes its own attribute value can add an entry
 * whose segment is the class it uses. A branch with no route pin, or with two
 * pins that disagree, yields whatever it could read — the caller only narrows
 * when both branches resolved to exactly one key each.
 */
export function routeKeysOf(branch, routes = []) {
  const keys = new Set();
  const bySegment = new Map(routes.map((route) => [route.segment, route.key]));

  // The attribute already carries the key; it is only "known" when it is one
  // the caller listed, which is what keeps an unmapped value from narrowing.
  for (const match of branch.matchAll(ROUTE_ATTRIBUTE)) keys.add(match[1]);

  for (const match of branch.matchAll(ROUTE_CLASS)) {
    const segment = match[1].replace(/^\.wm-route-/, "").toLowerCase();
    const key = bySegment.get(segment) ?? segment;
    keys.add(key);
  }

  return [...keys];
}

/**
 * Whether two branches are pinned to two different routes.
 *
 * One session is one route, so no element can be inside both. A spelling this
 * module cannot map still normalizes to something — its own text — and two
 * different unmapped spellings are not called disjoint, because the keys they
 * would have resolved to are unknown rather than different.
 */
export function routeScopesDisjoint(left, right, routes = []) {
  if (!routes.length) return false;
  const leftKeys = routeKeysOf(left, routes);
  const rightKeys = routeKeysOf(right, routes);
  if (leftKeys.length !== 1 || rightKeys.length !== 1) return false;
  if (leftKeys[0] === rightKeys[0]) return false;
  // Both sides must be names this module can place on the map, or the answer
  // would be "different words" rather than "different routes".
  const known = new Set(routes.map((route) => route.key));
  return known.has(leftKeys[0]) && known.has(rightKeys[0]);
}

/** The compound selector that decides the element a branch matches. */
function subjectOf(branch) {
  const compounds = selectorCompounds(branch);
  const subject = compounds.at(-1) ?? "";
  const element = subject.match(/^([a-zA-Z][-_a-zA-Z0-9]*)/);
  return {
    classes: compoundClassTokens(subject),
    element: element ? element[1].toLowerCase() : null,
  };
}

/** Split a declaration block on top-level semicolons. */
function declarationParts(body) {
  const parts = [];
  let current = "";
  let depth = 0;
  let quote = null;

  for (let index = 0; index < body.length; index += 1) {
    const char = body[index];
    if (quote) {
      current += char;
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      current += char;
      continue;
    }
    if (char === "(" || char === "[") depth += 1;
    if (char === ")" || char === "]") depth = Math.max(0, depth - 1);
    if (char === ";" && depth === 0) {
      parts.push(current);
      current = "";
      continue;
    }
    current += char;
  }

  parts.push(current);
  return parts;
}

/** Declarations of one rule, last declaration of a property winning. */
export function declarationList(body) {
  const declarations = new Map();

  for (const part of declarationParts(body)) {
    const colon = part.indexOf(":");
    if (colon === -1) continue;
    const property = part.slice(0, colon).trim().toLowerCase();
    if (!PROPERTY_NAME.test(property)) continue;
    let value = part.slice(colon + 1).trim();
    const important = /!\s*important\s*$/i.test(value);
    if (important) value = value.replace(/!\s*important\s*$/i, "").trim();
    if (!value) continue;
    declarations.set(property, { property, value, important });
  }

  return [...declarations.values()];
}

/**
 * The width range a media chain allows, or null when it holds a condition this
 * module cannot narrow (a query the caller should treat as possibly applying).
 */
function mediaWidthRange(media) {
  let min = 0;
  let max = Infinity;
  const types = new Set();

  for (const prelude of media) {
    if (!/^@media\b/i.test(prelude)) return null;
    const condition = prelude.replace(/^@media\b/i, "");

    for (const match of condition.matchAll(/\(\s*(min|max)-(width|height)\s*:\s*([\d.]+)(px|em|rem)?\s*\)/gi)) {
      if (match[2].toLowerCase() !== "width") return null;
      const unit = match[4] && /em|rem/i.test(match[4]) ? 16 : 1;
      const value = Number(match[3]) * unit;
      if (match[1].toLowerCase() === "min") min = Math.max(min, value);
      else max = Math.min(max, value);
    }

    const type = condition.trim().match(/^([a-z]+)\b/i);
    if (type && !["and", "not", "only"].includes(type[1].toLowerCase())) {
      types.add(type[1].toLowerCase());
    }
  }

  const named = [...types].filter((type) => type !== "all");
  if (named.length > 1) return { min: 1, max: 0 };

  return { min, max };
}

/** Whether two media chains can hold at the same time. */
export function mediaConditionsOverlap(left, right) {
  const leftRange = mediaWidthRange(left);
  const rightRange = mediaWidthRange(right);
  if (leftRange === null || rightRange === null) return true;
  return Math.max(leftRange.min, rightRange.min) <= Math.min(leftRange.max, rightRange.max);
}

function identityOf(branch, declarations) {
  return `${branch}||${declarations
    .map((declaration) => `${declaration.property}:${declaration.value}${declaration.important ? "!important" : ""}`)
    .join(";")}`;
}

/**
 * Every declaration site in a set of stylesheets, as one ordered list.
 *
 * `stylesheets` is `[{ file, text }]` in load order. A rule with a selector list
 * yields one unit per branch at the same order, because the cascade matches one
 * branch at a time: a future split that separates those branches into different
 * files keeps the same set of units and only has to keep their order.
 */
export function styleRuleUnits(stylesheets) {
  const units = [];
  let order = 0;

  for (const sheet of stylesheets) {
    for (const rule of parseRules(sheet.text)) {
      order += 1;
      const declarations = declarationList(rule.body);
      if (declarations.length === 0) continue;
      const properties = new Map(declarations.map((declaration) => [declaration.property, declaration.important]));

      for (const branch of styleRuleBranches(rule.selector)) {
        const subject = subjectOf(branch);
        units.push({
          file: sheet.file ?? null,
          order,
          selector: branch,
          declarations,
          properties,
          specificity: selectorSpecificity(branch).score,
          subjectClasses: subject.classes,
          subjectElement: subject.element,
          media: rule.media ?? [],
          key: identityOf(branch, declarations),
        });
      }
    }
  }

  return units;
}

function pairByIdentity(beforeUnits, afterUnits) {
  const beforeByKey = new Map();
  const afterByKey = new Map();

  for (const unit of beforeUnits) {
    const list = beforeByKey.get(unit.key) ?? [];
    list.push(unit);
    beforeByKey.set(unit.key, list);
  }

  for (const unit of afterUnits) {
    const list = afterByKey.get(unit.key) ?? [];
    list.push(unit);
    afterByKey.set(unit.key, list);
  }

  const shared = [];
  const removed = [];
  const added = [];

  for (const [key, units] of beforeByKey) {
    const matches = afterByKey.get(key) ?? [];
    for (let index = 0; index < units.length; index += 1) {
      if (index < matches.length) shared.push({ before: units[index], after: matches[index] });
      else removed.push(units[index]);
    }
  }

  for (const [key, units] of afterByKey) {
    const known = (beforeByKey.get(key) ?? []).length;
    for (let index = known; index < units.length; index += 1) added.push(units[index]);
  }

  return { shared, removed, added };
}

/**
 * How likely the two subjects are to be the same element.
 *
 * A shared class token is the strong sign, because a component's own classes
 * travel together. A shared element name is the weak one: two `button`s in
 * different toolbars are one element's worth of risk only if the markup nests
 * them. Neither is a reason to drop the conflict, because the checklist is what
 * decides, and it is sorted with the strong sign first.
 */
function classifySubjects(left, right) {
  const sharedClasses = left.subjectClasses.filter((token) => right.subjectClasses.includes(token));
  const sharedElement = Boolean(left.subjectElement) && left.subjectElement === right.subjectElement;

  return {
    sharedClasses,
    sharedElement,
    likelySameElement: sharedClasses.length > 0 || sharedElement,
    rank: sharedClasses.length > 0 ? 0 : sharedElement ? 1 : 2,
  };
}

/**
 * Every pair of rules whose relative order changed and where order can decide
 * the winner: same property, same importance, equal specificity, media that can
 * hold together, and scopes that can meet.
 *
 * `routes` is the route key/segment map the app's shell writes; passing it is
 * what lets the two route spellings be compared. Without it every cross-route
 * pair reads as a conflict, which is the noisy answer rather than a wrong one.
 */
export function compareRuleOrder({ before = [], after = [], routes = [] }) {
  const beforeUnits = styleRuleUnits(before);
  const afterUnits = styleRuleUnits(after);
  const { shared, removed, added } = pairByIdentity(beforeUnits, afterUnits);

  const byProperty = new Map();
  for (const pair of shared) {
    for (const declaration of pair.before.declarations) {
      const list = byProperty.get(declaration.property) ?? [];
      list.push({ pair, declaration });
      byProperty.set(declaration.property, list);
    }
  }

  const conflicts = [];

  for (const [property, entries] of byProperty) {
    for (let left = 0; left < entries.length; left += 1) {
      for (let right = left + 1; right < entries.length; right += 1) {
        const a = entries[left].pair;
        const b = entries[right].pair;

        // Two branches of one rule are written at the same position and stay
        // together, so there is no order between them to change.
        if (a.before.order === b.before.order) continue;
        if (a.after.order === b.after.order) continue;

        const firstBefore = a.before.order < b.before.order ? a : b;
        const secondBefore = firstBefore === a ? b : a;

        // The later rule wins the tie, before and after the move. The move is
        // only a conflict when that winner changed.
        const winnerAfter = firstBefore.after.order > secondBefore.after.order ? firstBefore : secondBefore;
        if (winnerAfter === secondBefore) continue;

        const firstImportant = Boolean(firstBefore.before.properties.get(property));
        const secondImportant = Boolean(secondBefore.before.properties.get(property));
        if (firstImportant !== secondImportant) continue;
        if (firstBefore.before.specificity !== secondBefore.before.specificity) continue;
        if (!mediaConditionsOverlap(firstBefore.before.media, secondBefore.before.media)) continue;
        if (attributeScopesDisjoint(firstBefore.before.selector, secondBefore.before.selector)) continue;
        if (routeScopesDisjoint(firstBefore.before.selector, secondBefore.before.selector, routes)) continue;

        const subject = classifySubjects(firstBefore.before, secondBefore.before);
        conflicts.push({
          property,
          important: firstImportant,
          specificity: firstBefore.before.specificity,
          rank: subject.rank,
          beforeFirst: {
            selector: firstBefore.before.selector,
            file: firstBefore.before.file,
            order: firstBefore.before.order,
            declarations: firstBefore.before.declarations,
          },
          beforeSecond: {
            selector: secondBefore.before.selector,
            file: secondBefore.before.file,
            order: secondBefore.before.order,
            declarations: secondBefore.before.declarations,
          },
          afterFirst: { selector: firstBefore.after.selector, file: firstBefore.after.file, order: firstBefore.after.order },
          afterSecond: { selector: secondBefore.after.selector, file: secondBefore.after.file, order: secondBefore.after.order },
          sharedSubjectClasses: subject.sharedClasses,
          sharedSubjectElement: subject.sharedElement,
          likelySameElement: subject.likelySameElement,
        });
      }
    }
  }

  // Strongest sign of a real dependency first, so a review reads the pairs that
  // probably do match before the ones that probably cannot. The order is a
  // reading order and nothing else: every conflict stays in the list.
  conflicts.sort(
    (left, right) =>
      left.rank - right.rank
      || left.property.localeCompare(right.property)
      || left.beforeFirst.selector.localeCompare(right.beforeFirst.selector)
      || left.beforeSecond.selector.localeCompare(right.beforeSecond.selector),
  );

  return { conflicts, added, removed, beforeUnits, afterUnits };
}

/**
 * The counts a move is argued from, and the verdict itself.
 *
 * `proven` is the whole answer: a move preserves the cascade only when no rule
 * was added or removed and no pair's order change can be decided by the tie.
 * Nothing is excluded from that count, so a caller can print this line and be
 * telling the truth.
 */
export function summarizeRuleOrder(result) {
  const conflicts = result.conflicts ?? [];
  const likely = conflicts.filter((conflict) => conflict.likelySameElement);

  return {
    rules: (result.beforeUnits ?? []).length,
    rulesAfter: (result.afterUnits ?? []).length,
    added: (result.added ?? []).length,
    removed: (result.removed ?? []).length,
    conflicts: conflicts.length,
    likelyConflicts: likely.length,
    proven:
      conflicts.length === 0
      && (result.added ?? []).length === 0
      && (result.removed ?? []).length === 0,
  };
}

/** One line stating what the move is proven of, or what it left undecided. */
export function describeRuleOrderSummary(summary) {
  const moved = `${summary.rules} rules -> ${summary.rulesAfter}`;

  if (summary.proven) {
    return `${moved}: order preserved, no cascade decision changes.`;
  }

  const parts = [moved];
  if (summary.added) parts.push(`${summary.added} added`);
  if (summary.removed) parts.push(`${summary.removed} removed`);
  if (summary.conflicts) {
    parts.push(
      `${summary.conflicts} order-decidable pair(s) flipped, ${summary.likelyConflicts} with subjects that can be one element`,
    );
  }

  return `${parts.join("; ")}.`;
}

function formatSpecificity(score) {
  const ids = Math.floor(score / 10000);
  const classes = Math.floor((score % 10000) / 100);
  const elements = score % 100;
  return `(${ids},${classes},${elements})`;
}

/** One sentence a person can act on, naming the property the tie decides. */
export function describeRuleOrderConflict(conflict) {
  const first = conflict.beforeFirst;
  const second = conflict.beforeSecond;
  return `\`${conflict.property}\` at specificity ${formatSpecificity(conflict.specificity)}: \`${second.selector}\` used to load after \`${first.selector}\`, so it won the tie; after the move \`${first.selector}\` loads after \`${second.selector}\` and wins instead.`;
}

/**
 * The conflict sentences a gate or a reviewer should see.
 *
 * Every conflict is listed by default, because dropping the ones whose subjects
 * look unrelated would let the check call a move proven while the cascade still
 * changed for an element carrying both classes. `scope` narrows the *list* for
 * triage and never feeds the verdict: a reviewer reading `likely` has read the
 * top of the stack, not the whole of it.
 */
export function orderEquivalenceFailure(result, { scope = "all" } = {}) {
  const failures = [];

  for (const unit of result.removed ?? []) {
    failures.push(`Rule removed by the move: \`${unit.selector}\` in ${unit.file ?? "(inline)"}.`);
  }

  for (const unit of result.added ?? []) {
    failures.push(`Rule added by the move: \`${unit.selector}\` in ${unit.file ?? "(inline)"}.`);
  }

  for (const conflict of result.conflicts ?? []) {
    if (scope === "likely" && !conflict.likelySameElement) continue;
    failures.push(describeRuleOrderConflict(conflict));
  }

  return failures;
}
