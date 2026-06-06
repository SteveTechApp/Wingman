import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

const reportDir = path.join(root, "reports");
mkdirSync(reportDir, { recursive: true });

function read(relativePath) {
  const file = path.join(root, relativePath);
  if (!existsSync(file)) return "";
  return readFileSync(file, "utf8");
}

function readJson(relativePath) {
  const file = path.join(root, relativePath);
  if (!existsSync(file)) return null;

  try {
    return JSON.parse(readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
  } catch {
    return null;
  }
}

function arrayify(value) {
  if (Array.isArray(value)) return value;

  if (value && typeof value === "object") {
    for (const key of ["products", "items", "entries", "records", "index"]) {
      if (Array.isArray(value[key])) return value[key];
    }

    return Object.values(value).filter((item) => item && typeof item === "object");
  }

  return [];
}

function skuOf(product) {
  return String(product.sku || product.model || product.partNumber || product.id || "").trim();
}

function titleOf(product) {
  return String(product.title || product.name || product.description || skuOf(product)).trim();
}

function roleOf(product) {
  return String(product.role || product.productRole || product.governanceRole || product.category || product.type || "").trim();
}

function extractCatalogueCounts(source, marker) {
  const start = source.indexOf(marker);
  if (start < 0) return [];

  const endCandidates = [
    source.indexOf("const COMPARE_SKU_TYPEAHEAD_ALL_OPTIONS", start),
    source.indexOf("const COMPARE_SKU_TYPEAHEAD_BRAND_ALIASES", start),
    source.indexOf("const REQUIRED_FACTS", start),
  ].filter((index) => index > start);

  const end = endCandidates.length ? Math.min(...endCandidates) : start + 20000;
  const block = source.slice(start, end);
  const results = [];
  const brandRegex = /(?:^|\n)\s*(?:"([^"]+)"|([A-Za-z0-9_]+)):\s*\[([\s\S]*?)\]/g;
  let match;

  while ((match = brandRegex.exec(block)) !== null) {
    const brand = match[1] || match[2];
    const body = match[3];
    const skus = [...body.matchAll(/"([^"]+)"/g)].map((item) => item[1]);

    if (brand) {
      results.push({ brand, count: skus.length, skus });
    }
  }

  return results;
}

function has(source, marker) {
  return source.includes(marker);
}

function hasAny(source, markers) {
  return markers.some((marker) => source.includes(marker));
}

function addFinding(findings, severity, area, title, detail, evidence = []) {
  findings.push({
    severity,
    area,
    title,
    detail,
    evidence: Array.isArray(evidence) ? evidence.filter(Boolean) : [String(evidence)],
  });
}

const files = {
  comparePage: "src/wingman2/pages/ComparePage.tsx",
  finderPage: "src/wingman2/pages/FinderPage.tsx",
  productPitchPage: "src/wingman2/pages/ProductPitchPage.tsx",
  discoveryPage: "src/wingman2/pages/DiscoveryPage.tsx",
  competitorDecision: "src/wingman2/lib/competitorCompareDecision.ts",
  competitorIntelligence: "src/wingman2/lib/competitorProductIntelligence.ts",
  avDecision: "src/wingman2/lib/avDecisionEvidence.ts",
  recommendationEvidence: "src/wingman2/lib/recommendationEvidence.ts",
  productIndex: "public/product-intelligence-index.json",
};

const compare = read(files.comparePage);
const finder = read(files.finderPage);
const productPitch = read(files.productPitchPage);
const discovery = read(files.discoveryPage);
const competitorDecision = read(files.competitorDecision);
const competitorIntelligence = read(files.competitorIntelligence);
const avDecision = read(files.avDecision);
const recommendationEvidence = read(files.recommendationEvidence);
const productIndex = readJson(files.productIndex);
const products = arrayify(productIndex);

const findings = [];

for (const [name, relativePath] of Object.entries(files)) {
  if (name === "productIndex") continue;

  if (!read(relativePath)) {
    addFinding(findings, "critical", "Engine presence", relativePath, "Required source file is missing or unreadable.");
  }
}

if (!products.length) {
  addFinding(findings, "critical", "Product data", "Product index missing or unreadable", "The live product index is required for credible product comparison.");
}

if (!has(compare, "classifyCompetitorCompareDecision")) {
  addFinding(
    findings,
    "critical",
    "ComparePage",
    "ComparePage does not directly call the GOOD/PARTIAL/NO MATCH/VERIFY classifier",
    "The classifier exists, but the live Compare page can still present poor candidates unless it calls the decision engine before ranking output."
  );
}

if (!has(compare, "buildCompetitorDecisionEvidence") && !has(compare, "competitorProductIntelligence")) {
  addFinding(
    findings,
    "critical",
    "ComparePage",
    "ComparePage does not directly call competitor product intelligence",
    "The page should classify the competitor product first by brand, SKU family, role, technology class and evidence quality."
  );
}

if (!has(competitorDecision, "Technology class mismatch") || !has(competitorDecision, "Product role mismatch") || !has(competitorDecision, "Transport mismatch")) {
  addFinding(
    findings,
    "critical",
    "Competitor decision engine",
    "Hard gates are incomplete",
    "Technology class, product role and transport mismatch must be hard gates before recommending candidates."
  );
}

if (!has(competitorIntelligence, "CompetitorIntelligenceTier")) {
  addFinding(
    findings,
    "high",
    "Competitor intelligence",
    "Competitor quality-tier model is missing",
    "Wingman must distinguish SKU-only suggestions from family rules, fingerprints, verified profiles and approved compare profiles."
  );
}

