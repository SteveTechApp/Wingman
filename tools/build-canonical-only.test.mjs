import { createHash } from "node:crypto";
import { runTool } from "./test-spawn-guard.mjs";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

function runCommand(command, args, options) {
  return runTool(command, args, "build-canonical-only", options);
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
