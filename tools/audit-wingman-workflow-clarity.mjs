import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(root, "src", "wingman2", "app", "route-manifest.json");
const reportPath = path.join(root, "reports", "wingman-workflow-clarity.md");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const critical = [];
const rows = [];

const signals = {
  heading: /<(?:h1|PageHero|ProductWorkspaceHeader)\b/,
  action: /<(?:button|Link|NavLink)\b|type=["']submit["']/,
  guidance: /(?:summary|guidance|helper|instruction|wm-copy|empty|error|status)/i,
  onward: /(?:to=|navigate\(|href=)/,
};

for (const route of manifest) {
  const pagePath = path.join(root, "src", "wingman2", "pages", route.pageFile);
  if (!existsSync(pagePath)) {
    critical.push(`${route.path}: missing ${route.pageFile}`);
    continue;
  }

  const source = readFileSync(pagePath, "utf8");
  const result = Object.fromEntries(
    Object.entries(signals).map(([name, pattern]) => [name, pattern.test(source)]),
  );
  const findings = Object.entries(result)
    .filter(([, present]) => !present)
    .map(([name]) => `review ${name}`);

  rows.push({
    route: route.path,
    page: route.pageFile,
    result,
    findings: findings.length ? findings.join(", ") : "source contract present",
  });
}

const report = [
  "# Wingman Workflow Clarity Audit",
  "",
  `Routes checked: ${manifest.length}`,
  `Critical findings: ${critical.length}`,
  "",
  "| Route | Page | Heading | Action | Guidance | Onward path | Finding |",
  "|---|---|:---:|:---:|:---:|:---:|---|",
  ...rows.map(({ route, page, result, findings }) =>
    `| \`${route}\` | \`${page}\` | ${result.heading ? "yes" : "no"} | ${result.action ? "yes" : "no"} | ${result.guidance ? "yes" : "no"} | ${result.onward ? "yes" : "no"} | ${findings} |`,
  ),
  "",
  "## Critical findings",
  "",
  ...(critical.length ? critical.map((item) => `- ${item}`) : ["- None."]),
  "",
  "Static signals identify review targets; rendered desktop and mobile checks remain required before closing a route finding.",
  "",
].join("\n");

mkdirSync(path.dirname(reportPath), { recursive: true });
writeFileSync(reportPath, report);

console.log(`[workflow-clarity] Audited ${manifest.length} routes.`);
console.log(`[workflow-clarity] Report: ${path.relative(root, reportPath)}`);

if (critical.length) {
  for (const finding of critical) console.error(`- ${finding}`);
  process.exit(1);
}
