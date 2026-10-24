import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  corpusFiles,
  createDeadSelectorTests,
  deadSelectorEntries,
  relativePath,
  styleSheetFiles,
} from "./lib/dead-css.mjs";

/**
 * Dead-class triage report.
 *
 * The gate answers one question ("can this selector ever match?") and the
 * pruner acts on the answer, but a cleanup still has to decide whether a dead
 * family is really gone or merely assembled somewhere the detector cannot see.
 * Doing that by hand meant ad-hoc grep scripts whose guesses drifted from the
 * rule — the same drift that once kept every `vw-` rule alive on one regex.
 *
 * This report reads the rule itself (`tools/lib/dead-css.mjs`) and prints, per
 * dead family, the rule text that is dead and the two kinds of evidence behind
 * it:
 *
 * - `assembled`: a literal in a class-bearing position that the detector treats
 *   as a runtime fragment — the only thing that keeps a family alive;
 * - `mentions`: other places the prefix appears in source (a regex, a DOM id, a
 *   download filename, a comment), which the rule deliberately does not count.
 *
 * A family with no evidence at all is safe to delete. One with mentions gets a
 * `review` verdict: the reader sees the places the detector refused and can
 * confirm no class builder hides there. The report never blocks anything; it is
 * input to `npm run audit:dead-css:deletions`.
 *
 * Usage:
 *   npm run report:dead-css-triage
 *   node tools/report-dead-css-triage.mjs --out=reports
 *
 * Output: `reports/dead-css-triage.md` (readable) and `.json` (the same data),
 * both under the gitignored `reports/` directory.
 */

const codeToken = /[A-Za-z_][A-Za-z0-9_-]{2,}/g;
/** How many evidence lines one family prints before it summarises the rest. */
const MAX_EVIDENCE_LINES = 12;

/**
 * The family a class name belongs to: the text up to and including its first
 * hyphen, so `vw-builder-note` is filed under `vw-`. A name with no hyphen is
 * its own family.
 */
export function classFamily(className) {
  const hyphen = className.indexOf("-");
  return hyphen === -1 ? className : className.slice(0, hyphen + 1);
}

/** A byte count a reader can compare at a glance. */
export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

/**
 * The prefixes worth grepping for: each dead class's *longest* hyphen prefix,
 * so `wm-projects-old-tab` is probed at `wm-projects-old-`. A shorter prefix
 * (`wm-projects-`) is the family of every live sibling, so grepping it would
 * bury the one place that could build this name under hundreds that could not.
 * A name with no hyphen left after the family key is probed nowhere: source
 * naming it exactly would have made it live.
 */
export function deadNamePrefixes(familyKey, classes) {
  const prefixes = new Set();
  for (const name of classes) {
    let longest = null;
    for (let hyphen = name.indexOf("-"); hyphen !== -1; hyphen = name.indexOf("-", hyphen + 1)) {
      const prefix = name.slice(0, hyphen + 1);
      if (prefix.length > familyKey.length && prefix !== name) longest = prefix;
    }
    if (longest) prefixes.add(longest);
  }
  return [...prefixes].sort();
}

/**
 * Every place one of those prefixes appears in source, with the first line each
 * token is seen on per file. These are mentions, not assembly: the report prints
 * them so a human can check the places the detector rejected.
 */
export function collectFamilyMentions(root, prefixesByFamily) {
  const byFamily = new Map([...prefixesByFamily.keys()].map((family) => [family, []]));
  const families = [...prefixesByFamily.entries()].filter(([, prefixes]) => prefixes.length > 0);
  if (families.length === 0) return byFamily;
  const seen = new Set();
  for (const full of corpusFiles(root)) {
    const text = fs.readFileSync(full, "utf8");
    if (!families.some(([, prefixes]) => prefixes.some((prefix) => text.includes(prefix)))) continue;
    const file = relativePath(root, full);
    text.split("\n").forEach((line, index) => {
      for (const match of line.matchAll(codeToken)) {
        const token = match[0];
        for (const [family, prefixes] of families) {
          if (!prefixes.some((prefix) => token.startsWith(prefix))) continue;
          const key = `${family}\u0000${token}\u0000${file}`;
          if (seen.has(key)) continue;
          seen.add(key);
          byFamily.get(family).push({ token, file, line: index + 1, text: line.trim().slice(0, 160) });
        }
      }
    });
  }
  return byFamily;
}

/**
 * The triage data: one entry per dead family, with the dead rules filed under it
 * and the evidence the gate saw. No files are written.
 */
