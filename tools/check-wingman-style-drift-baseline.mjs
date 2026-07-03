import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourceRoot = path.join(root, "src");
const baselinePath = path.join(root, "tools", "wingman-style-drift-baseline.json");
const reportPath = path.join(root, "reports", "wingman-style-drift-audit.md");
const sourceExtensions = new Set([".css", ".html", ".js", ".jsx", ".mjs", ".ts", ".tsx"]);
const updateBaseline = process.argv.includes("--update-baseline");

function walk(directory) {
  if (!fs.existsSync(directory)) {
    return [];
  }

  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if ([".git", "dist", "node_modules"].includes(entry.name)) {
      return [];
    }

    const absolutePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return walk(absolutePath);
    }

    return sourceExtensions.has(path.extname(entry.name)) ? [absolutePath] : [];
  });
}

function relative(file) {
  return path.relative(root, file).replaceAll("\\", "/");
}

function countMatches(value, pattern) {
  return value.match(pattern)?.length ?? 0;
}

function countPageSpecificCssSections(value) {
  const pageSelector = /\b(?:wm|compare)-(?:[a-z0-9-]+-)?(?:page|compare|template|discovery|proposal|finder|call-card)[a-z0-9-]*\b|\[data-(?:wingman-page|wingman-route|wm-route)/i;

  return [...value.matchAll(/([^{}]+)\{/g)].filter((match) => {
    const selector = match[1].trim();
    return !selector.startsWith("@") && pageSelector.test(selector);
  }).length;
}

function auditFile(file) {
  const value = fs.readFileSync(file, "utf8");
  const extension = path.extname(file);
  const isCss = extension === ".css";
  const isMarkup = [".html", ".jsx", ".tsx"].includes(extension);

  const metrics = {
    hex: countMatches(value, /#[\da-f]{3,8}\b/gi),
    rgb: countMatches(value, /\brgba?\(/gi),
    inlineStyle: isMarkup ? countMatches(value, /\bstyle\s*=\s*(?:\{|["'])/g) : 0,
    arbitraryTailwind: countMatches(
      value,
      /\b(?:bg|border|fill|from|outline|ring|shadow|stroke|text|to|via)-\[[^\]\r\n]+\]/g,
    ),
    pageSections: isCss ? countPageSpecificCssSections(value) : 0,
    legacyPills: countMatches(value, /\b(?:info-pill|submode-chip)\b/gi),
  };

  return {
    file: relative(file),
    ...metrics,
    drift: Object.values(metrics).reduce((total, count) => total + count, 0),
  };
}

function runAudit() {
  const files = walk(sourceRoot);
  const results = files.map(auditFile);

  const totals = results.reduce(
    (summary, result) => {
      summary.hex += result.hex;
      summary.rgb += result.rgb;
      summary.inlineStyle += result.inlineStyle;
      summary.arbitraryTailwind += result.arbitraryTailwind;
      summary.pageSections += result.pageSections;
      summary.legacyPills += result.legacyPills;
      return summary;
    },
    {
      hex: 0,
      rgb: 0,
      inlineStyle: 0,
      arbitraryTailwind: 0,
      pageSections: 0,
      legacyPills: 0,
    },
  );

  const topFiles = results
    .filter((result) => result.drift > 0)
    .sort((left, right) => right.drift - left.drift || left.file.localeCompare(right.file))
    .slice(0, 15);

  return { totals, topFiles };
}

function writeReport(audit) {
  const generatedAt = new Date().toISOString();

  const report = [
    "# Wingman Style Drift Audit",
    "",
    `Generated: ${generatedAt}`,
    "",
    "## Summary",
    "",
    "| Metric | Count |",
    "|---|---:|",
    `| Hard-coded hex colours | ${audit.totals.hex} |`,
    `| rgb/rgba colours | ${audit.totals.rgb} |`,
    `| Inline style attributes | ${audit.totals.inlineStyle} |`,
    `| Arbitrary Tailwind colours | ${audit.totals.arbitraryTailwind} |`,
    `| Page-specific CSS sections | ${audit.totals.pageSections} |`,
    `| Legacy info-pill/submode-chip occurrences | ${audit.totals.legacyPills} |`,
    "",
    "## Top Files By Drift Count",
    "",
    "| File | Total | Hex | rgb/rgba | Inline styles | Arbitrary Tailwind | Page CSS | Legacy pills |",
    "|---|---:|---:|---:|---:|---:|---:|---:|",
    ...audit.topFiles.map(
      (result) =>
        `| \`${result.file}\` | ${result.drift} | ${result.hex} | ${result.rgb} | ${result.inlineStyle} | ${result.arbitraryTailwind} | ${result.pageSections} | ${result.legacyPills} |`,
    ),
    "",
    "## Gate behaviour",
    "",
    "This report is paired with `tools/wingman-style-drift-baseline.json`.",
    "The check fails when drift grows beyond the stored baseline.",
    "",
  ].join("\n");

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, report);
}

const audit = runAudit();
writeReport(audit);

if (updateBaseline) {
  const baseline = {
    updatedAt: new Date().toISOString(),
    rule: "Current totals become the maximum allowed style-drift counts. Future changes must not increase these counts.",
    totals: audit.totals,
  };

  fs.writeFileSync(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`);
  console.log(`[style-drift] Baseline updated: ${path.relative(root, baselinePath)}`);
  console.log(audit.totals);
  process.exit(0);
}

if (!fs.existsSync(baselinePath)) {
  console.error(`[style-drift] Missing baseline: ${path.relative(root, baselinePath)}`);
  console.error("[style-drift] Run: npm run audit:style-drift:baseline");
  process.exit(1);
}

const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
const failures = [];

for (const metric of Object.keys(audit.totals)) {
  const current = audit.totals[metric];
  const allowed = baseline.totals?.[metric];

  if (typeof allowed !== "number") {
    failures.push(`${metric}: no baseline value`);
    continue;
  }

  if (current > allowed) {
    failures.push(`${metric}: current ${current} > baseline ${allowed}`);
  }
}

if (failures.length > 0) {
  console.error("[style-drift] FAILED. Style drift increased:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  console.error(`[style-drift] Report written to ${path.relative(root, reportPath)}`);
  process.exit(1);
}

console.log("[style-drift] OK. Drift has not increased beyond baseline.");
console.log(audit.totals);