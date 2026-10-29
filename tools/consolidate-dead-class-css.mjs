import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createDeadSelectorTests, parseRules, partitionSelectorBranches, relativePath, stripEmptyConditionalBlocks, styleSheetFiles } from "./lib/dead-css.mjs";
import { ROUTE_STYLESHEETS } from "./lib/route-stylesheets.mjs";

// Phase 8 pass 3: remove class-scoped CSS rules whose class tokens are not
// referenced anywhere in shipped markup, tests or tooling. Rules are parsed
// with brace awareness; comments are preserved so marker comments that other
// checks rely on survive.
//
// Tokens assembled at runtime (`wm-polish-${accent}`, `tier--${tone}`) never
// appear literally. The fragment is evidence only where source builds a class
// with it — inside `className=`/`class=`/`classList`, or a declaration or
// function named for classes — right before a `${` or before a `+`. A prefix
// that is merely mentioned elsewhere (a regex, a comment, a DOM id, a download
// filename) is not assembly and keeps nothing.
//
// Usage:
//   node tools/consolidate-dead-class-css.mjs                 # report current files
//   node tools/consolidate-dead-class-css.mjs --apply         # rewrite current files
//   node tools/consolidate-dead-class-css.mjs --all --apply   # every stylesheet the gate scans
//   node tools/consolidate-dead-class-css.mjs --from-head --apply
//     Rebuild every pruned stylesheet from HEAD with the current rules, keeping
//     any import lines added in the working tree.
//
// A dead comma branch inside an otherwise live list is split out rather than
// leaving the whole rule untouched: `.wm-btn, .wm-button {}` becomes
// `.wm-button {}` once `.wm-btn` is gone from markup. Splitting keeps the
// live declaration block byte-for-byte, so no rendered element changes.
//
// The default TARGETS list is the historical pass. `--all` covers the same
// discovery as `check:dead-css`, so the gate's baseline can be drained without
// maintaining a second file list by hand.

const root = process.cwd();
const stylesDir = path.join(root, "src", "wingman2", "styles");
const APPLY = process.argv.includes("--apply");
const FROM_HEAD = process.argv.includes("--from-head");
const ALL = process.argv.includes("--all");
const { isDeadBranch } = createDeadSelectorTests(root);

// Files this pass owns. wingman-videowall.css is route-owned and excluded.
// The route overrides are the shared remainder plus one page file per route, so
// the list comes from the shared module rather than naming the remainder only; a
// page that gains a file in a later tranche is picked up without an edit here.
const TARGETS = [
  "wingman-layer-components.css",
  "wingman-layer-layout.css",
  "wingman-layer-reset.css",
  "wingman-polish-navigation.css",
  "wingman-reference-global.css",
  "wingman-reference-theme.css",
  ...ROUTE_STYLESHEETS,
  "wingman-workflow-theme.css",
];
const FILES = ALL
  ? styleSheetFiles(root).map((file) => relativePath(root, file))
  : TARGETS.map((name) => relativePath(root, path.join(stylesDir, name)));

let removedTotal = 0;
const removedTokens = new Set();
for (const relative of FILES) {
  const file = path.join(root, relative);
  if (!fs.existsSync(file)) continue;
  const current = fs.readFileSync(file, "utf8");
  const base = FROM_HEAD
    ? execFileSync("git", ["show", `HEAD:${relative}`], { cwd: root, encoding: "utf8" })
    : current;
  const imports = (FROM_HEAD ? current : "").match(/^@import[^\n]*$/gm) ?? [];
  const removals = [];
  const splits = [];
  for (const rule of parseRules(base)) {
    const branches = partitionSelectorBranches(rule.selector, isDeadBranch);
    if (branches.dead.length === 0) continue;
    if (branches.live.length === 0) removals.push(rule);
    else splits.push({ rule, selector: branches.live.join(", "), dead: branches.dead });
  }
  const removedText = [
    ...removals.map((rule) => base.slice(rule.contentStart, rule.deleteEnd)),
    ...splits.flatMap((split) => split.dead),
  ];
  const bytes = removedText.reduce((total, text) => total + Buffer.byteLength(text), 0);
  removedTotal += bytes;
  for (const text of removedText) {
    for (const match of text.matchAll(/\.(-?[_a-zA-Z][_a-zA-Z0-9-]*)/g)) removedTokens.add(match[1]);
  }
  const edits = [
    ...removals.map((rule) => ({ start: rule.contentStart, end: rule.deleteEnd, text: "" })),
    ...splits.map((split) => ({ start: split.rule.selectorStart, end: split.rule.selectorEnd, text: split.selector })),
  ].sort((left, right) => right.start - left.start);
  let next = base;
  for (const edit of edits) next = next.slice(0, edit.start) + edit.text + next.slice(edit.end);
  next = stripEmptyConditionalBlocks(next);
  for (const line of imports) {
    if (!next.includes(line)) next = `${line}\n${next}`;
  }
  if (removals.length === 0 && splits.length === 0 && ALL && next === base) continue;
  console.log(`${relative}: ${removals.length} dead rules, ${splits.length} dead branches split, ${(bytes / 1024).toFixed(1)} KB source`);
  if (!APPLY) continue;
  if (next !== current) fs.writeFileSync(file, next);
}
fs.mkdirSync(path.join(root, "reports"), { recursive: true });
fs.writeFileSync(path.join(root, "reports", "removed-rule-tokens.txt"), `${[...removedTokens].sort().join("\n")}\n`);
console.log(`Total removable source bytes: ${(removedTotal / 1024).toFixed(1)} KB${APPLY ? " (applied)" : " (report only)"}`);