if (!has(competitorIntelligence, "REQUIRED_FACTS")) {
  addFinding(
    findings,
    "high",
    "Competitor intelligence",
    "Required-facts model is missing",
    "Wingman needs required evidence fields per hardware type."
  );
}

const compareCatalogueCounts = extractCatalogueCounts(compare, "COMPARE_SKU_TYPEAHEAD_CATALOG");
const competitorIntelCounts = extractCatalogueCounts(competitorIntelligence, "COMPETITOR_SKU_SEED_CATALOG");

const wrongCandidateSkus = [
  "APO-120-DNT",
  "APO-210-UC",
  "APO-COM-MIC-UC",
  "APO-DG1",
  "APO-DG2",
  "APO-DG-HDMI",
];

const wrongCandidateEvidence = wrongCandidateSkus
  .map((sku) => {
    const product = products.find((item) => skuOf(item).toUpperCase() === sku.toUpperCase());
    return product
      ? sku + " | " + titleOf(product) + " | role=" + roleOf(product)
      : "";
  })
  .filter(Boolean);

if (wrongCandidateEvidence.length) {
  addFinding(
    findings,
    "critical",
    "Compare candidate filtering",
    "Audio/conferencing/accessory products exist in the product index and must be blocked from unrelated competitor comparisons",
    "The screenshot showed non-equivalent APO products being returned for a Crestron HDBaseT transmitter comparison.",
    wrongCandidateEvidence
  );
}

if (hasAny(compare, [".sort(", "matchScore", "fitScore", "FIT SCORE"]) && !has(compare, "Technology class mismatch")) {
  addFinding(
    findings,
    "critical",
    "Compare candidate ranking",
    "ComparePage appears to rank products before applying hard product-class gates",
    "Candidate filtering must start by understanding the competitor product, then only compare like-for-like product classes."
  );
}

if (!has(finder, "product-intelligence-index") && !has(finder, "matchProducts")) {
  addFinding(
    findings,
    "medium",
    "FinderPage",
    "Finder engine routing is unclear",
    "Finder should route through governed product-matching logic rather than page-local filtering only."
  );
}

if (!has(productPitch, "recommendationEvidence") && !has(productPitch, "buildRecommendationEvidence") && !has(productPitch, "salesReadiness")) {
  addFinding(
    findings,
    "medium",
    "ProductPitchPage",
    "Product pitch evidence routing is unclear",
    "Product pitch output should be driven by recommendation evidence and readiness logic."
  );
}

if (!has(discovery, "projectStore") && !has(discovery, "recommendationEvidence") && !has(discovery, "salesReadiness")) {
  addFinding(
    findings,
    "medium",
    "DiscoveryPage",
    "Discovery evidence routing is unclear",
    "Discovery answers should feed structured decision evidence, not only UI state."
  );
}

const roleSummary = {};

for (const product of products) {
  const role = roleOf(product) || "unknown";
  roleSummary[role] = (roleSummary[role] || 0) + 1;
}

const severityOrder = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  info: 0,
};

const sortedFindings = findings.slice().sort((a, b) => (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0));

const summary = {
  generatedAt: new Date().toISOString(),
  productIndexCount: products.length,
  roleSummary,
  compareCatalogueCounts,
  competitorIntelCounts,
  findingCounts: sortedFindings.reduce((acc, item) => {
    acc[item.severity] = (acc[item.severity] || 0) + 1;
    return acc;
  }, {}),
  findings: sortedFindings,
};

writeFileSync(path.join(reportDir, "wingman-engine-routing-audit.json"), JSON.stringify(summary, null, 2), "utf8");

const markdown = [
  "# Wingman Engine Routing Audit",
  "",
  "Generated: " + summary.generatedAt,
  "",
  "## Summary",
  "",
  "- Product index entries: " + products.length,
  "- Critical findings: " + (summary.findingCounts.critical || 0),
  "- High findings: " + (summary.findingCounts.high || 0),
  "- Medium findings: " + (summary.findingCounts.medium || 0),
  "",
  "## Competitor SKU counts from ComparePage",
  "",
  ...(compareCatalogueCounts.length ? compareCatalogueCounts.map((item) => "- " + item.brand + ": " + item.count) : ["No ComparePage catalogue found."]),
  "",
  "## Competitor SKU counts from central intelligence layer",
  "",
  ...(competitorIntelCounts.length ? competitorIntelCounts.map((item) => "- " + item.brand + ": " + item.count) : ["No central competitor intelligence catalogue found."]),
  "",
  "## Product role summary",
  "",
  ...Object.entries(roleSummary).sort((a, b) => b[1] - a[1]).map(([role, count]) => "- " + role + ": " + count),
  "",
  "## Findings",
  "",
  ...sortedFindings.flatMap((finding) => [
    "### [" + finding.severity.toUpperCase() + "] " + finding.area + " — " + finding.title,
    "",
    finding.detail,
    "",
    ...(finding.evidence.length ? ["Evidence:", ...finding.evidence.map((item) => "- " + item), ""] : []),
  ]),
  "",
].join("\n");

writeFileSync(path.join(reportDir, "wingman-engine-routing-audit.md"), markdown, "utf8");

console.log("");
console.log("[engine-routing-audit] Wrote reports/wingman-engine-routing-audit.md");
console.log("[engine-routing-audit] Wrote reports/wingman-engine-routing-audit.json");
console.log("");
console.log("Critical findings: " + (summary.findingCounts.critical || 0));
console.log("High findings:     " + (summary.findingCounts.high || 0));
console.log("Medium findings:   " + (summary.findingCounts.medium || 0));

for (const finding of sortedFindings.slice(0, 10)) {
  console.log("- [" + finding.severity.toUpperCase() + "] " + finding.area + ": " + finding.title);
}
