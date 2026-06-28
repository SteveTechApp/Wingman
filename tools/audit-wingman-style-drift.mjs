import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourceRoot = path.join(root, "src");
const reportPath = path.join(root, "reports", "wingman-style-drift-audit.md");
const sourceExtensions = new Set([".css", ".html", ".js", ".jsx", ".mjs", ".ts", ".tsx"]);

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
  `| Hard-coded hex colours | ${totals.hex} |`,
  `| rgb/rgba colours | ${totals.rgb} |`,
  `| Inline style attributes | ${totals.inlineStyle} |`,
  `| Arbitrary Tailwind colours | ${totals.arbitraryTailwind} |`,
  `| Page-specific CSS sections | ${totals.pageSections} |`,
  `| Legacy info-pill/submode-chip occurrences | ${totals.legacyPills} |`,
  "",
  "## Top Files By Drift Count",
  "",
  "| File | Total | Hex | rgb/rgba | Inline styles | Arbitrary Tailwind | Page CSS | Legacy pills |",
  "|---|---:|---:|---:|---:|---:|---:|---:|",
  ...topFiles.map(
    (result) =>
      `| \`${result.file}\` | ${result.drift} | ${result.hex} | ${result.rgb} | ${result.inlineStyle} | ${result.arbitraryTailwind} | ${result.pageSections} | ${result.legacyPills} |`,
  ),
  "",
  "## Counting Rules",
  "",
  "- Scans source files under `src/` with CSS, HTML, JavaScript or TypeScript extensions.",
  "- Counts every literal 3-8 digit hex colour and every `rgb()` or `rgba()` function.",
  "- Counts JSX/HTML `style=` attributes and Tailwind colour utilities using bracket notation.",
  "- Counts CSS rule blocks whose selector contains a Wingman page, route or named workflow hook.",
  "- Counts literal `info-pill` and `submode-chip` legacy class references.",
  "",
  "This is a trend audit, not a build gate. Re-run it after each visual migration pass.",
  "",
].join("\n");

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, report);

console.log(`Hard-coded hex colours: ${totals.hex}`);
console.log(`rgb/rgba colours: ${totals.rgb}`);
console.log(`Inline style attributes: ${totals.inlineStyle}`);
console.log(`Arbitrary Tailwind colours: ${totals.arbitraryTailwind}`);
console.log(`Page-specific CSS sections: ${totals.pageSections}`);
console.log(`Legacy info-pill/submode-chip occurrences: ${totals.legacyPills}`);
console.log(`Report written to: ${relative(reportPath)}`);
