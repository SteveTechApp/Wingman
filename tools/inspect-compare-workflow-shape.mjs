import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

const comparePath = path.join(root, "src/wingman2/pages/ComparePage.tsx");
const source = readFileSync(comparePath, "utf8");

function lineNumberAt(index) {
  if (index < 0) return -1;
  return source.slice(0, index).split(/\r?\n/).length;
}

function snippetAt(index, radius = 12) {
  if (index < 0) return [];
  const lines = source.split(/\r?\n/);
  const line = lineNumberAt(index);
  const start = Math.max(1, line - radius);
  const end = Math.min(lines.length, line + radius);

  return lines.slice(start - 1, end).map((text, offset) => {
    const number = start + offset;
    return String(number).padStart(5, " ") + ": " + text;
  });
}

const markers = [
  "const record",
  "saveRecord",
  "reviewNotes",
  "buildReviewNotes",
  "shortlist",
  "const top",
  "const competitor",
  "matchScore",
  "rows",
  "swot",
  "lookupMode",
  "setResult",
  "setNoMatchDetails",
  "classifyCompetitorCompareDecision",
];

const report = [];

report.push("# Compare Workflow Shape Report");
report.push("");
report.push("Generated: " + new Date().toISOString());
report.push("File: src/wingman2/pages/ComparePage.tsx");
report.push("");

for (const marker of markers) {
  const index = source.indexOf(marker);

  report.push("## Marker: " + marker);
  report.push("");
  report.push("- Found: " + (index >= 0 ? "yes" : "no"));
  report.push("- Line: " + lineNumberAt(index));
  report.push("");

  if (index >= 0) {
    report.push("~~~tsx");
    report.push(...snippetAt(index, 10));
    report.push("~~~");
    report.push("");
  }
}

const typeMatches = [
  ...source.matchAll(/(?:type|interface)\s+([A-Za-z0-9_]*Record[A-Za-z0-9_]*)\s*(?:=\s*)?\{/g),
];

report.push("## Record-like type declarations");
report.push("");

if (!typeMatches.length) {
  report.push("No record-like type/interface declaration found by broad scan.");
}

if (typeMatches.length) {
  for (const match of typeMatches) {
    report.push("- " + match[1] + " at line " + lineNumberAt(match.index ?? -1));
  }
}

report.push("");

const outputDir = path.join(root, "reports");
mkdirSync(outputDir, { recursive: true });

const outputPath = path.join(outputDir, "compare-workflow-shape-report.md");
writeFileSync(outputPath, report.join("\n"), "utf8");

console.log("[compare-workflow-shape] Wrote reports/compare-workflow-shape-report.md");
console.log("");
console.log(report.slice(0, 140).join("\n"));
