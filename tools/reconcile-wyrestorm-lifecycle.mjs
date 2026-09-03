import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { readCsv } from "./product-update-utils.mjs";
import { successorAcceptabilityProblem } from "./check-lifecycle-successor-refs.mjs";

/**
 * WyreStorm product lifecycle reconciliation.
 *
 * The mechanism that keeps product information honest as the catalogue changes.
 * It diffs the authoritative lifecycle/product CSVs against what the app actually
 * ships - the product-intelligence index and the governed sales stories - and
 * reports the drift that a human needs to act on:
 *
 *   BLOCKED   indexed products that are discontinued or do-not-spec
 *   ADD       active products missing from the index
 *   REVIEW    indexed products not on any business list (stale / unknown)
 *   SUPERSEDED version families where a discontinued SKU has an active successor
 *   REFUSED   version-family promotions whose successor is not active - these are
 *             NOT surfaced as promotion candidates (a pair promoted into
 *             WYRESTORM_SUPERSESSIONS must name a current, quotable product, the
 *             same active-successor rule the runtime supersession table enforces)
 *   STORIES   governed stories that lead with, or recommend, a non-active SKU
 *
 * Run: node tools/reconcile-wyrestorm-lifecycle.mjs   (npm run lifecycle:reconcile)
 * Writes docs/wyrestorm-lifecycle-reconciliation.md and prints a summary.
 *
 * Refresh cadence: import current WyreStorm business lists with
 * `npm run product-update:import-lifecycle`, review the source diff, then run this.
 * It does not edit data.
 */

const repoRoot = process.cwd();
const indexPath = path.join(repoRoot, "public", "product-intelligence-index.json");
const storiesPath = path.join(repoRoot, "src", "wingman2", "data", "productStories.ts");
const reportPath = path.join(repoRoot, "docs", "wyrestorm-lifecycle-reconciliation.md");

const normKey = (value) => String(value ?? "").toUpperCase().replace(/[^A-Z0-9]+/g, "");

const lifecycleRows = readCsv("data-sources/wyrestorm/lifecycle.csv");
const lifecycleByKey = new Map(lifecycleRows.map((row) => [normKey(row.sku), row]));

const statusOf = (sku) => {
  const key = normKey(sku);
  const status = String(lifecycleByKey.get(key)?.lifecycle_status ?? "").toLowerCase();
  if (status === "do-not-spec") return "do-not-spec";
  if (["discontinued", "eol", "superseded", "archive"].includes(status)) return "discontinued";
  if (lifecycleByKey.get(key)?.business_status === "cable") return "cable";
  if (status === "active") return "active";
  return "unlisted";
};
const skusWithStatus = (status) => lifecycleRows.map((row) => row.sku).filter((sku) => statusOf(sku) === status);
const active = { skus: skusWithStatus("active"), keys: new Set(skusWithStatus("active").map(normKey)) };
const discontinued = { skus: skusWithStatus("discontinued") };
const doNotSpec = { skus: skusWithStatus("do-not-spec") };
const cable = { skus: skusWithStatus("cable") };

// --- Product index --------------------------------------------------------
const index = JSON.parse(readFileSync(indexPath, "utf8"));
const indexProducts = Array.isArray(index) ? index : index.products ?? [];
const indexedSkus = indexProducts.map((p) => String(p?.sku ?? "")).filter(Boolean);
const indexedKeys = new Set(indexedSkus.map(normKey));

