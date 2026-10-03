/**
 * Crash-atomic JSON file writes for the tools/ toolchain.
 *
 * Every gate baseline and generated-data writer in tools/ previously used a
 * plain fs.writeFile/writeFileSync, which truncates the target first - a crash
 * (or an error) mid-write leaves the whole file corrupt, and the gate or app
 * that reads it back either fails or silently falls back. That is exactly the
 * torn-write hazard the server side eliminated with
 * server/atomic-json-file.mjs; these helpers bring the same guarantee to the
 * toolchain:
 *
 *   - serialize to a temp file in the SAME directory (same filesystem, so the
 *     rename is atomic),
 *   - fsync the temp file so the rename never promotes a partially-flushed
 *     buffer,
 *   - rename over the target (atomic on POSIX and Windows),
 *   - on any failure remove the temp file and rethrow, so a tool never
 *     believes a baseline landed when it did not.
 *
 * A reader only ever observes the old file or the new one, never a torn
 * middle. Both helpers write the canonical `JSON.stringify(value, null, 2)` +
 * trailing newline, matching what the hardened tools already produced.
 */

import fsSync from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";

function tempPathFor(filePath) {
  return path.join(
    path.dirname(filePath),
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}.${os.hostname()}.tmp`,
  );
}

/** Serialized bytes the tools write: pretty-printed with a trailing newline. */
export function serializeJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

/**
 * Synchronous crash-atomic write (for the sync gate tools). Creates the
 * parent directory, writes through a same-directory temp file, fsyncs, then
 * renames over the target. On failure the temp file is removed and the error
 * rethrown.
 */
export function atomicWriteJsonSync(filePath, value) {
  fsSync.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporary = tempPathFor(filePath);
  let descriptor;
  try {
    descriptor = fsSync.openSync(temporary, "wx", 0o600);
    fsSync.writeFileSync(descriptor, serializeJson(value), "utf8");
    fsSync.fsyncSync(descriptor);
    fsSync.closeSync(descriptor);
    descriptor = undefined;
    fsSync.renameSync(temporary, filePath);
  } finally {
    if (descriptor !== undefined) fsSync.closeSync(descriptor);
    if (fsSync.existsSync(temporary)) fsSync.unlinkSync(temporary);
  }
}

/**
 * Asynchronous crash-atomic write (for the async tools). Same contract as the
 * sync variant: temp file in the same directory, fsync, rename, cleanup on
 * failure.
 */
export async function atomicWriteJson(filePath, value) {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  const temporary = tempPathFor(filePath);
  try {
    await fsp.writeFile(temporary, serializeJson(value), "utf8");
    // Open read-write: on Windows, fsync on a read-only handle raises EPERM.
    const handle = await fsp.open(temporary, "r+");
    try {
      await handle.sync();
    } finally {
      await handle.close();
    }
    await fsp.rename(temporary, filePath);
  } catch (error) {
    await fsp.rm(temporary, { force: true }).catch(() => {});
    throw error;
  }
}