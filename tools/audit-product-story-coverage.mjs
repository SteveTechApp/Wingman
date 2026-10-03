import fs from "node:fs";
import path from "node:path";
import { readCsv } from "./product-update-utils.mjs";

/**
 * Product story coverage audit.
 *
 * Governed product stories (src/wingman2/data/productStories.ts) are the
 * high-confidence sales copy a rep can quote directly. Everything else falls back
 * to auto-generated positioning that the UI flags "verify before quoting".
 *
 * Coverage is measured against the governed lifecycle source, not the raw catalogue:
 * only ACTIVE lead products need a story. Cable, dependency-only, discontinued and
 * do-not-spec SKUs are deliberately excluded, and unlisted SKUs are surfaced for
 * review rather than auto-storied. SKUs are alias-resolved so a story on the
 * canonical SKU covers its variants.
 *
 * Dependency-only exceptions are governed in data/product-story-coverage-policy.json.
 * They remain in the catalogue for compatibility and BOM use; this policy only keeps
 * them out of the lead-product story backlog.
 *
 * It also reports provenance: "catalogue-grounded" stories were generated from the
 * official catalogue spec and adversarially verified, but still want a human
 * spot-check, so they are listed as the human-review backlog.
 *
 * Run: node tools/audit-product-story-coverage.mjs
 */

const repoRoot = process.cwd();
const storiesPath = path.join(repoRoot, "src", "wingman2", "data", "productStories.ts");
const catalogPath = path.join(repoRoot, "data", "wingman-canonical-product-store.json");
const policyPath = path.join(repoRoot, "data", "product-story-coverage-policy.json");
const backlogPath = path.join(repoRoot, "docs", "product-story-coverage-backlog.md");

for (const file of [storiesPath, catalogPath, policyPath]) {
  if (!fs.existsSync(file)) {
    console.error(`[story-coverage] Missing required file: ${path.relative(repoRoot, file)}`);
    process.exit(1);
  }
}

// Alias map mirrors src/wingman2/lib/skuAliasResolver.ts so a story keyed on the
// canonical SKU is correctly credited against its catalogue variants.
const ALIASES = [
  ["MXV-0808-H2A-MK2", ["MXV-0808-H2A", "MXV-0808-H2A-V3", "MXV-0808-H2A-MK2"]],
  ["MXV-0808-H2A-70-V3", ["MXV-0808-70-H2A", "MXV-0808-H2A-70", "MXV-0808-H2A-70-V3"]],
  ["MXV-0808-H2A-KIT", ["MXV-0808-H2A-KIT"]],
  ["MX-0808-KIT-V2", ["MX-0808-KIT", "MX-0808-KIT-V2"]],
  ["MX-0808-H2A-MK2", ["MX-0808-H2A", "MX-0808-H2A-MK2"]],
  ["MX-0808-SCL-V2", ["MX-0808-SCL", "MX-0808-SCL-V2"]],
  ["NHD-610-TX-V2", ["NHD-610-TX", "NHD-610-TX-V2"]],
  ["APO-VX20-UC-V2", ["APO-VX20-UC", "APO-VX20-UC-V2"]],
];
const nk = (v) => String(v ?? "").trim().toUpperCase().replace(/[^A-Z0-9]+/g, "");
const resolveAlias = (sku) => {
  const k = nk(sku);
  for (const [canon, al] of ALIASES) {
    if (nk(canon) === k || al.some((a) => nk(a) === k)) return canon;
  }
  return sku;
};
const canonKey = (v) => nk(resolveAlias(v));

const lifecycleBySku = new Map(readCsv("data-sources/wyrestorm/lifecycle.csv").map((row) => [nk(row.sku), row]));
const businessStatus = (sku) => {
  const exact = nk(sku);
  const k = lifecycleBySku.has(exact) ? exact : canonKey(sku);
  if (!k) return "unlisted";
  const status = lifecycleBySku.get(k)?.lifecycle_status;
  if (status === "do-not-spec") return "do-not-spec";
  if (["discontinued", "eol", "superseded", "archive"].includes(status)) return "discontinued";
  if (lifecycleBySku.get(k)?.business_status === "cable") return "cable";
  if (status === "active") return "active";
  return "unlisted";
};

const policyPayload = JSON.parse(fs.readFileSync(policyPath, "utf8").replace(/^\uFEFF/, ""));
if (policyPayload?.schemaVersion !== 1 || !Array.isArray(policyPayload?.dependencyOnly)) {
  throw new Error("Invalid product story coverage policy: expected schemaVersion 1 and dependencyOnly array.");
}

