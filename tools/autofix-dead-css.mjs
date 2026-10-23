import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { createInterface } from "node:readline/promises";
import {
  BASELINE_PATH,
  createDeadSelectorTests,
  normalizeSelector,
  parseRules,
  partitionSelectorBranches,
  relativePath,
  stripEmptyConditionalBlocks,
  styleSheetFiles,
} from "./lib/dead-css.mjs";
import { runDeadCssGate } from "./check-wingman-dead-css-baseline.mjs";

/**
 * Dead CSS autofix.
 *
 * Two decisions live here, and they are deliberately different:
 *
 * - Splitting a mixed selector list (`.wm-btn, .wm-button { … }` ->
 *   `.wm-button { … }`) is safe unattended: the live branch is copied
 *   byte-for-byte, so nothing that renders changes. `runDeadCssAutofix` does
 *   this in the pre-commit hook.
 * - Deleting a rule whose every branch is dead removes styling, so it is a
 *   proposal, never a silent fix. `writeDeletionProposal` records the removal
 *   as a unified diff (`reports/dead-css-proposal.diff`) and
 *   `applyDeadRuleDeletions` applies exactly that change, baseline entries
 *   included — refusing when the saved patch is missing or stale, so a rule
 *   is never deleted off an unreviewed list. The committer reads the diff
 *   first; the default autofix leaves fully dead rules alone.
 *
 * The baseline refresh in the split pass is deliberately narrow: entries whose
 * selector the split removed are dropped, and newly dead selectors are **not**
 * adopted. That keeps the pre-commit run from approving its own new debt — the
 * gate that follows still fails on a selector nobody has reviewed.
 *
 * Usage:
 *   node tools/autofix-dead-css.mjs                       # split, print summary
 *   node tools/autofix-dead-css.mjs --check               # report only
 *   node tools/autofix-dead-css.mjs --print-changed       # paths only, for the hook
 *   node tools/autofix-dead-css.mjs --propose-deletions   # write the review diff
 *   node tools/autofix-dead-css.mjs --accept-deletions    # apply that diff
 */

/** Where `--propose-deletions` parks the patch the committer reviews. */
export const DELETION_DIFF_PATH = "reports/dead-css-proposal.diff";
export const DELETION_REVIEW_PATH = "reports/dead-css-review.json";
const digest = (text) => createHash("sha256").update(text).digest("hex");

/** Split the dead branches out of every mixed selector list in `css`. */
export function splitDeadBranches(css, isDeadBranch) {
  const edits = [];
  const splits = [];
  for (const rule of parseRules(css)) {
    const { live, dead } = partitionSelectorBranches(rule.selector, isDeadBranch);
    if (dead.length === 0 || live.length === 0) continue;
    edits.push({ start: rule.selectorStart, end: rule.selectorEnd, text: live.join(", ") });
    splits.push({ selector: rule.selector, dead, kept: live });
  }
  let next = css;
  for (const edit of edits.sort((left, right) => right.start - left.start)) {
    next = next.slice(0, edit.start) + edit.text + next.slice(edit.end);
  }
  return { css: next, splits };
}

/**
 * The stylesheet without any rule whose every comma branch is dead, plus the
 * empty conditional blocks that removal leaves behind.
 */
export function removeDeadRules(css, isDeadSelector) {
  const rules = parseRules(css).filter((rule) => isDeadSelector(rule.selector, rule));
  if (rules.length === 0) return { css, removed: [] };
  let next = css;
  for (const rule of [...rules].sort((left, right) => right.contentStart - left.contentStart)) {
    next = next.slice(0, rule.contentStart) + next.slice(rule.deleteEnd);
  }
  return {
    css: stripEmptyConditionalBlocks(next),
    removed: rules.map((rule) => normalizeSelector(rule.selector)),
  };
}

/**
 * One unified diff with `a/` and `b/` prefixes, so the patch applies from the
 * repository root with `git apply reports/dead-css-proposal.diff` (`-p1`).
 */
function unifiedDiff(relative, before, after) {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "wingman-dead-css-"));
  try {
    for (const side of ["a", "b"]) {
      const target = path.join(workspace, side, relative);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, side === "a" ? before : after);
    }
    const args = [
      "-c", "diff.noprefix=false",
      "-c", "diff.mnemonicPrefix=false",
      "-c", "core.autocrlf=false",
      "diff", "--no-index", "--no-color", "--no-ext-diff",
      "--src-prefix=", "--dst-prefix=",
      `a/${relative}`, `b/${relative}`,
    ];
    try {
      return execFileSync("git", args, {
        cwd: workspace,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        maxBuffer: 32 * 1024 * 1024,
      });
    } catch (caught) {
      // `--no-index` reports "files differ" as exit 1, with the diff on stdout.
      // Anything else means the diff could not be produced at all.
      if (caught && caught.status === 1 && typeof caught.stdout === "string") return caught.stdout;
      throw caught;
    }
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
}

