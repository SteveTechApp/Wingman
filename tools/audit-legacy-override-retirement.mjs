import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const legacyDir = path.join(root, "src", "wingman2", "styles", "legacy-overrides");
const reportDir = path.join(root, "reports");
const reportPath = path.join(reportDir, "legacy-override-retirement-report.md");
const jsonPath = path.join(reportDir, "legacy-override-retirement-report.json");

function rel(file) {
  return path.relative(root, file).replaceAll("\\", "/");
}

function count(raw, regex) {
  const matches = raw.match(regex);
  return matches ? matches.length : 0;
}

function classify(fileName, raw) {
  const lower = fileName.toLowerCase();

  if (lower.includes("logo")) return "brand-logo";
  if (lower.includes("guru")) return "guru";
  if (lower.includes("compact") || lower.includes("declutter") || lower.includes("page-length")) return "density-duplicate";
  if (lower.includes("finder")) return "finder-route";
  if (lower.includes("compare")) return "compare-route";
  if (lower.includes("templates")) return "templates-route";
  if (lower.includes("discovery")) return "discovery-route";
  if (lower.includes("new-wingman-design") || lower.includes("workflow-clarity")) return "global-design-pass";
  if (lower.includes("balanced-compact")) return "shell-header";
  if (lower.includes("development-notes")) return "safe-hide-rule";
  if (lower.includes("call-cards")) return "call-cards-route";

  if (/wingman-shell|wingman-sidebar|wingman-topbar/i.test(raw)) return "shell";
  if (/wm-route|data-wm-route|:has\(/i.test(raw)) return "route";
  if (/card|button|hero|helper|guidance/i.test(raw)) return "density-duplicate";

  return "unknown";
}

function recommendation(category, _fileName) {
  if (category === "safe-hide-rule") {
    return "Keep for now unless the hidden UI no longer exists.";
  }

  if (category === "brand-logo") {
    return "Candidate to retire after verifying logo size and sidebar branding are handled by wm-logo-scale, wm-brand-reset and authority CSS.";
  }

  if (category === "density-duplicate") {
    return "High-priority retirement candidate. Likely superseded by wingman-density-governance.css and shared layout primitives.";
  }

  if (category === "finder-route") {
    return "Retire only after FinderPage is migrated onto shared layout primitives.";
  }

  if (category === "compare-route") {
    return "Retire only after ComparePage is migrated onto shared layout primitives.";
  }

  if (category === "templates-route") {
    return "Retire only after TemplatesPage and TemplateReviewPage are migrated.";
  }

  if (category === "discovery-route") {
    return "Retire only after DiscoveryPage and SourceDeviceCollator styling are reviewed.";
  }

  if (category === "global-design-pass") {
    return "Do not delete in one go. Split or retire selectors in small groups after page migration.";
  }

  if (category === "shell-header") {
    return "Retire only after AppShell/topbar/sidebar are covered by structural CSS and authority CSS.";
  }

  if (category === "guru") {
    return "Retire only after Guru drawer/FAB visual checks pass.";
  }

  return "Inspect manually before changing.";
}

if (!fs.existsSync(legacyDir)) {
  console.error("Missing legacy override directory.");
  process.exit(1);
}

const files = fs
  .readdirSync(legacyDir)
  .filter((name) => name.endsWith(".css"))
  .sort()
  .map((name) => path.join(legacyDir, name));

const rows = files.map((file) => {
  const raw = fs.readFileSync(file, "utf8");
  const name = path.basename(file);
  const category = classify(name, raw);

  const important = count(raw, /!important/g);
  const route = count(raw, /wm-route-|data-wm-route|:has\(/g);
  const shell = count(raw, /\.wingman-shell\b/g);
  const main = count(raw, /\.wingman-app-main\b/g);
  const sidebar = count(raw, /sidebar/gi);
  const topbar = count(raw, /topbar|header/gi);
  const lightDark = count(raw, /background:\s*#fff|background:\s*white|color:\s*#0f172a|--wm-finder-ink|--wm-disc-text/gi);

  const risk =
    important * 2 +
    route * 5 +
    shell * 5 +
    main * 5 +
    sidebar * 2 +
    topbar * 2 +
    lightDark * 4;

  let retirementPriority = "low";

  if (category === "density-duplicate") retirementPriority = "high";
  if (category === "brand-logo") retirementPriority = "medium";
  if (category === "finder-route") retirementPriority = "medium";
  if (category === "global-design-pass") retirementPriority = "high-risk-later";
  if (category === "safe-hide-rule") retirementPriority = "keep";

  return {
    file: rel(file),
    name,
    category,
    retirementPriority,
    lines: raw.split(/\r?\n/).length,
    sizeKb: Math.round((Buffer.byteLength(raw) / 1024) * 10) / 10,
    risk,
    important,
    route,
    shell,
    main,
    sidebar,
    topbar,
    lightDark,
    recommendation: recommendation(category, name),
  };
}).sort((a, b) => {
  const order = {
    high: 1,
    medium: 2,
    "high-risk-later": 3,
    low: 4,
    keep: 5,
  };

  return (order[a.retirementPriority] ?? 99) - (order[b.retirementPriority] ?? 99) || b.risk - a.risk;
});

fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(jsonPath, JSON.stringify({ generatedAt: new Date().toISOString(), rows }, null, 2));

const lines = [];

lines.push("# Wingman Legacy Override Retirement Report");
lines.push("");
lines.push(`Generated: ${new Date().toISOString()}`);
lines.push("");
lines.push("## Recommended retirement order");
lines.push("");
lines.push("| Priority | Risk | Category | File | Lines | !important | Route | Shell | Main | Recommendation |");
lines.push("|---|---:|---|---|---:|---:|---:|---:|---:|---|");

for (const row of rows) {
  lines.push(`| ${row.retirementPriority} | ${row.risk} | ${row.category} | \`${row.file}\` | ${row.lines} | ${row.important} | ${row.route} | ${row.shell} | ${row.main} | ${row.recommendation} |`);
}

lines.push("");
lines.push("## Practical rule");
lines.push("");
lines.push("Do not delete global design-pass files first. Retire density duplicates and route-specific files only after their pages have been migrated to shared layout primitives.");
lines.push("");
lines.push("First candidates to test are usually:");
lines.push("");
lines.push("- compact page length");
lines.push("- declutter guidance popovers");
lines.push("- prominent card buttons");
lines.push("- duplicated logo fixes");

fs.writeFileSync(reportPath, lines.join("\n"));

console.log(`Legacy override retirement report written to ${rel(reportPath)}`);
