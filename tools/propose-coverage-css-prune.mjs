import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { collectDeadRuleProposal } from "./autofix-dead-css.mjs";
import { compoundClassTokens, normalizeSelector, selectorBranches, selectorCompounds } from "./lib/dead-css.mjs";

/** Coverage narrows the list; absent classes must independently prove removal. */
export function coveragePruneProposal({ root = process.cwd(), coveragePath = "reports/css-coverage.json" } = {}) {
  const coverage = JSON.parse(fs.readFileSync(path.resolve(root, coveragePath), "utf8"));
  if (!Array.isArray(coverage.unmatched)) throw new Error("Coverage report has no unmatched rule list.");
  const unmatched = new Set(coverage.unmatched.filter((row) => !row.generated)
    .map((row) => `${row.file.replaceAll("\\", "/")}::${normalizeSelector(row.selector)}`));
  const docs = [];
  function readDocs(directory) {
    if (!fs.existsSync(directory)) return;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith(".") && !["node_modules", "dist", "reports", "coverage", "data"].includes(entry.name)) readDocs(file);
      }
      else if (/\.(md|mdx|txt)$/.test(entry.name)) docs.push(fs.readFileSync(file, "utf8"));
    }
  }
  readDocs(root);
  const documentation = new Set(docs.join("\n").match(/[A-Za-z_][A-Za-z0-9_-]*/g) ?? []);
  const full = collectDeadRuleProposal({ root });
  const candidates = full.removed.filter((rule) => {
    if (!unmatched.has(`${rule.file}::${rule.selector}`) || /:(?:not|is|where|has)\(/.test(rule.selector)) return false;
    const tokens = selectorBranches(rule.selector).flatMap(selectorCompounds).flatMap(compoundClassTokens);
    const unused = new Set(rule.evidence.flatMap((branch) => branch.unusedClasses));
    return tokens.length > 0 && tokens.every((token) => unused.has(token) && !documentation.has(token));
  });
  const proposal = collectDeadRuleProposal({ root, acceptedIds: candidates.map((rule) => rule.id) });
  const output = path.join(root, "reports");
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(output, "coverage-css-prune.diff"), proposal.diff);
  fs.writeFileSync(path.join(output, "coverage-css-prune.json"), `${JSON.stringify({
    coveragePath, coverageGeneratedAt: coverage.generatedAt ?? null,
    caution: "Coverage absence alone is not permission to delete. Review each candidate before applying.",
    candidates,
  }, null, 2)}\n`);
  return proposal;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const proposal = coveragePruneProposal({ coveragePath: process.argv[2] ?? "reports/css-coverage.json" });
  console.log(`${proposal.removed.length} coverage-backed candidates. Review reports/coverage-css-prune.json and reports/coverage-css-prune.diff.`);
  console.log(proposal.diff);
}