const allowedDependencyClassifications = new Set([
  "accessory",
  "cable",
  "dependency",
  "mount",
  "power-supply",
  "rack",
]);
const dependencyOnlyBySku = new Map();
for (const entry of policyPayload.dependencyOnly) {
  const sku = String(entry?.sku ?? "").trim().toUpperCase();
  const classification = String(entry?.classification ?? "").trim().toLowerCase();
  const reason = String(entry?.reason ?? "").trim();
  const key = canonKey(sku);
  if (!sku || !key || !allowedDependencyClassifications.has(classification) || !reason) {
    throw new Error(`Invalid dependency-only product story policy entry: ${JSON.stringify(entry)}`);
  }
  if (dependencyOnlyBySku.has(key)) {
    throw new Error(`Duplicate dependency-only product story policy entry: ${sku}`);
  }
  dependencyOnlyBySku.set(key, { sku, classification, reason });
}

const sourceHygieneExclusions = new Map([
  [canonKey("HALO-WFA-130"), "polluted generated record carrying FOCUS-100 webcam copy"],
  [canonKey("HALO-WFA-290"), "polluted generated record carrying FOCUS-100 webcam copy"],
  [canonKey("MV-0401-PRO"), "invalid WyreStorm SKU; correct multiview SKU is NHD-0401-MV"],
  [canonKey("MXV-0606-H2A-70"), "generated record describes receiver companion behaviour rather than a clean matrix story"],
  [canonKey("NHD-500-E"), "range or placeholder record; verify exact saleable SKU handling before storying"],
  [canonKey("SW-0X01-8K"), "range placeholder, not an exact lead story SKU"],
  [canonKey("SW-130-TX"), "polluted generated record carrying receiver/camera facts"],
]);
const storiesText = fs.readFileSync(storiesPath, "utf8");
const storyMatches = [...storiesText.matchAll(/\n\s*sku:\s*"([^"]+)",\s*\n\s*plainEnglishName:/g)].map((m) => m[1]);
const storyKeys = new Set(storyMatches.map(canonKey));
const groundedCount = (storiesText.match(/provenance:\s*"catalogue-grounded"/g) || []).length;
const reviewedCount = storyMatches.length - groundedCount;

const catalogPayload = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
const catalog = (Array.isArray(catalogPayload?.products) ? catalogPayload.products : [])
  .filter((entry) => entry?.doNotSpec !== true);

// Bucket every catalogue SKU by business status, de-duplicated on the canonical key.
const seen = new Set();
const buckets = {
  active: [],
  "active-uncovered": [],
  cable: [],
  "dependency-only": [],
  discontinued: [],
  "do-not-spec": [],
  unlisted: [],
  "source-hygiene": [],
};
for (const entry of catalog) {
  const raw = String(entry?.sku ?? "").trim();
  if (!raw) continue;
  const key = canonKey(raw);
  if (seen.has(key)) continue;
  seen.add(key);
  const status = businessStatus(raw);
  const dependencyOnly = dependencyOnlyBySku.get(key);
  const sourceHygieneReason = sourceHygieneExclusions.get(key);
  if (status === "active" && dependencyOnly?.classification === "cable") {
    buckets.cable.push(resolveAlias(raw));
  } else if (status === "active" && dependencyOnly) {
    buckets["dependency-only"].push({
      sku: resolveAlias(raw),
      classification: dependencyOnly.classification,
      reason: dependencyOnly.reason,
    });
  } else if (status === "active" && sourceHygieneReason) {
    buckets["source-hygiene"].push({ sku: resolveAlias(raw), reason: sourceHygieneReason });
  } else if (status === "active") {
    buckets.active.push(resolveAlias(raw));
    if (!storyKeys.has(key)) buckets["active-uncovered"].push(resolveAlias(raw));
  } else {
    buckets[status].push(resolveAlias(raw));
  }
}

const activeTotal = buckets.active.length;
const activeCovered = activeTotal - buckets["active-uncovered"].length;
const pct = activeTotal ? Math.round((activeCovered / activeTotal) * 100) : 0;