// --- Governed stories -----------------------------------------------------
const storiesText = readFileSync(storiesPath, "utf8");
const storySkus = [...storiesText.matchAll(/\n\s*sku:\s*"([^"]+)",\s*\n\s*plainEnglishName:/g)].map((m) => m[1]);
const storyWorksWith = [...storiesText.matchAll(/\{\s*sku:\s*"([^"]+)",\s*reason:/g)].map((m) => m[1]);

// --- Reconciliation -------------------------------------------------------
const archive = indexedSkus.filter((sku) => ["discontinued", "do-not-spec"].includes(statusOf(sku)));
const add = active.skus.filter((sku) => !indexedKeys.has(normKey(sku)));
const review = indexedSkus.filter((sku) => statusOf(sku) === "unlisted");

// Version families: strip trailing version tokens to a base, group active+discon.
const baseKey = (sku) =>
  normKey(
    String(sku)
      .split(/[-\s]+/)
      .filter((token) => !/^(V\d+|MK\d+)$/i.test(token))
      .join("-"),
  );

/**
 * Splits every version family that contains both a discontinued and an active
 * member into source→successor promotion pairs, then applies the shared
 * active-successor rule to each pair. Returns the pairs that MAY be promoted
 * into WYRESTORM_SUPERSESSIONS and the ones that must be REFUSED (with the
 * rule's reason). Exported for the test suite; the runner uses the result to
 * render the SUPERSEDED / REFUSED report sections.
 */
export function classifyVersionFamilyPromotions(rows, familyMembers) {
  const rowBySku = new Map(rows.map((row) => [normKey(row.sku), row]));
  const families = new Map();
  for (const { sku, status } of familyMembers) {
    const base = baseKey(sku);
    if (!families.has(base)) families.set(base, []);
    families.get(base).push({ sku, status });
  }
  const inferredPairs = [...families.values()]
    .filter(
    (members) =>
      members.length > 1 &&
      members.some((m) => m.status === "discontinued") &&
      members.some((m) => m.status === "active"),
    )
    .flatMap((members) => {
    const dead = members.filter((m) => m.status === "discontinued");
    const live = members.filter((m) => m.status === "active");
    return dead.flatMap((d) => live.map((l) => ({ sourceSku: d.sku, successorSku: l.sku })));
    });
  const explicitPairs = familyMembers.flatMap(({ sku, status }) => {
    if (status !== "discontinued") return [];
    const successorSku = String(rowBySku.get(normKey(sku))?.successor ?? "").trim();
    return successorSku ? [{ sourceSku: sku, successorSku }] : [];
  });
  const pairs = [...new Map(
    [...explicitPairs, ...inferredPairs].map((pair) => [
      `${normKey(pair.sourceSku)}>${normKey(pair.successorSku)}`,
      pair,
    ]),
  ).values()];

  const acceptable = [];
  const refused = [];
  for (const pair of pairs) {
    const problem = successorAcceptabilityProblem(rows, pair.sourceSku, pair.successorSku);
    if (problem) refused.push({ ...pair, reason: problem });
    else acceptable.push(pair);
  }
  return { acceptable, refused };
}

const families = new Map();
for (const sku of [...active.skus, ...discontinued.skus]) {
  const base = baseKey(sku);
  if (!families.has(base)) families.set(base, []);
  families.get(base).push({ sku, status: statusOf(sku) });
}
const { acceptable: acceptablePairs, refused: refusedPairs } = classifyVersionFamilyPromotions(
  lifecycleRows,
  [...families.values()].flat(),
);
const superseded = acceptablePairs;

// Stories that lead with or recommend a non-active SKU.
const storyIssues = [];
for (const sku of storySkus) {
  const status = statusOf(sku);
  if (status !== "active") storyIssues.push({ sku, where: "story lead", status });
}
for (const sku of [...new Set(storyWorksWith)]) {
  const status = statusOf(sku);
  if (status !== "active") storyIssues.push({ sku, where: "worksWith", status });
}

// --- Report ---------------------------------------------------------------
const lines = [];
lines.push("# WyreStorm lifecycle reconciliation");
lines.push("");
lines.push("> Generated by `npm run lifecycle:reconcile`. Do not edit by hand.");
lines.push("");
lines.push(`- Governed lifecycle source: active ${active.skus.length}, discontinued ${discontinued.skus.length}, do-not-spec ${doNotSpec.skus.length}, cable ${cable.skus.length}, review ${review.length}`);
lines.push(`- Indexed products: ${indexedSkus.length} · Governed stories: ${storySkus.length}`);
lines.push("");

const section = (title, body) => {
  lines.push(`## ${title}`);
  lines.push("");
  lines.push(body.length ? body : "_None._");
  lines.push("");
};

section(
  `BLOCKED — retained for history, excluded from recommendations (${archive.length})`,
  archive.sort().map((sku) => `- [ ] ${sku} (${statusOf(sku)})`).join("\n"),
);
section(
  `ADD — active products missing from the index (${add.length})`,
  add.sort().map((sku) => `- [ ] ${sku}`).join("\n"),
);
section(
  `REVIEW — indexed but on no business list (${review.length})`,
  review.sort().map((sku) => `- [ ] ${sku}`).join("\n"),
);
section(
  `SUPERSEDED — version families with a discontinued SKU and an active successor (${superseded.length})`,
  superseded.map((pair) => `- ${pair.sourceSku} → **${pair.successorSku}**`).join("\n"),
);
section(
  `REFUSED — version-family promotions whose successor is not active (${refusedPairs.length})`,
  refusedPairs
    .map(
      (pair) =>
        `- ${pair.sourceSku} → ${pair.successorSku} — ${pair.reason.replace(/^lifecycle: /, "")}`,
    )
    .join("\n"),
);
section(
  `STORIES — governed stories referencing a non-active SKU (${storyIssues.length})`,
  storyIssues
    .sort((a, b) => a.sku.localeCompare(b.sku))
    .map((issue) => `- ${issue.sku} — ${issue.where} — \`${issue.status}\``)
    .join("\n"),
);

if (!existsSync(path.dirname(reportPath))) mkdirSync(path.dirname(reportPath), { recursive: true });
writeFileSync(reportPath, lines.join("\n"));

console.log("[lifecycle] WyreStorm lifecycle reconciliation");
console.log(`[lifecycle]   BLOCKED (indexed & EoL/do-not-spec): ${archive.length}`);
console.log(`[lifecycle]   ADD (active & not indexed):          ${add.length}`);
console.log(`[lifecycle]   REVIEW (indexed & unlisted):         ${review.length}`);
console.log(`[lifecycle]   SUPERSEDED (version families):       ${superseded.length}`);
console.log(`[lifecycle]   REFUSED (successor not active):       ${refusedPairs.length}`);
console.log(`[lifecycle]   STORIES (referencing non-active):    ${storyIssues.length}`);
console.log(`[lifecycle] Report written to ${path.relative(repoRoot, reportPath)}`);
