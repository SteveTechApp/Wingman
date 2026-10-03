// Fixture child for wingman-app-store.crash-atomicity.test.mjs.
//
// The parent kills this process while it is mid-way through writing the LARGE
// snapshot, then asserts the file-mode store recovers to either the old or the
// new snapshot - never a truncated file. The write size is what makes the kill
// land inside the write: ~65 MB of pretty-printed JSON takes long enough to
// observe while it is still being written.
//
// Modes:
//   atomic  - write through the store's real file-mode path (writeDb ->
//             writeJsonFile's temp+rename). A kill anywhere before the rename
//             must leave the OLD snapshot intact.
//   plain   - control mode: write the large snapshot with a plain fs.writeFile
//             straight to the target (the legacy behaviour). A mid-write kill
//             must leave a truncated file - proving the harness would catch a
//             regression back to non-atomic writes.
//
// Protocol (stdout lines): "WROTE_A", then "WRITING_BIG", then "WROTE_B".

process.env.WINGMAN_DATA_DIR = process.argv[2];
process.env.WINGMAN_STORAGE_MODE = "file";
const mode = process.argv[3] || "atomic";

// Dynamic imports only AFTER the env is set: catalog/files.mjs resolves
// WINGMAN_APP_DB_FILE from WINGMAN_DATA_DIR at import time.
const [{ WINGMAN_APP_DB_FILE }, store] = await Promise.all([
  import("../catalog/files.mjs"),
  import("../wingman-app-store.mjs"),
]);
const fs = await import("node:fs/promises");

// Must stay in lockstep with the constants in the crash-atomicity test.
const ROWS = 240_000;
const ROW_TEXT = "x".repeat(220);

function buildBigDb() {
  return {
    version: 1,
    smallContent: "A",
    bigContent: {
      label: "B",
      rows: Array.from({ length: ROWS }, (_, i) => ({ id: `row-${i}`, text: ROW_TEXT })),
    },
  };
}

await store.__writeFileModeDbForCrashTest({ version: 1, smallContent: "A", users: {} });
console.log("WROTE_A");

const big = buildBigDb();
console.log("WRITING_BIG");
if (mode === "plain") {
  await fs.writeFile(WINGMAN_APP_DB_FILE, JSON.stringify(big, null, 2), "utf8");
} else {
  await store.__writeFileModeDbForCrashTest(big);
}
console.log("WROTE_B");
