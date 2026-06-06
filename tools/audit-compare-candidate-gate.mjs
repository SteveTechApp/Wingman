import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gateCompareCandidate } from "../src/wingman2/lib/compareCandidateGate.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8").replace(/^\\uFEFF/, ""));
}

function arrayify(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value.products)) return value.products;
  if (Array.isArray(value.entries)) return value.entries;
  if (Array.isArray(value.items)) return value.items;
  return [];
}

const index = readJson(path.join(root, "public/product-intelligence-index.json"));
const products = arrayify(index);

const contexts = [
  { name: "Crestron HDBaseT transmitter", competitorClass: "HDBASET" },
  { name: "AMX SVSI encoder", competitorClass: "AVOIP" },
  { name: "AMX control processor", competitorClass: "CONTROL" },
  { name: "Barco wireless presentation", competitorClass: "WIRELESS_PRESENTATION" },
];

const output = [];

for (const context of contexts) {
  const blocked = [];
  const allowed = [];

  for (const product of products) {
    const gate = gateCompareCandidate({
      sku: product.sku,
      title: product.title || product.name,
      role: product.role || product.governanceRole || product.category,
      category: product.category,
      productFamily: product.productFamily,
      tags: product.tags,
      features: product.features,
      text: JSON.stringify(product),
    }, context);

    const row = {
      sku: product.sku,
      title: product.title || product.name,
      role: product.role || product.governanceRole || product.category,
      candidateClass: gate.candidateClass,
      reason: gate.reason,
      blockedBy: gate.blockedBy,
    };

    if (gate.allowed) allowed.push(row);
    if (!gate.allowed) blocked.push(row);
  }

  output.push({
    context: context.name,
    competitorClass: context.competitorClass,
    allowedCount: allowed.length,
    blockedCount: blocked.length,
    blockedApoExamples: blocked.filter((item) => String(item.sku || "").startsWith("APO-")).slice(0, 20),
    allowedExamples: allowed.slice(0, 20),
  });
}

mkdirSync(path.join(root, "reports"), { recursive: true });

writeFileSync(path.join(root, "reports", "compare-candidate-gate-audit.json"), JSON.stringify({
  generatedAt: new Date().toISOString(),
  productCount: products.length,
  output,
}, null, 2), "utf8");

writeFileSync(path.join(root, "reports", "compare-candidate-gate-audit.md"), [
  "# Compare Candidate Gate Audit",
  "",
  "Generated: " + new Date().toISOString(),
  "",
  "Product count: " + products.length,
  "",
  ...output.flatMap((item) => [
    "## " + item.context,
    "",
    "- Competitor class: " + item.competitorClass,
    "- Allowed candidates: " + item.allowedCount,
    "- Blocked candidates: " + item.blockedCount,
    "- Blocked APO examples: " + item.blockedApoExamples.length,
    "",
    ...(item.blockedApoExamples.length
      ? item.blockedApoExamples.map((example) => "- BLOCKED " + example.sku + " | " + example.title + " | " + example.reason)
      : ["No APO examples blocked in this context."]),
    "",
  ]),
].join("\\n"), "utf8");

console.log("");
console.log("[compare-candidate-gate-audit] Wrote reports/compare-candidate-gate-audit.md");
console.log("[compare-candidate-gate-audit] Wrote reports/compare-candidate-gate-audit.json");

for (const item of output) {
  console.log("");
  console.log(item.context);
  console.log("Allowed: " + item.allowedCount);
  console.log("Blocked: " + item.blockedCount);
  console.log("Blocked APO examples: " + item.blockedApoExamples.length);
}