/**
 * Every fully dead rule, the stylesheet text without them, the baseline
 * allowances that deletion retires, and one unified diff covering the lot.
 * Nothing is written; the caller decides whether to save or apply it.
 */
export function collectDeadRuleProposal({ root = process.cwd(), acceptedIds = null } = {}) {
  const { isDeadSelector, deadClassEvidence } = createDeadSelectorTests(root);
  const files = [];
  const removed = [];
  const retiredKeys = new Set();

  for (const file of styleSheetFiles(root)) {
    const relative = relativePath(root, file);
    const before = fs.readFileSync(file, "utf8");
    const entries = [];
    const result = removeDeadRules(before, (selector, rule) => {
      if (!isDeadSelector(selector)) return false;
      const id = digest(`${relative}:${rule.selectorStart}:${selector}`).slice(0, 16);
      if (acceptedIds && !acceptedIds.includes(id)) return false;
      entries.push({ id, file: relative, selector: normalizeSelector(selector), evidence: deadClassEvidence(selector) });
      return true;
    });
    if (result.removed.length === 0) continue;
    files.push({
      file: relative,
      selectors: result.removed,
      before,
      after: result.css,
      bytes: Buffer.byteLength(before) - Buffer.byteLength(result.css),
    });
    for (const selector of result.removed) {
      if (!parseRules(result.css).some((rule) => normalizeSelector(rule.selector) === selector)) {
        retiredKeys.add(`${relative}::${selector}`);
      }
    }
    removed.push(...entries);
  }

  const baselinePath = path.join(root, BASELINE_PATH);
  const baselineBefore = fs.existsSync(baselinePath) ? fs.readFileSync(baselinePath, "utf8") : null;
  let baselineAfter = baselineBefore;
  let retired = [];
  if (baselineBefore !== null) {
    let parsed = null;
    try {
      parsed = JSON.parse(baselineBefore);
    } catch {
      // A broken baseline is the gate's problem, not the proposal's.
    }
    if (parsed && Array.isArray(parsed.deadSelectors)) {
      const isRetired = (entry) => retiredKeys.has(`${entry.file}::${entry.selector}`);
      retired = parsed.deadSelectors.filter(isRetired);
      if (retired.length > 0) {
        const kept = parsed.deadSelectors.filter((entry) => !isRetired(entry));
        baselineAfter = `${JSON.stringify({ ...parsed, deadSelectors: kept }, null, 2)}\n`;
      }
    }
  }

  const sections = files.map((file) => unifiedDiff(file.file, file.before, file.after));
  if (baselineBefore !== null && baselineAfter !== baselineBefore) {
    sections.push(unifiedDiff(relativePath(root, baselinePath), baselineBefore, baselineAfter));
  }

  return {
    files,
    removed,
    retired,
    diff: sections.length ? `${removed.map((entry) => `# Rule ${entry.id}: ${entry.file} ${entry.selector}\n${entry.evidence.map((evidence) => `# Branch ${evidence.branch}; unused classes: ${evidence.unusedClasses.join(", ")}`).join("\n")}`).join("\n")}\n${sections.join("")}` : "",
    baseline: { before: baselineBefore, after: baselineAfter },
    baselineChanged: baselineAfter !== baselineBefore,
  };
}

/**
 * Write the proposal diff so it can be read — and applied by hand — before
 * anything is deleted. A stale patch is removed when no rule qualifies.
 */
export function writeDeletionProposal({ root = process.cwd(), diffPath = DELETION_DIFF_PATH } = {}) {
  const proposal = collectDeadRuleProposal({ root });
  const absolute = path.join(root, diffPath);
  if (proposal.files.length === 0) {
    fs.rmSync(absolute, { force: true });
    fs.rmSync(path.join(root, DELETION_REVIEW_PATH), { force: true });
    return { ...proposal, diffPath };
  }
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, proposal.diff);
  fs.writeFileSync(path.join(root, DELETION_REVIEW_PATH), `${JSON.stringify({
    digest: digest(proposal.diff), acceptedIds: null, rules: proposal.removed,
  }, null, 2)}\n`);
  return { ...proposal, diffPath };
}

