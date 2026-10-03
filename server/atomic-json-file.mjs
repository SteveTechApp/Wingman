import fs from "node:fs/promises";
import path from "node:path";

/**
 * Crash-atomic JSON file write: serialize to a temp file in the same
 * directory, then rename over the target. A plain writeFile truncates the
 * target first, so a crash (or an error) mid-write leaves the whole file
 * corrupted and every later reader either fails or silently falls back - for
 * user submissions that means data loss that looks like the write succeeded.
 * fs.rename is atomic on both POSIX and Windows (MoveFileEx with
 * MOVEFILE_REPLACE_EXISTING): a reader only ever sees the old file or the new
 * one, never a torn middle. On any failure the temp file is removed and the
 * error rethrown, so callers never believe a write landed when it did not.
 *
 * The write-path suites in wingman-app-store.mjs (which carried the original
 * inline copy of this function) and atomic-json-file.test.mjs pin the
 * crash-window semantics: a failure before the rename must leave the target
 * byte-identical, and no *.tmp litter survives success or failure.
 */
export async function writeJsonFileAtomic(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  try {
    await fs.writeFile(tmpPath, JSON.stringify(value, null, 2), "utf8");
    await fs.rename(tmpPath, filePath);
  } catch (error) {
    await fs.rm(tmpPath, { force: true }).catch(() => {});
    throw error;
  }
}
