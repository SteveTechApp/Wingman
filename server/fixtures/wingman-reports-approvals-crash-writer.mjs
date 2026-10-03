// Fixture child for competitor-lookup.crash-atomicity.test.mjs.
//
// The parent kills this process while it is mid-way through writing a LARGE
// dataset, then asserts the file recovers to either the old or the new state -
// never a truncated file. The write size is what makes the kill land inside
// the write: ~55 MB of pretty-printed JSON takes long enough to observe while
// it is still being written.
//
// The dataset is written through the SAME shared helper the two real writers
// in competitor-lookup-server.mjs use (writeJsonFileAtomic from
// atomic-json-file.mjs) to the SAME file paths (WINGMAN_PRODUCT_REPORTS_FILE /
// COMPETITOR_APPROVALS_FILE under WINGMAN_DATA_DIR), so a kill anywhere before
// the rename must leave the previous file intact.
//
// Modes:
//   reports  - atomic write to wingman-product-reports.json
//   approvals- atomic write to competitor-approvals.json
//   plain-reports / plain-approvals - control: the same large dataset with a
//             plain fs.writeFile straight to the target (the legacy
//             behaviour). A mid-write kill must leave a truncated file -
//             proving the harness would catch a regression away from the
//             atomic helper.
//
// Protocol (stdout lines): "WROTE_A", then "WRITING_BIG", then "WROTE_B".

process.env.WINGMAN_DATA_DIR = process.argv[2];
const mode = process.argv[3] || "reports";

// Dynamic imports only AFTER the env is set: catalog/files.mjs resolves
// WINGMAN_PRODUCT_REPORTS_FILE / COMPETITOR_APPROVALS_FILE from
// WINGMAN_DATA_DIR at import time.
const [{ WINGMAN_PRODUCT_REPORTS_FILE, COMPETITOR_APPROVALS_FILE }, { writeJsonFileAtomic }] =
  await Promise.all([import("../catalog/files.mjs"), import("../atomic-json-file.mjs")]);
const fs = await import("node:fs/promises");
const path = await import("node:path");

// Must stay in lockstep with the constants in the crash-atomicity test.
const ROWS = 240_000;
const ROW_TEXT = "x".repeat(220);

function bigRecords(kind) {
  if (kind === "approvals") {
    return Array.from({ length: ROWS }, (_, i) => ({
      id: `approval-${i}`,
      sku: "MX-44-4K",
      status: i % 2 === 0 ? "approved" : "pending",
      note: ROW_TEXT,
    }));
  }
  return Array.from({ length: ROWS }, (_, i) => ({
    id: `report-${i}`,
    sku: "MX-44-4K",
    problem: ROW_TEXT,
    status: "new",
  }));
}

const targetFile =
  mode === "approvals" || mode === "plain-approvals"
    ? COMPETITOR_APPROVALS_FILE
    : WINGMAN_PRODUCT_REPORTS_FILE;
const kind = mode === "approvals" || mode === "plain-approvals" ? "approvals" : "reports";

const big = bigRecords(kind);

// Seed "A": the pre-existing file the writers would read before appending.
await writeJsonFileAtomic(targetFile, [{ id: "seed", marker: "A" }]);
console.log("WROTE_A");

console.log("WRITING_BIG");
if (mode === "plain-reports" || mode === "plain-approvals") {
  await fs.mkdir(path.dirname(targetFile), { recursive: true });
  await fs.writeFile(targetFile, JSON.stringify(big, null, 2), "utf8");
} else {
  await writeJsonFileAtomic(targetFile, big);
}
console.log("WROTE_B");