/** Save the accepted rules as the final patch without changing source files. */
export function selectDeletionRules({ root = process.cwd(), acceptedIds } = {}) {
  const full = collectDeadRuleProposal({ root });
  const reviewPath = path.join(root, DELETION_REVIEW_PATH);
  if (!fs.existsSync(reviewPath)) throw new Error("Generate a deletion proposal before selecting rules.");
  const review = JSON.parse(fs.readFileSync(reviewPath, "utf8"));
  if (review.digest !== digest(full.diff)) throw new Error("Proposal is stale; regenerate and review it.");
  const known = new Set(full.removed.map((entry) => entry.id));
  if (acceptedIds.some((id) => !known.has(id))) throw new Error("Unknown deletion rule id.");
  const selected = collectDeadRuleProposal({ root, acceptedIds });
  fs.writeFileSync(path.join(root, DELETION_DIFF_PATH), selected.diff);
  fs.writeFileSync(reviewPath, `${JSON.stringify({ ...review, acceptedIds }, null, 2)}\n`);
  return selected;
}

/**
 * Apply the reviewed proposal exactly as the diff shows it — stylesheets and
 * the baseline allowances for the deleted selectors — then re-run the gate so
 * the caller learns at once whether the tree is clean.
 *
 * Acceptance is tied to the written patch: refuse when there is no proposal to
 * review, and refuse when the tree moved on and the patch no longer matches
 * what would be deleted. Deletions never happen off an unreviewed list.
 */
export function applyDeadRuleDeletions({ root = process.cwd(), log = console.log, error = console.error } = {}) {
  const reviewPath = path.join(root, DELETION_REVIEW_PATH);
  const review = fs.existsSync(reviewPath) ? JSON.parse(fs.readFileSync(reviewPath, "utf8")) : null;
  const full = collectDeadRuleProposal({ root });
  if (review && review.digest !== digest(full.diff)) throw new Error(`${DELETION_DIFF_PATH} is older than the rules it would delete. Review the refreshed diff before accepting.`);
  const proposal = collectDeadRuleProposal({ root, acceptedIds: review?.acceptedIds ?? null });
  const proposalPath = path.join(root, DELETION_DIFF_PATH);

  if (proposal.files.length === 0) {
    // A patch that proposes nothing must not survive to be applied later.
    fs.rmSync(proposalPath, { force: true });
    return { ...proposal, changed: [], status: 0 };
  }

  const reviewed = fs.existsSync(proposalPath) ? fs.readFileSync(proposalPath, "utf8") : null;
  if (reviewed !== proposal.diff) {
    throw new Error(
      reviewed === null
        ? `No reviewed proposal at ${DELETION_DIFF_PATH}. Run \`npm run audit:dead-css:deletions\` first.`
        : `${DELETION_DIFF_PATH} is older than the rules it would delete. Review the refreshed diff before accepting.`,
    );
  }

  const changed = [];
  for (const file of proposal.files) {
    fs.writeFileSync(path.join(root, file.file), file.after);
    changed.push(file.file);
  }
  if (proposal.baselineChanged) {
    fs.writeFileSync(path.join(root, BASELINE_PATH), proposal.baseline.after);
    changed.push(relativePath(root, path.join(root, BASELINE_PATH)));
  }
  const status = runDeadCssGate({ root, log, error });
  return { ...proposal, changed, status };
}

/**
 * Run the split autofix over the stylesheets the dead-CSS gate scans.
 *
 * Returns the split branches, the files it rewrote (the hook stages exactly
 * these) and the gate's prune status. `write: false` reports without touching
 * the tree. Fully dead rules are reported by the gate and removed only through
 * `applyDeadRuleDeletions`.
 */
export function runDeadCssAutofix({ root = process.cwd(), write = true, log = console.log, error = console.error } = {}) {
  const { isDeadBranch } = createDeadSelectorTests(root);
  const splits = [];
  const changed = [];

  for (const file of styleSheetFiles(root)) {
    const css = fs.readFileSync(file, "utf8");
    const result = splitDeadBranches(css, isDeadBranch);
    if (result.splits.length === 0) continue;
    const relative = relativePath(root, file);
    splits.push(...result.splits.map((split) => ({ file: relative, ...split })));
    if (!write) continue;
    fs.writeFileSync(file, result.css);
    changed.push(relative);
  }

  const baselinePath = path.join(root, BASELINE_PATH);
  const before = fs.existsSync(baselinePath) ? fs.readFileSync(baselinePath, "utf8") : null;
  const status = write ? runDeadCssGate({ root, pruneStale: true, log, error }) : 0;
  const after = fs.existsSync(baselinePath) ? fs.readFileSync(baselinePath, "utf8") : null;
  if (before !== after && before !== null) changed.push(relativePath(root, baselinePath));

  return { status, splits, changed, baselineChanged: before !== after };
}

