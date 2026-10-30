#!/usr/bin/env node
/**
 * The route-stylesheet split has to answer for itself.
 *
 * `tools/lib/style-order-equivalence.mjs` can prove a move harmless or name the
 * pairs it re-decides. This gate runs it over the split that exists — each page's
 * own stylesheet against the rules the shared file still holds for that page —
 * and requires the run to come back with either a proven verdict or a ranked
 * list whose pairs a person has read.
 *
 * The reviewed list is `tools/wingman-route-stylesheet-order-baseline.json`:
 * the pairs whose subjects share a token are written out one by one with the
 * reason the page's copy should win, and the rest are pinned as a count per
 * route, because the equivalence lib is right that two subjects sharing nothing
 * can still be one element and nobody can read four hundred of those. Both are
 * ratchets: an unreviewed pair, a reviewed pair that stopped occurring, and a
 * count that moved in either direction all fail.
 *
 * Two readings this gate depends on are checked rather than assumed:
 *
 *   - the shared file loads before the page files, which is the direction the
 *     comparison calls "after the split". If the import order inverted, the
 *     reading would compare the opposite move and the baseline would be arguing
 *     about pairs the app no longer makes;
 *   - both arrangements hold the same rules, so a rule can only be re-decided,
 *     never silently added or dropped. A count that disagrees with that would
 *     mean the two readings saw different text, and the verdict would be about
 *     a move nobody made.
 *
 * Usage: node tools/check-route-stylesheet-order.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ROUTE_ORDER_BASELINE_FILE,
  describeRouteOrderPages,
  describeRouteOrderReport,
  routeOrderBaselineFailure,
  routeStylesheetOrderReport,
} from "./lib/route-stylesheet-order.mjs";
import { LEGACY_ROUTE_OVERRIDES, ROUTE_PAGE_STYLESHEETS, ROUTE_STYLESHEETS } from "./lib/route-stylesheets.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

const sharedIndex = ROUTE_STYLESHEETS.indexOf(LEGACY_ROUTE_OVERRIDES);
if (sharedIndex !== 0) {
  failures.push(
    `\`${LEGACY_ROUTE_OVERRIDES}\` does not load before the page stylesheets (position ${sharedIndex} in ${ROUTE_STYLESHEETS.length}). `
    + "This reading compares the page files loading after the shared remainder, so the order it is given has to be the one the app loads.",
  );
}

for (const page of ROUTE_PAGE_STYLESHEETS) {
  const position = ROUTE_STYLESHEETS.indexOf(page.file);
  if (position <= sharedIndex) {
    failures.push(`\`${page.file}\` does not load after \`${LEGACY_ROUTE_OVERRIDES}\`, so the move this gate reads is not the move the app makes.`);
  }
}

const baselinePath = path.join(root, ROUTE_ORDER_BASELINE_FILE);
let baseline = null;
try {
  baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
} catch (error) {
  failures.push(
    `The route-stylesheet order baseline could not be read at ${ROUTE_ORDER_BASELINE_FILE}: ${error.message}. `
    + "Without it the split has no reviewed list, and an empty one would pass by looking at nothing.",
  );
}

const report = routeStylesheetOrderReport({ root });

console.log(`[route-order] ${describeRouteOrderReport(report)}`);
for (const line of describeRouteOrderPages(report)) console.log(`[route-order]   ${line}`);

if (report.totals.added > 0 || report.totals.removed > 0) {
  failures.push(
    `The two arrangements disagree about the rules: ${report.totals.added} added and ${report.totals.removed} removed across the pages. `
    + "The page files and the shared remainder are the same rules in a different order, so a count here means the reading saw different text and the verdict is about a move nobody made.",
  );
}

if (baseline) {
  failures.push(...routeOrderBaselineFailure(report, baseline));
}

if (failures.length > 0) {
  console.error("\n[route-order] the split is not answered for:");
  for (const failure of failures) console.error(`  - ${failure}`);
  console.error(
    "\n[route-order] the pairs are ranked by how likely the two subjects are one element. "
    + "A pair may be fixed (stop the move, or move the tie with it) or reviewed and added to the baseline with its reason.",
  );
  process.exit(1);
}

console.log(
  `[route-order] every re-decided pair is reviewed: ${report.totals.conflicts} pinned across ${report.totals.pages} page decisions, `
  + `${report.totals.likely} of them on a subject that can be one element.`,
);
