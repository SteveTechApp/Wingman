import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const pagesDir = path.join(root, "src", "wingman2", "pages");
const outputCsv = path.join(root, `wingman-single-screen-audit-${new Date().toISOString().replace(/[:.]/g, "-")}.csv`);

function walk(dir) {
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) return walk(full);
    if (entry.isFile() && /\.(tsx|ts)$/.test(entry.name)) return [full];

    return [];
  });
}

function countMatches(text, pattern) {
  return (text.match(pattern) || []).length;
}

function csv(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

const rows = [
  [
    "file",
    "line_count",
    "section_count",
    "article_count",
    "button_count",
    "textarea_count",
    "risk_score",
    "risk_level",
    "recommendation"
  ]
];

for (const file of walk(pagesDir)) {
  const text = fs.readFileSync(file, "utf8");
  const lineCount = text.split(/\r?\n/).length;
  const sectionCount = countMatches(text, /<section\b/g);
  const articleCount = countMatches(text, /<article\b/g);
  const buttonCount = countMatches(text, /<button\b/g);
  const textareaCount = countMatches(text, /<textarea\b/g);
  const detailCount = countMatches(text, /<details\b/g);
  const mapCount = countMatches(text, /\.map\(/g);

  let risk = 0;
  risk += Math.max(0, Math.ceil((lineCount - 260) / 80));
  risk += Math.max(0, sectionCount - 6);
  risk += Math.max(0, articleCount - 8);
  risk += Math.max(0, Math.ceil((buttonCount - 16) / 4));
  risk += textareaCount * 2;
  risk += detailCount * 2;
  risk += Math.max(0, mapCount - 4);

  const riskLevel = risk >= 18 ? "HIGH" : risk >= 9 ? "MEDIUM" : "LOW";

  const recommendation =
    riskLevel === "HIGH"
      ? "Split into workflow pages. One visible action per page."
      : riskLevel === "MEDIUM"
        ? "Compact into tabs or use WingmanWorkflowPager."
        : "Likely acceptable with global screen-fit CSS.";

  rows.push([
    path.relative(root, file),
    lineCount,
    sectionCount,
    articleCount,
    buttonCount,
    textareaCount,
    risk,
    riskLevel,
    recommendation
  ]);
}

fs.writeFileSync(outputCsv, rows.map((row) => row.map(csv).join(",")).join("\n"), "utf8");

const high = rows.slice(1).filter((row) => row[7] === "HIGH");
const medium = rows.slice(1).filter((row) => row[7] === "MEDIUM");

console.log(`Single-screen audit written: ${path.relative(root, outputCsv)}`);
console.log(`HIGH risk pages: ${high.length}`);
console.log(`MEDIUM risk pages: ${medium.length}`);

for (const row of high.slice(0, 20)) {
  console.log(`HIGH: ${row[0]} — ${row[8]}`);
}