function parseArgs(argv) {
  return {
    check: argv.includes("--check"),
    printChanged: argv.includes("--print-changed"),
    proposeDeletions: argv.includes("--propose-deletions"),
    acceptDeletions: argv.includes("--accept-deletions"),
    reviewDeletions: argv.includes("--review-deletions"),
    selectedIds: argv.find((arg) => arg.startsWith("--select-deletions="))?.slice("--select-deletions=".length).split(",").filter(Boolean),
  };
}

function plural(count, singular, pluralForm = `${singular}s`) {
  return count === 1 ? singular : pluralForm;
}

function runDeletionMode(options, human) {
  if (options.proposeDeletions && options.acceptDeletions) {
    console.error("[dead-css-autofix] Choose --propose-deletions or --accept-deletions, not both.");
    return 1;
  }

  if (options.acceptDeletions) {
    const result = applyDeadRuleDeletions({ root: process.cwd(), log: human, error: console.error });
    const fileCount = new Set(result.files.map((file) => file.file)).size;
    human(
      `[dead-css-autofix] Removed ${result.removed.length} fully dead ${plural(result.removed.length, "rule")} from ${fileCount} ${plural(fileCount, "file")}.`,
    );
    if (result.baselineChanged) {
      human(
        `[dead-css-autofix] Dropped ${result.retired.length} baseline ${plural(result.retired.length, "allowance")} for the deleted selectors.`,
      );
    }
    if (options.printChanged) for (const file of result.changed) console.log(file);
    return result.status;
  }

  const result = writeDeletionProposal({ root: process.cwd() });
  if (result.files.length === 0) {
    human("[dead-css-autofix] No fully dead rules to propose.");
    return 0;
  }
  const fileCount = new Set(result.files.map((file) => file.file)).size;
  const kilobytes = (result.files.reduce((total, file) => total + file.bytes, 0) / 1024).toFixed(1);
  human(
    `[dead-css-autofix] Proposed ${result.removed.length} rule ${plural(result.removed.length, "deletion")} (${kilobytes} KB of source) in ${fileCount} ${plural(fileCount, "file")}. Review ${result.diffPath}, then accept with --accept-deletions (or git apply).`,
  );
  human(result.diff);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const options = parseArgs(process.argv.slice(2));
  const human = options.printChanged ? console.error : console.log;
  try {
    if (options.reviewDeletions || options.selectedIds) {
      let acceptedIds = options.selectedIds;
      if (!acceptedIds) {
        const proposal = collectDeadRuleProposal();
        const reader = createInterface({ input: process.stdin, output: process.stdout });
        acceptedIds = [];
        try {
          for (const rule of proposal.removed) {
            human(`${rule.file}: ${rule.selector}\n${JSON.stringify(rule.evidence)}`);
            if (/^y(es)?$/i.test((await reader.question(`Accept deletion ${rule.id}? [y/N] `)).trim())) acceptedIds.push(rule.id);
          }
        } finally { reader.close(); }
      }
      const selected = selectDeletionRules({ acceptedIds });
      human(selected.diff || "No deletions accepted.");
      human(`Saved ${selected.removed.length} accepted rules to ${DELETION_DIFF_PATH}.`);
      process.exit(0);
    }
    if (options.proposeDeletions || options.acceptDeletions) {
      process.exit(runDeletionMode(options, human));
    }

    const result = runDeadCssAutofix({ write: !options.check, log: human, error: console.error });
    if (result.status !== 0) process.exit(result.status);

    for (const split of result.splits) {
      human(`[dead-css-autofix] ${split.file}: ${split.dead.join(", ")} split out of ${split.kept.join(", ")}`);
    }
    human(
      `[dead-css-autofix] ${result.splits.length} dead branch${result.splits.length === 1 ? "" : "es"} in ${new Set(result.splits.map((split) => split.file)).size} file${new Set(result.splits.map((split) => split.file)).size === 1 ? "" : "s"}${options.check ? " (check only, nothing written)" : ""}.`,
    );
    if (options.printChanged) {
      for (const file of result.changed) console.log(file);
    }
  } catch (caught) {
    console.error(`[dead-css-autofix] ${caught instanceof Error ? caught.message : String(caught)}`);
    process.exit(1);
  }
}
