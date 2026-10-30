import fs from "node:fs";
import path from "node:path";
import { routeOrderPairKey, routeOrderPinnedKey } from "./route-stylesheet-order.mjs";

/**
 * The rendered-page half of the route-stylesheet order gate.
 *
 * The split reports pairs whose two selectors share no token, so nothing in the
 * text says whether they can be one element — the page says it. This module is
 * the one place that asks, so the settle tool (which writes the answer) and the
 * browser walk (which re-proves it on every run) cannot ask it two ways.
 *
 * The question is asked at two widths, because a page that mounts a region only
 * inside a breakpoint is exactly the case a single viewport would call settled.
 */

/** Two widths, because a route can mount a region only inside a breakpoint. */
export const ROUTE_ORDER_VIEWPORTS = [
  { width: 1366, height: 900 },
  { width: 390, height: 844 },
];

/**
 * Runs in the page. Each pair answers how many elements match both selectors;
 * an empty first selector is an answer — no element can match both if there is
 * no element matching one — while a selector the parser rejects is `unmatched`,
 * because that is a reading that failed rather than a pair that cannot meet.
 */
export function routeOrderPageReading(entries) {
  const query = (selector) => {
    try {
      return [...document.querySelectorAll(selector)];
    } catch {
      return null;
    }
  };
  return entries.map((entry) => {
    const first = query(entry.first);
    const second = query(entry.second);
    if (!first || !second) return { index: entry.index, both: 0, unmatched: true };
    let both = 0;
    for (const element of first) {
      try {
        if (element.matches(entry.second)) both += 1;
      } catch {
        return { index: entry.index, both: 0, unmatched: true };
      }
    }
    return { index: entry.index, both, unmatched: false };
  });
}

/** The manifest's route paths, keyed by the class-scope segment the report names. */
export function routeOrderPaths(projectRoot) {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(projectRoot, "src/wingman2/app/route-manifest.json"), "utf8"),
  );
  return new Map(manifest.map((route) => [String(route.segment), String(route.path)]));
}

/**
 * The occurrences a page's report asks about, against one page of the baseline.
 *
 * Keyed by position, because a repeated pair is a repeated occurrence: one
 * selector pair that meets twice is two lines in the reviewed list, and a map
 * keyed by identity would quietly settle only the first.
 */
export function routeOrderAnswers(conflictPairs) {
  return conflictPairs.map((conflict, index) => ({
    index,
    key: routeOrderPairKey(conflict),
    property: conflict.property,
    first: conflict.beforeFirst.selector,
    second: conflict.beforeSecond.selector,
    both: 0,
    unmatched: false,
  }));
}

/** Ask the page, at every width, and keep the widest answer each pair gave. */
export async function readRouteOrderAnswers(page, { url, answers }) {
  const held = answers.map((answer) => ({ ...answer, both: 0, unmatched: false }));
  for (const viewport of ROUTE_ORDER_VIEWPORTS) {
    await page.setViewportSize(viewport);
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    const readings = await page.evaluate(
      routeOrderPageReading,
      held.map((answer) => ({ index: answer.index, first: answer.first, second: answer.second })),
    );
    for (const reading of readings) {
      const answer = held.find((candidate) => candidate.index === reading.index);
      if (!answer) continue;
      answer.both = Math.max(answer.both, reading.both);
      answer.unmatched = answer.unmatched || reading.unmatched;
    }
  }
  return held;
}

/**
 * What the page says about the baseline, as failures.
 *
 * Three questions, and they are asked of different things. A recorded settlement
 * that now matches an element is a page that started mounting it, and the pair
 * has to come back as a decision. A settled entry the split no longer reports has
 * left the file's subject. And a pair nobody has answered for is named by what
 * the page proved it is — settleable, or a decision someone owes — rather than
 * waiting for the next CSS change to report it as an unreviewed line.
 */
export function routeOrderSettlementFailures({ report, baseline, readings }) {
  const failures = [];
  const byRoute = new Map((baseline.pages ?? []).map((entry) => [entry.route, entry]));

  for (const page of report.pages) {
    const disjoint = page.conflicts.filter((conflict) => conflict.rank > 1);
    if (!disjoint.length) continue;

    const entry = byRoute.get(page.route);
    const recorded = new Set((entry?.settled ?? []).map((pair) => pair.key));
    const pinned = new Set((entry?.pairs ?? []).map(routeOrderPinnedKey));
    const answers = readings?.[page.route] ?? [];

    for (const answer of answers) {
      const subject = `${answer.property} \`${answer.first}\` / \`${answer.second}\``;
      if (answer.unmatched) {
        failures.push(
          `The ${page.route} page could not be asked about ${subject}: a selector would not parse, `
          + "so the pair's reading is missing rather than settled.",
        );
        continue;
      }
      if (answer.both > 0) {
        if (recorded.has(answer.key)) {
          failures.push(
            `The route-stylesheet order baseline settled a pair on ${page.route} that now reaches one element: `
            + `${answer.both} element(s) match both \`${answer.first}\` and \`${answer.second}\` (${answer.property}). `
            + "A page that started mounting that element has to bring the pair back into `pairs` with a decision.",
          );
        } else if (!pinned.has(answer.key)) {
          failures.push(
            `The ${page.route} page makes a pair nobody has answered for: ${answer.both} element(s) match both `
            + `\`${answer.first}\` and \`${answer.second}\` (${answer.property}). It is a decision, so it belongs in `
            + "`pairs` with a reason rather than in `settled`.",
          );
        }
        continue;
      }
      if (!recorded.has(answer.key) && !pinned.has(answer.key)) {
        failures.push(
          `The ${page.route} page cannot make a pair one element and nobody has settled it: ${subject}. `
          + "Re-run `node tools/settle-route-order-pairs.mjs --write` so the reading is recorded with its evidence.",
        );
      }
    }

    for (const key of recorded) {
      if (disjoint.every((conflict) => routeOrderPairKey(conflict) !== key)) {
        failures.push(
          `The route-stylesheet order baseline settles a pair on ${page.route} that the split no longer reads (${key}). `
          + "A settled entry that stopped occurring has to leave the file.",
        );
      }
    }
  }

  return failures;
}

/** The one-line reading the walk and the settle tool both print. */
export function routeOrderSettlementClause({ report, readings }) {
  const settled = Object.values(readings ?? {})
    .flat()
    .filter((answer) => !answer.unmatched && answer.both === 0).length;
  const widths = ROUTE_ORDER_VIEWPORTS.map((viewport) => `${viewport.width}px`).join(" and ");
  return `${settled} of ${report.totals.subjectDisjoint} subject-disjoint occurrence(s) cannot be one element `
    + `on their route's page at ${widths}.`;
}
