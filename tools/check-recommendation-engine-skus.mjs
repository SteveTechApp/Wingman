/**
 * Pins every product SKU emitted by the discovery→recommendations engine
 * (template BOMs and auto-bundled kits) to a current, orderable WyreStorm
 * product.
 *
 * Scans `sku: "…"` literals in the engine's BOM-generating files and fails on:
 *  - a SKU missing from lifecycle.csv entirely (dangling reference), or
 *  - a SKU whose lifecycle business status is not active/cable (dead unit:
 *    discontinued, do-not-spec, or review-placeholder).
 *
 * Abstract action-item tokens (cable/network/switch/speaker confirmations,
 * TBC-* dependencies, CUSTOM-/BY-OTHERS- scope rows, TEMPLATE-SCOPE) are
 * deliberate non-product rows — the rep confirms them at quoting time — and
 * are allowed via ALLOWED_TOKENS.
 *
 * Competitor reference tables (knownCompareProfiles etc.) are intentionally
 * NOT scanned: their keys are third-party models, not WyreStorm SKUs.
 *
 * Usage: node tools/check-recommendation-engine-skus.mjs [extra files…]
 * Wired into `check:data-sources` (part of verify:data / CI).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

const ENGINE_FILES = [
  "src/wingman2/lib/roomTemplates.ts",
  "src/wingman2/lib/roomTemplatesExtra.ts",
  "src/wingman2/lib/customRoomTemplates.ts",
  "src/wingman2/lib/suggestedKit.ts",
  "src/wingman2/lib/systemBundler.ts",
  "src/wingman2/lib/systemDependencies.ts",
];

// Non-product rows in recommended BOMs: the rep confirms scope/cables/network
// at quoting time. These deliberately are NOT orderable SKUs.
const ALLOWED_TOKENS = [
  /^(BY-OTHERS|CUSTOM)(-[A-Z0-9-]*)?$/i,
  /^CABLE-INFRA$/i,
  /^NETWORK-INFRA$/i,
  /^SWITCH-AV$/i,
  /^SPEAKER-REQ$/i,
  /^SPEAKERS$/i,
  /^RECEIVERS$/i,
  /^TEMPLATE-SCOPE$/i,
  /^TBC-[A-Z0-9-]+$/i,
];

function loadLifecycle() {
  const text = fs.readFileSync(path.join(projectRoot, "data-sources/wyrestorm/lifecycle.csv"), "utf8");
  const rows = text.trim().split(/\r?\n/).map((line) => line.split(","));
  const header = rows[0];
  const skuIdx = header.findIndex((h) => /sku/i.test(h));
  const statusIdx = header.findIndex((h, i) => i > 0 && /^business/.test(h) && /status/i.test(h));
  const lifecycle = {};
  for (const row of rows.slice(1)) {
    const sku = (row[skuIdx] || "").trim().toUpperCase();
    if (sku) lifecycle[sku] = (row[statusIdx] || "active").trim().toLowerCase();
  }
  return lifecycle;
}

function isAllowedToken(sku) {
  return ALLOWED_TOKENS.some((re) => re.test(sku));
}

function scanFile(filePath, lifecycle, failures) {
  const abs = path.resolve(projectRoot, filePath);
  if (!fs.existsSync(abs)) {
    failures.push({ file: filePath, line: 0, sku: "(file missing)", status: "missing-file" });
    return;
  }
  const lines = fs.readFileSync(abs, "utf8").split(/\r?\n/);
  const skuRe = /sku\s*:\s*"([^"]+)"/g;
  lines.forEach((line, index) => {
    let match;
    skuRe.lastIndex = 0;
    while ((match = skuRe.exec(line)) !== null) {
      const raw = match[1].trim();
      if (!raw) continue;
      const sku = raw.toUpperCase();
      if (isAllowedToken(sku)) continue;
      if (!/^[A-Z][A-Z0-9-]{2,}$/.test(sku)) continue; // not a SKU-shaped literal
      const status = lifecycle[sku];
      if (!status) {
        failures.push({ file: filePath, line: index + 1, sku: raw, status: "missing from lifecycle" });
      } else if (status !== "active" && status !== "cable") {
        failures.push({ file: filePath, line: index + 1, sku: raw, status: `lifecycle=${status}` });
      }
    }
  });
}

function main() {
  const lifecycle = loadLifecycle();
  const failures = [];
  const files = [...ENGINE_FILES, ...process.argv.slice(2)];
  for (const file of files) scanFile(file, lifecycle, failures);

  if (failures.length) {
    console.error("[check-recommendation-engine-skus] engine emits non-orderable SKUs:");
    for (const failure of failures) {
      console.error(`  ${failure.file}:${failure.line}  sku "${failure.sku}" — ${failure.status}`);
    }
    process.exit(1);
  }

  const skuCount = Object.keys(lifecycle).length;
  console.log(`[check-recommendation-engine-skus] OK — every engine BOM/kit SKU resolves to an active/cable lifecycle entry (${ENGINE_FILES.length} files, ${skuCount} lifecycle SKUs).`);
}

main();