import fs from "node:fs";
import path from "node:path";

/**
 * Product story coverage audit.
 *
 * Governed product stories (src/wingman2/data/productStories.ts) are the
 * high-confidence sales copy a rep can quote directly. Everything else falls back
 * to auto-generated positioning that the UI flags "verify before quoting".
 *
 * Coverage is measured against the 2026 business lists, not the raw catalogue:
 * only ACTIVE SKUs need a story. Cable, discontinued and do-not-spec SKUs are
 * deliberately excluded (the productStoriesLifecycle test forbids storying them),
 * and unlisted SKUs are surfaced for review rather than auto-storied. SKUs are
 * alias-resolved so a story on the canonical SKU covers its variants.
 *
 * It also reports provenance: "catalogue-grounded" stories were generated from the
 * official catalogue spec and adversarially verified, but still want a human
 * spot-check, so they are listed as the human-review backlog.
 *
 * Run: node tools/audit-product-story-coverage.mjs
 */

const repoRoot = process.cwd();
const storiesPath = path.join(repoRoot, "src", "wingman2", "data", "productStories.ts");
const catalogPath = path.join(repoRoot, "data", "catalog", "wyrestormSkuCatalog.2026.json");
const backlogPath = path.join(repoRoot, "docs", "product-story-coverage-backlog.md");

const businessLists = {
  active: "WyreStorm Active SKU 2026.txt",
  cable: "Wyrestorm Cables 2026.txt",
  discontinued: "WyreStorm Discon Products 2026.txt",
  "do-not-spec": "Wyrestorm Do Not Spec List 2026.txt",
};

for (const file of [storiesPath, catalogPath]) {
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

const readList = (file) => {
  const full = path.join(repoRoot, file);
  if (!fs.existsSync(full)) return new Set();
  return new Set(
    fs.readFileSync(full, "utf8").split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map(canonKey),
  );
};
const statusKeys = Object.fromEntries(Object.entries(businessLists).map(([k, f]) => [k, readList(f)]));
const businessStatus = (sku) => {
  const k = canonKey(sku);
  if (!k) return "unlisted";
  if (statusKeys.active.has(k)) return "active";
  if (statusKeys.discontinued.has(k)) return "discontinued";
  if (statusKeys["do-not-spec"].has(k)) return "do-not-spec";
  if (statusKeys.cable.has(k)) return "cable";
  return "unlisted";
};

const storiesText = fs.readFileSync(storiesPath, "utf8");
const storyMatches = [...storiesText.matchAll(/\n\s*sku:\s*"([^"]+)",\s*\n\s*plainEnglishName:/g)].map((m) => m[1]);
const storyKeys = new Set(storyMatches.map(canonKey));
const groundedCount = (storiesText.match(/provenance:\s*"catalogue-grounded"/g) || []).length;
const reviewedCount = storyMatches.length - groundedCount;

const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));

// Bucket every catalogue SKU by business status, de-duplicated on the canonical key.
const seen = new Set();
const buckets = { active: [], "active-uncovered": [], cable: [], discontinued: [], "do-not-spec": [], unlisted: [] };
for (const entry of catalog) {
  const raw = String(entry?.sku ?? "").trim();
  if (!raw) continue;
  const key = canonKey(raw);
  if (seen.has(key)) continue;
  seen.add(key);
  const status = businessStatus(raw);
  if (status === "active") {
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
  `[story-coverage] Excluded (not storied): cable ${buckets.cable.length}, discontinued ${buckets.discontinued.length}, ` +
    `do-not-spec ${buckets["do-not-spec"].length}, unlisted ${buckets.unlisted.length}`,
);
if (buckets["active-uncovered"].length) {
  console.log(`[story-coverage] Active backlog: ${buckets["active-uncovered"].sort().join(", ")}`);
}
if (buckets.unlisted.length) {
  console.log(`[story-coverage] Unlisted (confirm status before storying): ${buckets.unlisted.sort().join(", ")}`);
}

const lines = [];
lines.push("# Product story coverage backlog");
lines.push("");
lines.push("> Generated by `node tools/audit-product-story-coverage.mjs`. Do not edit by hand.");
lines.push("> Coverage is measured against ACTIVE 2026 SKUs only; SKUs are alias-resolved.");
lines.push("");
lines.push(`- Governed stories: **${storyMatches.length}** (reviewed **${reviewedCount}**, catalogue-grounded **${groundedCount}**)`);
lines.push(`- Active catalogue SKUs (alias-deduped): **${activeTotal}**`);
lines.push(`- Active covered: **${activeCovered} (${pct}%)** · Active uncovered: **${buckets["active-uncovered"].length}**`);
lines.push(`- Excluded (deliberately not storied): cable **${buckets.cable.length}**, discontinued **${buckets.discontinued.length}**, do-not-spec **${buckets["do-not-spec"].length}**, unlisted **${buckets.unlisted.length}**`);
lines.push("");
lines.push("## Active SKUs still needing a governed story");
lines.push("");
lines.push(buckets["active-uncovered"].length
  ? buckets["active-uncovered"].sort().map((sku) => `- [ ] ${sku}`).join("\n")
  : "_None — every active SKU has a governed story._");
lines.push("");
lines.push("## Unlisted SKUs (in the catalogue but on no 2026 business list)");
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
