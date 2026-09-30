import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { buildCoverageScorecard, floorViolations, loadChecklistScorer, measuredFloors } from "./lib/template-coverage-scorecard.mjs";

export const CANONICAL_TEMPLATE_MARKETS = new Set([
  "Corporate", "Education", "Government", "Emergency Services", "Energy / Oil & Gas",
  "Manufacturing / Logistics", "Healthcare", "Hospitality", "Retail",
  "Sports & Leisure", "House of Worship", "Control Rooms", "Transportation",
  "Broadcast / Media", "Residential",
]);

const governedRows = (template) => (template.bom ?? []).filter((row) => !String(row.sku).startsWith("BY-OTHERS") && !String(row.sku).startsWith("CUSTOM"));
const semanticKey = (row) => `${String(row.role ?? "").trim().toLowerCase()}|${String(row.description ?? "").trim().toLowerCase()}|${String(row.sku ?? "").trim().toUpperCase()}`;

export function auditTemplates(templates, catalogue) {
  const products = Array.isArray(catalogue) ? catalogue : catalogue?.products ?? [];
  const bySku = new Map(products.map((product) => [String(product.sku ?? product.id).toUpperCase(), product]));
  const findings = [];
  const add = (template, code, message, severity = "error") => findings.push({ templateId: template.id, code, severity, message });

  for (const template of templates) {
    const profile = template.applicationProfile ?? template.profile;
    if (!profile) add(template, "unprofiled-template", "Published template has no application profile.");
    if (profile && profile.reviewStatus !== "reviewed") add(template, "unreviewed-template", "Application profile has not been reviewed.");
    if (!profile?.imageKey) add(template, "missing-image-key", "Application profile has no explicit image key.");
    if (!profile?.sizingBasis?.length) add(template, "missing-sizing-basis", "Application profile has no authored sizing basis.");
    const market = profile?.canonicalMarket ?? template.vertical ?? template.market;
    if (!CANONICAL_TEMPLATE_MARKETS.has(market)) add(template, "noncanonical-market", `Market "${market || "(empty)"}" is not canonical.`);

    const rows = governedRows(template);
    if (!rows.some((row) => row.type === "Required")) add(template, "missing-required-core", "Template has no required governed WyreStorm row.");
    for (const row of rows) {
      const product = bySku.get(String(row.sku).toUpperCase());
      if (!product) add(template, "unknown-sku", `SKU ${row.sku} is not in the governed catalogue.`);
      else if (product.doNotSpec || ["discontinued", "suppressed", "blocked"].includes(String(product.lifecycleStatus).toLowerCase())) {
        add(template, "suppressed-sku", `SKU ${row.sku} is suppressed or lifecycle blocked.`);
      }
    }

    const seen = new Set();
    for (const row of template.bom ?? []) {
      const key = semanticKey(row);
      if (seen.has(key)) add(template, "duplicate-semantic-row", `Duplicate BOM scope: ${row.role} / ${row.description}.`, "warning");
      seen.add(key);
    }

    const capabilities = new Set(profile?.capabilities ?? []);
    const scope = (template.bom ?? []).filter((row) => String(row.sku).startsWith("BY-OTHERS")).map((row) => `${row.role} ${row.description}`).join(" ").toLowerCase();
    if (!capabilities.has("microphones") && /microphone|audio capture/.test(scope)) add(template, "capability-scope-mismatch", "Microphone scope is present without the microphones capability.");
    if (!capabilities.has("audio") && /\bdsp\b|speaker reinforcement/.test(scope)) add(template, "capability-scope-mismatch", "Audio scope is present without the audio capability.");

    if (profile?.architectureFamily === "AV over IP" && capabilities.has("video")) {
      const outputs = rows.filter((row) => /display|decoder|receiver|output|projector|screen.*endpoint|endpoint.*screen/i.test(`${row.role} ${row.description}`)).reduce((sum, row) => sum + Number(row.qty || 0), 0);
      if (outputs === 0) add(template, "implausible-endpoint-ratio", "AV-over-IP video design has no receiver or output endpoint.");
    }
  }
  return findings;
}

export async function loadPublishedTemplates(root) {
  const { build } = await import("vite");
  const entry = path.join(root, "src/wingman2/lib/templateRealismAuditEntry.ts");
  const result = await build({ configFile: false, root, logLevel: "silent", build: { write: false, ssr: entry, rollupOptions: { output: { format: "esm" } } } });
  const output = Array.isArray(result) ? result[0].output : result.output;
  const chunk = output.find((item) => item.type === "chunk");
  const url = `data:text/javascript;base64,${Buffer.from(chunk.code).toString("base64")}`;
  return (await import(url)).publishedTemplateAuditRecords;
}

export async function runTemplateRealismAudit(root = process.cwd()) {
  const [templates, catalogue] = await Promise.all([
    loadPublishedTemplates(root),
    fs.readFile(path.join(root, "public/product-intelligence-summary.json"), "utf8").then(JSON.parse),
  ]);
  return auditTemplates(templates, catalogue);
}

/** Full audit plus the complete-room coverage scorecard with floor enforcement. */
export async function runTemplateRealismAuditWithScorecard(root = process.cwd()) {
  const [templates, catalogue, scorer] = await Promise.all([
    loadPublishedTemplates(root),
    fs.readFile(path.join(root, "public/product-intelligence-summary.json"), "utf8").then(JSON.parse),
    loadChecklistScorer(root),
  ]);
  const findings = auditTemplates(templates, catalogue);
  const scorecard = buildCoverageScorecard(templates, scorer);
  const floors = JSON.parse(await fs.readFile(path.join(root, "tools/template-coverage-floors.json"), "utf8"));
  return { findings, scorecard, floors, violations: floorViolations(scorecard, floors) };
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const { findings, scorecard, violations } = await runTemplateRealismAuditWithScorecard();
  for (const finding of findings) console.log(`${finding.severity.toUpperCase()} ${finding.code} ${finding.templateId}: ${finding.message}`);
  const errors = findings.filter((finding) => finding.severity === "error");
  console.log(
    "Complete-room coverage: " +
    Object.entries(scorecard.layers).map(([layer, counts]) => `${layer} ${counts.addressed}/${scorecard.templateCount}`).join(" · ") +
    " (addressed = covered + by-others + not-applicable)",
  );
  for (const violation of violations) {
    console.error(`COVERAGE-FLOOR ${violation.layer}: ${violation.measured} addressed templates is below the floor of ${violation.floor}.`);
  }
  if (errors.length || violations.length) {
    console.error(`Template realism audit failed with ${errors.length} error(s) and ${violations.length} coverage-floor violation(s).`);
    process.exitCode = 1;
  } else console.log(`Template realism audit passed (${findings.length} warning(s)).`);
}