export function buildDeadCssTriage({ root = process.cwd() } = {}) {
  // One corpus scan answers both questions: which rules can never match, and
  // which class fragments source actually assembles.
  const fragments = [];
  const tests = createDeadSelectorTests(root, { onFragment: (evidence) => fragments.push(evidence) });
  const dead = styleSheetFiles(root).flatMap((file) =>
    deadSelectorEntries(fs.readFileSync(file, "utf8"), relativePath(root, file), tests.isDeadBranch),
  );
  const { deadClassEvidence } = tests;

  // The gate counts a selector once per file however many rules repeat it, so
  // the report uses the same unit; repeated rules add up to the text they would
  // free rather than repeating a row nobody reads twice.
  const unique = new Map();
  for (const entry of dead) {
    const key = `${entry.file}\u0000${entry.selector}`;
    const existing = unique.get(key);
    if (existing) existing.bytes += entry.bytes;
    else unique.set(key, { ...entry });
  }

  const families = new Map();
  for (const entry of unique.values()) {
    // Only the classes in a branch that can never match are "dead"; a live
    // sibling branch keeps its own tokens alive, so it names no family here.
    const classes = [...new Set(deadClassEvidence(entry.selector).flatMap((branch) => branch.unusedClasses))];
    if (classes.length === 0) continue;
    const key = classFamily(classes[0]);
    if (!families.has(key)) families.set(key, { key, selectors: [], bytes: 0, classes: new Set() });
    const family = families.get(key);
    family.selectors.push({ file: entry.file, selector: entry.selector, bytes: entry.bytes, classes });
    family.bytes += entry.bytes;
    classes.forEach((name) => family.classes.add(name));
  }

  const mentions = collectFamilyMentions(
    root,
    new Map([...families.values()].map((family) => [family.key, deadNamePrefixes(family.key, [...family.classes])])),
  );

  const report = [...families.values()].map((family) => {
    // One line per assembled shape: a family built in five places reads the same
    // as one built once, which is the length of the shadow, not the file count.
    const assembled = new Map();
    fragments
      .filter((evidence) => evidence.fragment.startsWith(family.key))
      .sort((left, right) => left.file.localeCompare(right.file) || left.line - right.line)
      .forEach((evidence) => {
        const seen = assembled.get(evidence.fragment);
        if (seen) seen.count += 1;
        else assembled.set(evidence.fragment, { ...evidence, count: 1 });
      });
    const assemblies = [...assembled.values()];
    // Nearest first: a token that starts with a dead name (its BEM child or a
    // suffixed variant) is the thing to re-read; a token that merely shares the
    // prefix is context, and the cap should not spend its lines on context.
    const names = [...family.classes].sort((left, right) => right.length - left.length);
    const closeness = (entry) => (names.some((name) => entry.token.startsWith(name)) ? 0 : 1);
    const found = mentions.get(family.key) ?? [];
    return {
      key: family.key,
      // A family nothing builds and nothing mentions is the safe case; anything
      // else is where a reader has to look before deleting.
      verdict: assemblies.length || found.length ? "review" : "prune",
      selectors: family.selectors.sort((left, right) => left.file.localeCompare(right.file) || left.selector.localeCompare(right.selector)),
      selectorCount: family.selectors.length,
      bytes: family.bytes,
      classes: [...family.classes].sort(),
      assemblies: assemblies.sort((left, right) => left.file.localeCompare(right.file) || left.line - right.line),
      mentions: found.sort((left, right) => closeness(left) - closeness(right)
        || left.file.localeCompare(right.file)
        || left.line - right.line),
    };
  }).sort((left, right) => right.selectorCount - left.selectorCount || left.key.localeCompare(right.key));

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      selectors: unique.size,
      families: report.length,
      bytes: [...unique.values()].reduce((sum, entry) => sum + entry.bytes, 0),
      review: report.filter((family) => family.verdict === "review").length,
    },
    families: report,
  };
}

/** Wrap text in inline code, choosing a fence the text cannot close early. */
function code(text) {
  const fence = text.includes("`") ? "``" : "`";
  return `${fence}${text}${fence}`;
}

function evidenceLine(entry) {
  return `- ${code(`${entry.file}:${entry.line}`)} — ${code(entry.text)}`;
}

/** A table cell: a selector may carry a pipe, which would end the row early. */
function cell(text) {
  return code(text).replace(/\|/g, "\\|");
}