console.log(`[story-coverage] Governed stories: ${storyMatches.length} (reviewed ${reviewedCount}, catalogue-grounded ${groundedCount})`);
console.log(`[story-coverage] Active catalogue SKUs (alias-deduped): ${activeTotal}`);
console.log(`[story-coverage] Active covered: ${activeCovered} (${pct}%)  |  Active uncovered: ${buckets["active-uncovered"].length}`);
console.log(
  `[story-coverage] Excluded (not storied): cable ${buckets.cable.length}, dependency-only ${buckets["dependency-only"].length}, ` +
    `discontinued ${buckets.discontinued.length}, do-not-spec ${buckets["do-not-spec"].length}, ` +
    `unlisted ${buckets.unlisted.length}, source-hygiene ${buckets["source-hygiene"].length}`,
);
if (buckets["active-uncovered"].length) {
  console.log(`[story-coverage] Active backlog: ${buckets["active-uncovered"].sort().join(", ")}`);
}
if (buckets.unlisted.length) {
  console.log(`[story-coverage] Unlisted (confirm status before storying): ${buckets.unlisted.sort().join(", ")}`);
}
if (buckets["dependency-only"].length) {
  console.log(`[story-coverage] Dependency-only exclusions: ${buckets["dependency-only"].sort((a, b) => a.sku.localeCompare(b.sku)).map((entry) => `${entry.sku} (${entry.classification}: ${entry.reason})`).join(", ")}`);
}
if (buckets["source-hygiene"].length) {
  console.log(`[story-coverage] Source-hygiene exclusions: ${buckets["source-hygiene"].sort((a, b) => a.sku.localeCompare(b.sku)).map((entry) => `${entry.sku} (${entry.reason})`).join(", ")}`);
}

const lines = [];
lines.push("# Product story coverage backlog");
lines.push("");
lines.push("> Generated by `node tools/audit-product-story-coverage.mjs`. Do not edit by hand.");
lines.push("> Coverage is measured against active governed lifecycle rows only; SKUs are alias-resolved.");
lines.push("> Dependency-only exclusions remain available to catalogue, compatibility and BOM workflows.");
lines.push("");
lines.push(`- Governed stories: **${storyMatches.length}** (reviewed **${reviewedCount}**, catalogue-grounded **${groundedCount}**)`);
lines.push(`- Active catalogue SKUs (alias-deduped): **${activeTotal}**`);
lines.push(`- Active covered: **${activeCovered} (${pct}%)** · Active uncovered: **${buckets["active-uncovered"].length}**`);
lines.push(`- Excluded (deliberately not storied): cable **${buckets.cable.length}**, dependency-only **${buckets["dependency-only"].length}**, discontinued **${buckets.discontinued.length}**, do-not-spec **${buckets["do-not-spec"].length}**, unlisted **${buckets.unlisted.length}**, source-hygiene **${buckets["source-hygiene"].length}**`);
lines.push("");
lines.push("## Active SKUs still needing a governed story");
lines.push("");
lines.push(buckets["active-uncovered"].length
  ? buckets["active-uncovered"].sort().map((sku) => `- [ ] ${sku}`).join("\n")
  : "_None — every active lead SKU has a governed story._");
lines.push("");
lines.push("## Dependency-only exclusions");
lines.push("");
lines.push("These active catalogue records remain available for compatibility and BOM use but are excluded from lead-product story coverage.");
lines.push("");
lines.push(buckets["dependency-only"].length
  ? buckets["dependency-only"].sort((a, b) => a.sku.localeCompare(b.sku)).map((entry) => `- [ ] ${entry.sku} — ${entry.classification}: ${entry.reason}`).join("\n")
  : "_None._");
lines.push("");
lines.push("## Source-hygiene exclusions");
lines.push("");
lines.push("These active catalogue records are deliberately excluded from lead-story backlog until the source catalogue or lifecycle classification is corrected.");
lines.push("");
lines.push(buckets["source-hygiene"].length
  ? buckets["source-hygiene"].sort((a, b) => a.sku.localeCompare(b.sku)).map((entry) => `- [ ] ${entry.sku} — ${entry.reason}`).join("\n")
  : "_None._");
lines.push("");
lines.push("## Review-gated SKUs (not confirmed by the governed lifecycle import)");
lines.push("");
lines.push("Confirm whether these are active before authoring a story; the compare engine treats them as unresolved risk.");
lines.push("");
lines.push(buckets.unlisted.length
  ? buckets.unlisted.sort().map((sku) => `- [ ] ${sku}`).join("\n")
  : "_None._");
lines.push("");
lines.push("## Human-review backlog (catalogue-grounded stories)");
lines.push("");
lines.push(`${groundedCount} stories were generated from the official catalogue spec and adversarially verified, but still want a human spot-check against the current datasheet. Find them by searching \`provenance: "catalogue-grounded"\` in \`src/wingman2/data/productStories.ts\`.`);
lines.push("");

fs.mkdirSync(path.dirname(backlogPath), { recursive: true });
fs.writeFileSync(backlogPath, lines.join("\n"));
console.log(`[story-coverage] Backlog written to ${path.relative(repoRoot, backlogPath)}`);
