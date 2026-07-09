import fs from "node:fs";
import path from "node:path";

const distAssets = path.join(process.cwd(), "dist", "assets");

const reviewKb = Number(process.env.WM_CHUNK_REVIEW_KB ?? 500);
const failKb = Number(process.env.WM_CHUNK_FAIL_KB ?? 850);

const ignoredLargeAssets = [
  /^pdf\.worker-.*\.mjs$/,
];

if (!fs.existsSync(distAssets)) {
  console.error("[chunk-budget] dist/assets does not exist. Run npm run build first.");
  process.exit(1);
}

const rows = fs
  .readdirSync(distAssets)
  .filter((file) => /\.(js|mjs)$/.test(file))
  .map((file) => {
    const fullPath = path.join(distAssets, file);
    const sizeKb = fs.statSync(fullPath).size / 1024;
    const ignored = ignoredLargeAssets.some((pattern) => pattern.test(file));

    return {
      file,
      sizeKb,
      ignored,
    };
  })
  .sort((first, second) => second.sizeKb - first.sizeKb);

const reviewRows = rows.filter((row) => row.sizeKb >= reviewKb);
const failingRows = rows.filter((row) => !row.ignored && row.sizeKb >= failKb);

console.log(`[chunk-budget] Review threshold: ${reviewKb} kB`);
console.log(`[chunk-budget] Fail threshold:   ${failKb} kB`);

if (reviewRows.length) {
  console.log("");
  console.log("[chunk-budget] Chunks/assets above review threshold:");
  for (const row of reviewRows) {
    const label = row.ignored ? "ignored-known-large" : "review";
    console.log(`- ${row.file} ${row.sizeKb.toFixed(2)} kB ${label}`);
  }
} else {
  console.log("[chunk-budget] No chunks above review threshold.");
}

if (failingRows.length) {
  console.error("");
  console.error("[chunk-budget] Failing chunks above budget:");
  for (const row of failingRows) {
    console.error(`- ${row.file} ${row.sizeKb.toFixed(2)} kB`);
  }
  process.exit(1);
}

console.log("");
console.log("[chunk-budget] Chunk budget passed.");