function familySection(family) {
  const lines = [];
  const heading = family.verdict === "prune" ? "safe to remove" : "review before removing";
  lines.push(`## ${code(family.key)} — ${family.selectorCount} selector${family.selectorCount === 1 ? "" : "s"}, ${formatBytes(family.bytes)} — ${heading}`, "");
  lines.push("| File | Selector | Bytes |", "| --- | --- | --- |");
  family.selectors.forEach((entry) => {
    lines.push(`| ${cell(entry.file)} | ${cell(entry.selector)} | ${formatBytes(entry.bytes)} |`);
  });
  lines.push("");

  if (family.assemblies.length) {
    lines.push("**Assembled at** — the detector keeps these shapes alive, so the rules above are different names in the same family:", "");
    family.assemblies.slice(0, MAX_EVIDENCE_LINES).forEach((entry) => {
      lines.push(`${evidenceLine(entry)} (fragment ${code(entry.fragment)}, ${entry.count} place${entry.count === 1 ? "" : "s"})`);
    });
    if (family.assemblies.length > MAX_EVIDENCE_LINES) {
      lines.push(`- …and ${family.assemblies.length - MAX_EVIDENCE_LINES} more.`);
    }
    lines.push("");
  } else {
    lines.push("**Assembled at** — nothing in source builds a class with this family.", "");
  }

  if (family.mentions.length) {
    lines.push("**Prefix mentioned, not assembled** — a regex, id, filename or comment here keeps no rule alive, but it is what to re-read before deleting:", "");
    family.mentions.slice(0, MAX_EVIDENCE_LINES).forEach((entry) => {
      lines.push(`${evidenceLine(entry)} (${code(entry.token)})`);
    });
    if (family.mentions.length > MAX_EVIDENCE_LINES) {
      lines.push(`- …and ${family.mentions.length - MAX_EVIDENCE_LINES} more mention${family.mentions.length - MAX_EVIDENCE_LINES === 1 ? "" : "s"} (see the JSON).`);
    }
    lines.push("");
  } else {
    lines.push("**Prefix mentioned, not assembled** — nothing in source mentions it.", "");
  }

  return lines.join("\n");
}

/** The readable report, in the order a cleanup works through it. */
export function renderDeadCssTriageMarkdown(triage) {
  const { totals } = triage;
  const lines = [
    "# Dead CSS triage",
    "",
    "Every selector in `src/wingman2` that cannot match shipped markup, filed under the class family it is named by, with the evidence the gate used.",
    "",
    "A family is the text up to a class name's first hyphen (`vw-`, `compare-`); a name without one is its own family. A selector is filed under its first dead class and lists the rest in the JSON. Only a class-bearing position — a `className=`, a `classList` call, or a builder named for the classes it returns — assembles a family; a mention in a regex, a DOM id, a download filename or a comment keeps nothing alive, which is exactly what a cleanup has to confirm before deleting. Mentions are searched at each dead name's longest prefix (`wm-projects-old-`), not at the family key, so a live sibling does not fill the list.",
    "",
    "- `npm run autofix:dead-css` splits a mixed selector list and keeps its live branch.",
    "- `npm run audit:dead-css:deletions` writes the patch that removes fully dead rules; `npm run apply:dead-css:deletions` applies it.",
    "- `npm run check:dead-css` is the gate: it fails on a new unmatchable selector.",
    "",
    totals.selectors === 0
      ? "No unmatchable selectors: nothing to triage."
      : `${totals.selectors} dead selector${totals.selectors === 1 ? "" : "s"} in ${totals.families} famil${totals.families === 1 ? "y" : "ies"} (${formatBytes(totals.bytes)}); ${totals.review} need a look before removal.`,
    "",
  ];
  triage.families.forEach((family) => {
    lines.push(familySection(family));
  });
  return `${lines.join("\n").trimEnd()}\n`;
}

/**
 * Write the triage report. Always succeeds: it reports, it does not gate, so a
 * cleanup can run it on a tree whose gate is already failing.
 */
export function runDeadCssTriage({ root = process.cwd(), outDir = "reports", log = console.log } = {}) {
  const triage = buildDeadCssTriage({ root });
  const directory = path.join(root, outDir);
  fs.mkdirSync(directory, { recursive: true });
  const markdownPath = path.join(directory, "dead-css-triage.md");
  const jsonPath = path.join(directory, "dead-css-triage.json");
  fs.writeFileSync(markdownPath, renderDeadCssTriageMarkdown(triage));
  fs.writeFileSync(jsonPath, `${JSON.stringify(triage, null, 2)}\n`);

  if (triage.totals.selectors === 0) {
    log("[dead-css-triage] No unmatchable selectors: nothing to triage.");
  } else {
    log(`[dead-css-triage] ${triage.totals.selectors} dead selector${triage.totals.selectors === 1 ? "" : "s"} in ${triage.totals.families} famil${triage.totals.families === 1 ? "y" : "ies"} (${formatBytes(triage.totals.bytes)}).`);
    triage.families.forEach((family) => {
      log(`[dead-css-triage] ${family.verdict.padEnd(6)} ${family.key} — ${family.selectorCount} selector${family.selectorCount === 1 ? "" : "s"}, ${family.assemblies.length} assembled, ${family.mentions.length} mention${family.mentions.length === 1 ? "" : "s"}`);
    });
  }
  log(`[dead-css-triage] Report: ${relativePath(root, markdownPath)} and ${relativePath(root, jsonPath)}`);
  return 0;
}

function parseArgs(argv) {
  const options = { outDir: "reports" };
  for (const argument of argv) {
    if (argument.startsWith("--out=")) options.outDir = argument.slice("--out=".length);
  }
  return options;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(runDeadCssTriage(parseArgs(process.argv.slice(2))));
}
