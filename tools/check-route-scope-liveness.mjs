#!/usr/bin/env node
/**
 * Every route-scoped selector must name a value a page writes.
 *
 * `tools/lib/route-scope-liveness.mjs` holds the reading; this script is the gate
 * that runs it over the governed stylesheet stack and holds the tree to
 * `tools/wingman-route-scope-liveness-baseline.json`.
 *
 * The failure this guards against is quiet in both directions. A selector scoped
 * to a route value nothing writes matches nothing: no page renders it, no test
 * that renders a page reaches it, and the dead-CSS gate does not see it either —
 * the `.wm-route-<segment>` family is assembled at runtime, so every member of it
 * is exempt from the class reading, and an attribute selector is not a class at
 * all. What is left is a rule nobody can find and everybody trusts, which is why
 * the check is a verify stage rather than a report.
 *
 * The second quiet direction is the vocabulary mix-up: because both spellings
 * look like a route name, a tool that counts "route values" as one set admits
 * `data-wingman-route="call-coach"` as live (it is a segment) and
 * `.wm-route-callCoach` as live (it is a key), and then the gate reports every
 * scope as live forever. The lib derives each set from its own writer for that
 * reason, and the spec beside it pins the crossing in both directions.
 *
 * Usage: node tools/check-route-scope-liveness.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ROUTE_SCOPE_BASELINE_FILE,
  describeRouteScopeReport,
  describeRouteScopeValues,
  routeScopeBaselineFailure,
  routeScopeReport,
} from "./lib/route-scope-liveness.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

const baselinePath = path.join(root, ROUTE_SCOPE_BASELINE_FILE);
let baseline = null;
try {
  baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
} catch (error) {
  failures.push(
    `The route-scope baseline could not be read at ${ROUTE_SCOPE_BASELINE_FILE}: ${error.message}. `
    + "Without it the reading has no reviewed list, and an empty one would pass by looking at nothing.",
  );
}

const report = routeScopeReport({ root });

console.log(`[route-scope] ${describeRouteScopeReport(report)}`);
for (const line of describeRouteScopeValues(report)) console.log(`[route-scope]   ${line}`);

// A parser that stopped finding route scopes would report a clean tree, and the
// two sets it compares against would be the only evidence that it read anything.
if (report.totals.rules === 0 || report.totals.scoped === 0) {
  failures.push(
    `The reading found ${report.totals.rules} rule(s) and ${report.totals.scoped} route-scoped rule(s) in `
    + `${report.totals.files} stylesheet(s). A green run has to have read the scopes it is judging, so this is the reading failing rather than the tree passing.`,
  );
}

if (report.totals.attributeValues === 0 || report.totals.classSegments === 0) {
  failures.push(
    `The route writers produced ${report.totals.attributeValues} attribute value(s) and ${report.totals.classSegments} class segment(s). `
    + "Either set arriving empty turns its whole vocabulary into dead scopes, so the sources have to be read rather than assumed.",
  );
}

if (baseline) {
  failures.push(...routeScopeBaselineFailure(report, baseline));
}

if (failures.length > 0) {
  console.error("\n[route-scope] a route scope names a value nothing writes:");
  for (const failure of failures) console.error(`  - ${failure}`);
  console.error(
    "\n[route-scope] fix the scope (name the value the page actually sets, or delete the dead rules), "
    + `or record the decision in ${ROUTE_SCOPE_BASELINE_FILE} with the count and the reason it is kept.`,
  );
  process.exit(1);
}

console.log(
  `[route-scope] nothing unreviewed: ${report.totals.attributeValues} attribute values and ${report.totals.classSegments} class segments are what the shell writes, `
  + `${report.totals.deadValues} value(s) nothing writes is pinned in ${ROUTE_SCOPE_BASELINE_FILE} across ${report.totals.deadRules} rule(s), `
  + `leaving ${report.totals.scoped - report.totals.deadRules} rule(s) matching a route a page can reach.`,
);
