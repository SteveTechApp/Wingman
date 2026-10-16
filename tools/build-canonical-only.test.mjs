import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

// Under the pre-commit suite's full parallel load, spawning child processes can
// fail transiently at the libuv level (resource pressure reported through errno
// codes) even though the command itself is fine. A retried spawn is safe here:
// the generator is deterministic and the fingerprints below assert its output,
// so the retry cannot hide a real regression. What must never be retried is a
// child that actually ran and exited nonzero, or a fingerprint mismatch - those
// are genuine gate signals.
const TRANSIENT_SPAWN_CODES = new Set(["EAGAIN", "EMFILE", "ENFILE", "ENOMEM", "EIO", "ENOENT"]);

function runCommandOnce(command, args, options) {
  return execFileSync(command, args, { maxBuffer: 16 * 1024 * 1024, ...options });
}

function runCommand(command, args, options) {
  try {
    return runCommandOnce(command, args, options);
  } catch (error) {
    // execFileSync surfaces a nonzero child exit through a numeric error.code
    // (or signal name) and leaves the child's output in `error.stdout/stderr`;
    // only libuv-level spawn failures carry a bare errno string. Retry those
    // exactly once and log loudly, so a real failure is never retried away.
    const transient = typeof error.code === "string" && TRANSIENT_SPAWN_CODES.has(error.code) && !error.code.startsWith("SIG");
    if (!transient) {
      throw error;
    }
    console.warn(`[build-canonical-only] transient spawn failure (${error.code}); retrying once: ${command} ${args.join(" ")}`);
    return runCommandOnce(command, args, options);
  }
}

it("generates the test catalogue without rewriting tracked evidence or manifests", () => {
  const files = runCommand("git", ["ls-files", "-z", "data-sources", "data/catalog", "data/governance"], { encoding: "utf8" })
    .split("\0").filter(Boolean);
  const fingerprints = () => files.map((file) => createHash("sha256").update(readFileSync(file)).digest("hex"));
  const before = fingerprints();
  runCommand(process.execPath, ["tools/build-product-data-sources.mjs", "--canonical-only"], { stdio: "pipe" });
  const after = fingerprints();
  const rewritten = files.filter((file, index) => before[index] !== after[index]);
  // Fail with the offending paths up front instead of a wall of hex digests:
  // the generator must never rewrite tracked evidence or manifests, so any
  // mismatch is one diagnostic read away from the cause.
  if (rewritten.length !== 0) {
    throw new Error(`--canonical-only rewrote tracked artefacts: ${rewritten.join(", ")}`);
  }
  expect(after).toEqual(before);
  const store = JSON.parse(readFileSync("data/wingman-canonical-product-store.json", "utf8"));
  expect(store.products.length).toBeGreaterThan(250);
});
